import "dotenv/config";
import fs from "fs";
import path from "path";
import readline from "readline";
import { Octokit } from "@octokit/rest";
import { execSync, exec } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { Client as NotionClient } from "@notionhq/client";

/**
 * =========================
 * CONFIG
 * =========================
 *
 * Central configuration for:
 * - local LLM connection
 * - feature toggles
 * - project root
 * - integration clients
 *
 * You should mainly edit values in .env, not this file.
 */
const PROVIDERS = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile"
    // model: "qwen/qwen3-32b"
  },
  // {
  //   name: "openrouter",
  //   url: "https://openrouter.ai/api/v1/chat/completions",
  //   apiKey: process.env.OPENROUTER_API_KEY,
  //   model: "deepseek/deepseek-coder"
  // },
  // {
  //   name: "together",
  //   url: "https://api.together.xyz/v1/chat/completions",
  //   apiKey: process.env.TOGETHER_API_KEY,
  //   model: "mistralai/Mixtral-8x7B-Instruct-v0.1"
  // },
  {
    name: "local",
    url: process.env.LMSTUDIO_API,
    apiKey: null,
    model: process.env.LMSTUDIO_MODEL
  }
];
// // Local LM Studio OpenAI-compatible endpoint
// const API =
//   process.env.LMSTUDIO_API || "http://127.0.0.1:1234/v1/chat/completions";

// // Local model name loaded in LM Studio
// const MODEL =
//   process.env.LMSTUDIO_MODEL || "qwen2.5-coder-3b-instruct";

// Toggle integrations on/off safely
const ENABLE_GITHUB = false;
const ENABLE_SUPABASE = false;
const ENABLE_NOTION = false;
const ENABLE_ENGRAM = true;

// Project root = one level above ai-agent/
const PROJECT_ROOT = path.resolve("..");

// Safety limit to avoid infinite agent loops
const MAX_ITERATIONS = 20;

/**
 * =========================
 * CLIENTS
 * =========================
 *
 * These clients let the agent talk to external services.
 * They only work if the proper values exist in .env.
 */

// GitHub client (push files to repo)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Supabase client (store logs / metadata / state)
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

// Notion client (store activity log / project notes)
const notion = process.env.NOTION_KEY
  ? new NotionClient({ auth: process.env.NOTION_KEY })
  : null;

/**
 * =========================
 * FILE HELPERS
 * =========================
 *
 * Utility helpers to read/write/check files relative
 * to the project root. This avoids path confusion.
 */

function readTextFile(relativePath) {
  return fs.readFileSync(path.resolve(PROJECT_ROOT, relativePath), "utf-8");
}

function fileExists(relativePath) {
  return fs.existsSync(path.resolve(PROJECT_ROOT, relativePath));
}

/**
 * =========================
 * USER INPUT (CLI)
 * =========================
 *
 * Waits for user confirmation before continuing.
 *
 * Used for:
 * - plan approval ("OK")
 */
function waitForUserApproval() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nType "OK" to continue or anything else to cancel: ', (answer) => {
      rl.close();

      if (answer.trim().toUpperCase() === "OK") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * =========================
 * BASIC ERROR DETECTOR
 * =========================
 *
 * This is a lightweight safety check before writing code.
 *
 * Purpose:
 * - catch obviously bad outputs from the LLM
 * - trigger auto-fix before saving broken code
 *
 * Current checks are simple on purpose.
 * Later, this can be upgraded to:
 * - compile checks
 * - syntax validation
 * - test execution
 */
function hasBasicError(content) {
  if (!content || !content.trim()) {
    return true;
  }

  if (content.includes("undefined")) return true;
  if (content.includes("TODO")) return true;
  if (content.includes("lorem ipsum")) return true;

  return false;
}

/**
 * =========================
 * ERROR RECOVERY / AUTO-FIX
 * =========================
 *
 * When the generated code looks broken,
 * this function asks the LLM to repair it.
 *
 * Purpose:
 * - make the agent self-correct
 * - avoid saving obviously bad code
 *
 * Input:
 * - filePath: file being fixed
 * - errorMessage: short reason why fix is needed
 * - content: current broken/suspicious code
 *
 * Output:
 * - parsed JSON object in the same format as the agent uses
 */
async function fixCode(filePath, errorMessage, content) {
  const prompt = `
Fix this code.

ERROR:
${errorMessage}

FILE:
${filePath}

CODE:
${content}

Rules:
- return only fixed code
- keep the same file path
- do not explain anything
- preserve project conventions

Return ONLY JSON:
{
  "action": "code",
  "files": [
    {
      "file": "${filePath}",
      "content": "fixed code here"
    }
  ]
}
`;

  const reply = await askLLM([
    {
      role: "system",
      content: `
You are a senior software engineer specialized in debugging and code repair.
Return ONLY valid JSON.
`
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  return parseLLMResponse(reply);
}

/**
 * =========================
 * TEST GENERATOR
 * =========================
 *
 * After the agent creates a file,
 * this function asks the LLM to generate a related test file.
 *
 * Purpose:
 * - make the agent produce tests automatically
 * - encourage test-driven / safer development
 *
 * Notes:
 * - this does NOT execute tests yet
 * - it only generates test files
 *
 * Output format:
 * same JSON structure used by the main agent
 */
async function generateTests(filePath, content) {
  let suggestedTestPath = filePath;

  // Java: move from src/main/java to src/test/java and use *Test.java
  if (filePath.endsWith(".java")) {
    suggestedTestPath = filePath
      .replace("/src/main/java/", "/src/test/java/")
      .replace(".java", "Test.java");
  }
  // Angular/TS: use .spec.ts
  else if (filePath.endsWith(".ts")) {
    suggestedTestPath = filePath.replace(/\.ts$/, ".spec.ts");
  }
  // HTML/CSS/SCSS: skip by default, agent can still ignore if not useful
  else {
    suggestedTestPath = `${filePath}.test`;
  }

  const prompt = `
Create tests for this file.

FILE:
${filePath}

CODE:
${content}

Rules:
- create only relevant tests
- follow the language/framework of the file
- use project conventions
- do not explain anything

Return ONLY JSON:
{
  "action": "code",
  "files": [
    {
      "file": "${suggestedTestPath}",
      "content": "test code here"
    }
  ]
}
`;

  const reply = await askLLM([
    {
      role: "system",
      content: `
You are a senior test engineer.
Generate focused, minimal, useful tests.
Return ONLY valid JSON.
`
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  return parseLLMResponse(reply);
}

/**
 * =========================
 * REVIEWER AGENT
 * =========================
 *
 * This agent validates the output BEFORE any file is written.
 *
 * Purpose:
 * - enforce agent.md rules strictly
 * - prevent bad or hallucinated code
 * - reject invalid structure or missing requirements
 *
 * What it checks:
 * - tests are present
 * - correct file paths
 * - correct package usage
 * - no extra features added
 * - no assumptions made
 *
 * Input:
 * - files: array of generated files from Builder
 *
 * Output:
 * - { status: "approved" }
 * - OR { status: "rejected", reason: "..." }
 */
async function reviewOutput(files) {
  const prompt = `
You are the Reviewer Agent.

Validate output against agent.md.

Reject if:
- wrong file path (not backend/ or frontend/)
- invalid extension (.js, .jsx, .tsx)
- Angular structure not followed
- backend not Java Spring Boot
- missing tests
- unrelated files outside feature scope

Return ONLY JSON:

{ "status": "approved" }

OR

{ "status": "rejected", "reason": "..." }

FILES:
${JSON.stringify(files)}
`;

  const reply = await askLLM([
    {
      role: "system",
      content: "You are a strict senior code reviewer."
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  try {
    return JSON.parse(reply.replace(/```json|```/g, "").trim());
  } catch {
    return {
      status: "rejected",
      reason: "Invalid reviewer response"
    };
  }
}

/**
 * =========================
 * INPUT HANDLER
 * =========================
 *
 * Reads agent-input.txt and extracts:
 * - mode: prompt | spec | combined
 * - prompt: manual instruction
 * - spec: spec file name
 *
 * This lets you control the agent without editing code.
 */

function readAgentInput() {
  const raw = readTextFile("agent-input.txt");

  const mode = raw.match(/mode:\s*(.*)/)?.[1]?.trim() || "prompt";
  const prompt = raw.match(/prompt:\s*([\s\S]*?)spec:/)?.[1]?.trim() || "";
  const specFile = raw.match(/spec:\s*(.*)/)?.[1]?.trim() || "";

  let spec = "";
  if (specFile && fileExists(`specs/${specFile}`)) {
    spec = readTextFile(`specs/${specFile}`);
  }

  return { mode, prompt, specFile, spec };
}

/**
 * =========================
 * AGENT RULES
 * =========================
 *
 * Reads agent.md.
 * This file contains permanent project rules:
 * - backend/frontend conventions
 * - Java/Angular structure
 * - output constraints
 */

function readAgentRules() {
  if (!fileExists("agent.md")) return "";
  return readTextFile("agent.md");
}

/**
 * =========================
 * INPUT BUILDER
 * =========================
 *
 * Builds the actual user message sent to the LLM.
 * Supports:
 * - prompt mode
 * - spec mode
 * - combined mode
 */

function buildUserInput() {
  const { mode, prompt, specFile, spec } = readAgentInput();

  let state = "";
  if (fileExists("project-state.md")) {
    state = readTextFile("project-state.md");
  }

  if (mode === "prompt") {
    return `
PROJECT STATE:
${state}

COMMAND:
${prompt}
`;
  }

  if (mode === "spec") {
    return `
PROJECT STATE:
${state}

SPEC (${specFile}):
${spec}
`;
  }

  if (mode === "combined") {
    return `
PROJECT STATE:
${state}

SPEC (${specFile}):
${spec}

COMMAND:
${prompt}
`;
  }
  
  return "Invalid mode in agent-input.txt";
}

/**
 * =========================
 * LLM CALL
 * =========================
 *
 * Sends the conversation to LM Studio and returns
 * the model response text.
 */

// async function askLLM(messages) {
//   const res = await fetch(API, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: MODEL,
//       messages,
//       temperature: 0.2
//     })
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`LLM request failed: ${res.status} ${text}`);
//   }

//   const data = await res.json();
//   return data.choices?.[0]?.message?.content || "";
// }

async function askLLM(messages) {
  for (const provider of PROVIDERS) {
    try {
      console.log(`🤖 Trying provider: ${provider.name}`);

      const headers = {
        "Content-Type": "application/json"
      };

      if (provider.apiKey) {
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
      }

      const res = await fetch(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.2
        })
      });

      if (!res.ok) {
        throw new Error(`${provider.name} failed: ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        return content;
      }

      throw new Error(`${provider.name} returned empty response`);
    } catch (err) {
      console.log(`⚠️ ${provider.name} error:`, err.message);
      continue;
    }
  }

  throw new Error("❌ All providers failed");
}

/**
 * =========================
 * RESPONSE PARSER
 * =========================
 *
 * Local models are often messy.
 * This parser tries to recover:
 * - action
 * - files[]
 * - fallback single file/content
 *
 * It handles:
 * - ```json fences
 * - multi-file JSON output
 * - older single-file output
 * - escaped new lines
 *
 * Goal:
 * - always return a predictable object:
 *   { action, files, raw }
 */

function parseLLMResponse(reply) {
  /**
   * =========================
   * STEP 1 — EXTRACT JSON BLOCK
   * =========================
   */
  const jsonMatch = reply.match(/```json([\s\S]*?)```/);

  if (!jsonMatch) {
    console.log("❌ No JSON block found");
    return { action: "", files: [] };
  }

  const cleaned = jsonMatch[1].trim();

  /**
   * =========================
   * STEP 2 — PARSE JSON
   * =========================
   */
  try {
    const parsed = JSON.parse(cleaned);

    /**
     * =========================
     * STEP 3 — VALIDATE STRUCTURE
     * =========================
     */
    if (!parsed || !parsed.action) {
      console.log("❌ Invalid JSON structure");
      return { action: "", files: [] };
    }

    const files = Array.isArray(parsed.files)
      ? parsed.files
      : parsed.file && parsed.content
        ? [{ file: parsed.file, content: parsed.content }]
        : [];

    return {
      action: parsed.action,
      files,
      raw: cleaned
    };

  } catch (err) {
    /**
     * =========================
     * STEP 4 — HARD FAIL
     * =========================
     *
     * Do NOT try to recover with regex.
     * If JSON is broken → retry upstream.
     */
    console.log("❌ JSON parse failed:", err.message);

    return {
      action: "",
      files: [],
      raw: cleaned
    };
  }
}

/**
 * =========================
 * PATH AUTO-FIX
 * =========================
 *
 * This is critical for your setup.
 *
 * Goal:
 * - let the model suggest a path
 * - automatically correct common mistakes
 *
 * Why:
 * - small local models are not reliable enough
 * - Java + Angular need strong structure
 */

function autoFixPath(filePath, content) {
  let fixed = (filePath || "").replace(/\\/g, "/").trim();

  if (!fixed.startsWith("backend/") && !fixed.startsWith("frontend/")) {
    const looksLikeJava =
      fixed.endsWith(".java") ||
      content.includes("@RestController") ||
      content.includes("@Service") ||
      content.includes("@Repository") ||
      content.includes("package ");

    const looksLikeFrontend =
      fixed.endsWith(".ts") ||
      fixed.endsWith(".html") ||
      fixed.endsWith(".scss") ||
      fixed.endsWith(".css");

    if (looksLikeJava) {
      fixed = `backend/${fixed}`;
    } else if (looksLikeFrontend) {
      fixed = `frontend/${fixed}`;
    } else {
      fixed = `backend/${fixed}`;
    }
  }

  // Java path correction
  if (fixed.startsWith("backend/") && fixed.endsWith(".java")) {
    if (!fixed.startsWith("backend/src/main/java/") && !fixed.startsWith("backend/src/test/java/")) {
      const fileName = path.basename(fixed);
      fixed = `backend/src/main/java/${fileName}`;
    }
  }

  // Common Spring resources correction
  if (
    fixed.startsWith("backend/") &&
    (fixed.endsWith(".yml") ||
      fixed.endsWith(".yaml") ||
      fixed.endsWith(".properties"))
  ) {
    if (!fixed.startsWith("backend/src/main/resources/")) {
      const fileName = path.basename(fixed);
      fixed = `backend/src/main/resources/${fileName}`;
    }
  }

  // Angular path correction
  if (fixed.startsWith("frontend/")) {
    const looksLikeAngularFile =
      fixed.endsWith(".ts") ||
      fixed.endsWith(".html") ||
      fixed.endsWith(".scss") ||
      fixed.endsWith(".css");

    if (looksLikeAngularFile && !fixed.startsWith("frontend/src/")) {
      const relative = fixed.replace(/^frontend\//, "");
      fixed = `frontend/src/${relative}`;
    }
  }

  return fixed;
}

/**
 * =========================
 * PATH VALIDATION
 * =========================
 *
 * Prevents the agent from writing outside
 * backend/ or frontend/.
 */

function validatePath(filePath) {
  if (!filePath.startsWith("backend/") && !filePath.startsWith("frontend/")) {
    throw new Error(`Invalid path: ${filePath}`);
  }
}

/**
 * =========================
 * FILE WRITER
 * =========================
 *
 * Writes file content to disk after validation.
 * Creates folders automatically if needed.
 */

function writeFile(filePath, content) {
  validatePath(filePath);

  const fullPath = path.resolve(PROJECT_ROOT, filePath);

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");

  console.log(`📁 File written: ${filePath}`);
}

/**
 * =========================
 * GITHUB PUSH
 * =========================
 *
 * Pushes the generated file into the configured repo.
 * If the file already exists, it updates it.
 * If it does not exist, it creates it.
 */

async function pushToGithub(filePath, content) {
  if (!ENABLE_GITHUB) return;
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO) {
    console.log("⚠️ GitHub skipped: missing .env config");
    return;
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const encodedContent = Buffer.from(content).toString("base64");

  let sha;

  try {
    const existing = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath
    });

    sha = existing.data.sha;
  } catch {
    sha = undefined;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `AI commit: ${filePath}`,
    content: encodedContent,
    sha,
    branch: "main"
  });

  console.log(`🚀 GitHub pushed: ${filePath}`);
}

/**
 * =========================
 * SUPABASE LOGGING
 * =========================
 *
 * Stores a simple execution log in Supabase.
 * Useful for:
 * - history
 * - tracking generated files
 * - future state queries
 *
 * Expected table:
 * agent_logs(id uuid default gen_random_uuid(), file text, action text, created_at timestamp default now())
 */

async function saveToSupabase(data) {
  if (!ENABLE_SUPABASE) return;
  if (!supabase) {
    console.log("⚠️ Supabase skipped: missing .env config");
    return;
  }

  try {
    const { error } = await supabase.from("agent_logs").insert([
      {
        file: data.file,
        action: data.action
      }
    ]);

    if (error) {
      console.log(`❌ Supabase error: ${error.message}`);
      return;
    }

    console.log(`🗄️ Supabase logged: ${data.file}`);
  } catch (err) {
    console.log(`❌ Supabase crash: ${err.message}`);
  }
}

/**
 * =========================
 * NOTION LOGGING
 * =========================
 *
 * Writes a simple row/page into a Notion database.
 * Intended for:
 * - project activity tracking
 * - documentation history
 *
 * Expected:
 * - a database already exists
 * - NOTION_DATABASE_ID is set
 *
 * IMPORTANT:
 * Property names in your Notion database must match
 * the ones used below:
 * - Name (title)
 * - File (rich_text)
 * - Action (rich_text)
 */

async function saveToNotion(data) {
  if (!ENABLE_NOTION) return;
  if (!notion || !process.env.NOTION_DATABASE_ID) {
    console.log("⚠️ Notion skipped: missing .env config");
    return;
  }

  try {
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: `Agent update: ${data.file}`
              }
            }
          ]
        },
        File: {
          rich_text: [
            {
              text: {
                content: data.file || ""
              }
            }
          ]
        },
        Action: {
          rich_text: [
            {
              text: {
                content: data.action || ""
              }
            }
          ]
        }
      }
    });

    console.log(`📝 Notion logged: ${data.file}`);
  } catch (err) {
    console.log(`❌ Notion error: ${err.message}`);
  }
}

/**
 * =========================
 * ENGRAM MEMORY
 * =========================
 *
 * This version uses Engram correctly for your setup:
 *
 * 1. search memory BEFORE LLM call (relevant context)
 * 2. inject into prompt
 * 3. save AFTER execution
 *
 * It uses the local CLI because that is what you have installed.
 */

const ENGRAM_PATH = "C:\\Users\\Danny\\bin\\engram.exe";

/**
 * SEARCH MEMORY
 *
 * Uses:
 * engram search "query"
 *
 * Returns relevant past memories.
 */
function searchEngramMemory(query) {
  if (!ENABLE_ENGRAM) return "";

  try {
    const safeQuery = (query || "").replace(/"/g, "").replace(/\n/g, " ");
    const result = execSync(
      `"${ENGRAM_PATH}" search "${safeQuery}"`,
      { encoding: "utf-8" }
    );

    return result.slice(0, 1500);
  } catch {
    console.log("⚠️ Engram search failed");
    return "";
  }
}

/**
 * SAVE MEMORY
 *
 * Uses:
 * engram save "title" "content"
 *
 * Stores useful execution info.
 */
function saveToEngram(data) {
  if (!ENABLE_ENGRAM) return;

  const title = "agent-memory";

  const content = `
FILE: ${data.file}
ACTION: ${data.action}
SUMMARY:
${(data.content || "").slice(0, 300)}
`
    .replace(/"/g, "")
    .replace(/\n/g, " ")
    .slice(0, 500);

  const command = `"${ENGRAM_PATH}" save "${title}" "${content}"`;

  setTimeout(() => {
    exec(command, (error) => {
      if (error) {
        console.log("❌ Engram save error:", error.message);
        return;
      }
      console.log("🧠 Engram saved:", data.file);
    });
  }, 200);
}

/**
 * =========================
 * PLANNER AGENT
 * =========================
 *
 * This agent creates the implementation plan
 * BEFORE any code is generated.
 *
 * Purpose:
 * - enforce Spec-Driven Development
 * - prevent random coding
 * - identify impacted files early
 * - identify unknowns before execution
 *
 * Why this matters:
 * - small local models can jump into code too fast
 * - planning first gives structure and reduces hallucination
 *
 * Input:
 * - userInput: combined request, project state, and spec
 *
 * Output:
 * - readable explanation
 * - JSON plan structure
 */
async function createPlan(userInput) {
  const prompt = `
You are the Planner Agent.

Project Constraints (STRICT):
- Backend: Java Spring Boot (NOT Node.js)
- Frontend: Angular + Typescript (NOT React)
  - Frontend MUST include:
    - .ts
    - .html
    - .scss
    - .spec.ts
  - NEVER generate:
    - .js (for frontend)
    - .jsx
    - .tsx
  
- Project Structure Rules (CRITICAL)
  - Backend
    - backend/src/main/java/com/taskmanager/app/
    - backend/src/main/resources/
  - Frontend
    - frontend/src/app/tasks/
    - frontend/src/assets/
- Angular structure MUST follow:
  - frontend/src/app/tasks/<feature-name>/<feature-name>.component.ts
  - Use lowercase with hyphen:
    - task-edit
    - task-list
  - NEVER use:
    - PascalCase file names
    - flat structure under tasks/
- Testing Planning Rule
  - For EVERY file listed:
    → MUST include its test pair
  - If modifying existing file:
    → MUST include test update
  If not:
  → DO NOT generate plan
  → add to unknowns
- Completeness Requirement:
  - DO NOT minimize file list
  - DO NOT omit required files
  - Plan MUST be complete enough for full implementation

Responsibilities:
- Analyze the request
- Create step-by-step plan
- Identify impacted files
- Define API contract if needed
- List unknowns

Rules:
- NO code generation
- Be concise
- If unsure → include it in unknowns

Output:
Readable explanation + JSON:

{
  "type": "plan",
  "steps": [],
  "files": [],
  "api": {},
  "unknowns": []
}
`;

  return await askLLM([
    { role: "system", content: prompt },
    { role: "user", content: userInput }
  ]);
}

/**
 * =========================
 * MAIN AGENT LOOP (FINAL COMPLETE VERSION)
 * =========================
 *
 * This is the full execution engine of your AI agent.
 *
 * It implements a real Spec-Driven Development workflow:
 *
 * 1. Read user input (prompt + spec)
 * 2. Generate a PLAN (high-level architecture)
 * 3. Retrieve relevant memory (Engram search)
 * 4. Execute step-by-step (multi-file support)
 * 5. For each file:
 *    - fix path
 *    - detect issues
 *    - auto-fix if needed
 *    - write file
 *    - push to integrations
 *    - generate tests
 * 6. Store memory
 * 7. Repeat until done
 *
 * This transforms the agent into:
 * ✔ planner
 * ✔ executor
 * ✔ self-correcting system
 * ✔ memory-aware developer
 */

async function run() {
  /**
   * =========================
   * STEP 1 — BUILD USER INPUT
   * =========================
   *
   * Combines:
   * - agent-input.txt (prompt)
   * - spec file (if exists)
   *
   * This is the starting instruction for the agent.
   */
  const userInput = buildUserInput();

  /**
   * =========================
   * STEP 2 — CREATE PLAN
   * =========================
   *
   * Before coding, the agent generates a plan.
   * This prevents random output and enforces structure.
   */
  const plan = await createPlan(userInput);

  console.log("\n🧠 PLAN:\n", plan);

  /**
   * =========================
   * STEP 2.5 — USER APPROVAL
   * =========================
   *
   * Pause execution after planning.
   *
   * User must confirm before continuing.
   */
  const approved = await waitForUserApproval();

  if (!approved) {
    console.log("❌ Execution cancelled by user.");
    return;
  }

  /**
   * =========================
   * STEP 3 — SAVE PLAN TO MEMORY
   * =========================
   *
   * Store plan in Engram so:
   * - future runs can reuse it
   * - agent stays consistent across iterations
   */
  saveToEngram({
    file: "plan",
    action: "created",
    content: plan
  });

  /**
   * =========================
   * STEP 4 — LOAD MEMORY
   * =========================
   *
   * Retrieve relevant past actions using Engram.
   * This improves context and decision-making.
   */
  const memory = searchEngramMemory(userInput);

    /**
   * =========================
   * STEP 5 — BUILDER AGENT PROMPT
   * =========================
   *
   * This is the execution role.
   *
   * Purpose:
   * - enforce plan adherence
   * - prevent hallucination
   * - prevent scope creep
   * - ensure test generation
   *
   * Important:
   * - We STILL include agent.md for full rules
   * - But we reinforce critical rules explicitly
   */
  const BUILDER_PROMPT = `
You are the Builder Agent.

Framework Rules (STRICT):
- Backend MUST be Java Spring Boot
- Frontend MUST be Angular + Typescript
- NEVER use React
- NEVER generate:
  - .jsx
  - .tsx
  - React imports

Frontend MUST use:
- .ts (components/services)
- .html (templates)
- .scss (styles)
- .spec.ts (testing)

Rules:
- Implement ONLY approved plan
- NO extra features
- NO refactoring
- NO renaming
- ONLY modify listed files
- MUST include tests
- MUST use Angular (NOT React)
- NEVER generate .jsx or .tsx files

Return ONLY JSON:

{
  "action": "code | done",
  "files": [
    {
      "file": "backend/... or frontend/...",
      "content": "code"
    }
  ]
}
`;
  const messages = [
    {
      role: "system",
      content: `
${readAgentRules()}

PLAN:
${plan}

RELEVANT MEMORY:
${memory}

${BUILDER_PROMPT}
`
    },
    {
      role: "user",
      content: userInput
    }
  ];

  /**
   * =========================
   * STEP 6 — EXECUTION LOOP
   * =========================
   *
   * The agent runs until:
   * - action = "done"
   * - or max iterations reached
   *
   * Each loop generates 1–3 files.
   */
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log("🔁 Iteration:", iterations);
    
    /**
     * STEP 6.1 Call local LLM (LM Studio)
     */
    const reply = await askLLM(messages);

    console.log("\n🤖 LLM RESPONSE:\n", reply);

    /**
     * STEP 6.2 Parse LLM response safely
     */
    const parsed = parseLLMResponse(reply);
    console.log("📦 Parsed files count:", parsed.files?.length);

    /**
     * =========================
     * STEP 6.3 — ACTION SANITIZATION
     * =========================
     *
     * Fixes invalid actions like:
     * "code | done"
     * → converts to "code"
     *
     * Prevents premature loop termination.
     */
    parsed.action = parsed.action?.split("|")[0].trim();

    /**
     * =========================
     * STEP 6.4 — STRUCTURAL VALIDATION
     * =========================
     *
     * Ensures the LLM response is valid before processing.
     */
    if (!parsed.action) {
      console.log("⚠️ Invalid response, retrying...");
      messages.push({
        role: "assistant",
        content: "Previous response was invalid. Return valid JSON only."
      });
      continue;
    }

    if (!parsed.files || parsed.files.length === 0) {
      console.log("⚠️ No files returned, retrying...");
      messages.push({
        role: "assistant",
        content: "Previous response had no files. Return valid JSON with files."
      });
      continue;
    }

    /**
     * =========================
     * STEP 6.5 — REVIEWER VALIDATION
     * =========================
     *
     * After structural validation passes,
     * we validate the output using the Reviewer Agent.
     *
     * Purpose:
     * - enforce agent.md rules
     * - prevent invalid or incomplete code from being written
     *
     * If rejected:
     * - do NOT process files
     * - send feedback back to LLM
     * - retry generation
     */
    const review = await reviewOutput(parsed.files);

    if (review.status === "rejected") {
      console.log("❌ Reviewer rejected output:", review.reason);

      messages.push({
        role: "assistant",
        content: `Previous output rejected: ${review.reason}. Fix and retry.`
      });

      continue;
    }

    /**
     * =========================
     * STEP 7 — PROCESS FILES
     * =========================
     *
     * For each generated file:
     * - fix path
     * - detect issues
     * - auto-fix
     * - write
     * - integrate
     * - test
     */
    let hasInvalidContent = false;

    for (const f of parsed.files) {
      console.log("👉 Processing file:", f.file);
      if (!f.file) {
        console.log("❌ Missing file path:", f);
        continue;
      }

      if (!f.content) {
        console.log("⚠️ Empty content, skipping:", f.file);
        continue;
      }

      /**
       * STEP 7.1 — PATH FIX
       *
       * Corrects:
       * - missing backend/frontend
       * - wrong Java structure
       * - wrong Angular structure
       */
      let fixedPath = autoFixPath(f.file, f.content);

      /**
       * STEP 7.2 — INITIAL CONTENT
       */
      let finalContent = f.content;

      /**
       * STEP 7.3 — ERROR DETECTION
       *
       * Detect basic issues before saving.
       */
      if (hasBasicError(finalContent)) {
        console.log("⚠️ Potential issue detected, attempting fix...");

        const fix = await fixCode(
          fixedPath,
          "basic validation failed",
          finalContent
        );

        if (fix.files && fix.files[0]?.content) {
          finalContent = fix.files[0].content;
          console.log("🛠️ Code fixed:", fixedPath);
        }
      }

      /**
       * =========================
       * STEP 7.3.1 — CONTENT VALIDATION
       * =========================
       *
       * Purpose:
       * - prevent placeholder / fake code from being written
       *
       * Detects:
       * - empty content
       * - placeholder comments
       * - fake implementations
       *
       * Behavior:
       * - reject file
       * - send feedback to LLM
       * - retry loop
       */
      if (!isValidContent(finalContent)) {
        console.log("❌ Invalid content detected:", fixedPath);

        hasInvalidContent = true;
        break; // 🚨 stop processing remaining files
      }

      /**
       * STEP 7.4 — WRITE FILE
       */
      writeFile(fixedPath, finalContent);

      /**
       * STEP 7.5 — PREPARE PAYLOAD
       */
      const payload = {
        file: fixedPath,
        content: finalContent,
        action: parsed.action
      };

      /**
       * STEP 7.6 — INTEGRATIONS
       *
       * - GitHub
       * - Supabase
       * - Notion
       * - Engram
       */
      await pushToGithub(payload.file, payload.content);
      await saveToSupabase(payload);
      await saveToNotion(payload);
      saveToEngram(payload);

      /**
       * STEP 7.7 — TEST GENERATION (SMART FALLBACK)
       *
       * Preferred behavior:
       * - Builder includes tests in its own response
       *
       * Fallback behavior:
       * - if Builder did NOT include tests,
       *   generate them automatically
       *
       * Why this matters:
       * - this keeps agent.md strict
       * - but still gives the runtime a recovery path
       */
      const hasTest = parsed.files.some((file) =>
        file.file.includes(".test") || file.file.includes(".spec")
      );

      if (!hasTest) {
        const tests = await generateTests(fixedPath, finalContent);

        /**
         * STEP 7.8 — WRITE TEST FILES
         *
         * If fallback test generation succeeds,
         * write those test files like normal generated files.
         */
        if (tests.files && tests.files.length > 0) {
          for (const t of tests.files) {
            if (!t.file || !t.content) continue;

            const testPath = autoFixPath(t.file, t.content);

            writeFile(testPath, t.content);
            await pushToGithub(testPath, t.content);

            console.log("🧪 Test created:", testPath);
          }
        }
      }
    }

    /**
     * =========================
     * STEP 7.9 — GLOBAL REJECTION
     * =========================
     *
     * If any file was invalid → retry entire response
     */
    if (hasInvalidContent) {
      messages.push({
        role: "assistant",
        content: "Previous output contained placeholders or invalid code. Return FULL valid implementation for ALL files. No placeholders."
      });

      continue; // 🔁 retry loop
    }

    /**
     * =========================
     * STEP 7.10 — AUTO COMPLETE SAFETY
     * =========================
     *
     * If files were successfully written,
     * assume task is complete to prevent infinite loop.
     */
    if (parsed.files && parsed.files.length > 0) {
      console.log("✅ Files generated successfully. Ending loop.");
      break;
    }

    /**
     * =========================
     * STEP 7.11 — FILE PROTECTION
     * =========================
     *
     * Prevents critical files from being overwritten
     */
    if (
      fixedPath.startsWith("ai-agent/") ||
      fixedPath.startsWith("specs/") ||
      fixedPath.includes("agent.md") ||
      fixedPath.includes("project-state.md")
    ) {
      console.log("🚫 Protected file skipped:", fixedPath);
      continue;
    }

    /**
     * =========================
     * STEP 8 — STOP CONDITION
     * =========================
     *
     * Exit when task is complete.
     */
    if (parsed.action && parsed.action.trim() === "done")  {
      console.log("✅ DONE");
      break;
    }

    /**
     * =========================
     * STEP 9 — CONTEXT UPDATE
     * =========================
     *
     * Feed previous response back into LLM
     * to allow multi-step reasoning.
     */
    messages.push({
      role: "assistant",
      content: reply
    });
  }

  if (iterations >= MAX_ITERATIONS) {
    console.log(`⚠️ Stopped after reaching max iterations (${MAX_ITERATIONS})`);
  }

  /**
   * =========================
   * CONTENT VALIDATOR
   * =========================
   *
   * Validates generated code quality.
   *
   * Rejects:
   * - placeholders
   * - empty implementations
   * - fake comments instead of code
   */
  function isValidContent(content) {
    if (!content) return false;

    const invalidPatterns = [
      "existing content",
      "new implementation",
      "placeholder",
      "<!--",
      "// existing",
      "// TODO",
      "updated HTML",
      "updated SCSS"
    ];

    return !invalidPatterns.some(p => content.includes(p));
  }

  /**
   * =========================
   * FINAL STATE
   * =========================
   */
  console.log("\n🏁 Agent finished execution");
}

/**
 * =========================
 * START
 * =========================
 *
 * Entry point for the script.
 */

run().catch((err) => {
  console.error("❌ Agent crashed:", err.message);
});