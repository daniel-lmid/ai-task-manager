# AI Coding Agent (Local Spec-Driven Development System)

## 🚀 Overview

This project is a **local AI-powered coding agent** built to enable **Spec Driven Development (SDD)** using a local LLM (via LM Studio).

This is NOT your backend or frontend project.

This is a **development automation engine** that:

- Reads structured instructions (prompt + spec)
- Plans architecture before coding
- Generates multi-file code (backend + frontend)
- Automatically fixes basic issues
- Writes files into your project
- Generates tests
- Pushes code to GitHub
- Logs activity in Supabase
- Tracks execution in Notion
- Stores memory using Engram
- Runs fully locally (no cloud AI required)

---

## 🧠 Architecture

User Input (agent-input.txt)  
        ↓  
Planner (LLM)  
        ↓  
Memory Retrieval (Engram)  
        ↓  
Execution Loop  
        ↓  
File Generation (backend/frontend)  
        ↓  
Post-processing:  
  → Path Fixing  
  → Error Detection  
  → Auto-Fix  
        ↓  
Integrations:  
  → GitHub  
  → Supabase  
  → Notion  
  → Engram  

---

## 📁 Project Structure

project-root/

├── ai-agent/  
│   ├── agent.js  
│   ├── package.json  
│   ├── .env  
│  
├── backend/  
│   └── (Spring Boot code generated here)  
│  
├── frontend/  
│   └── (Angular code generated here)  
│  
├── specs/  
│   └── *.md (feature specifications)  
│  
├── agent.md (rules and constraints)  
├── agent-input.txt (control panel)  

IMPORTANT:  
The agent ONLY writes into:
- backend/
- frontend/

---

## ⚙️ Requirements

- Node.js 18+ (recommended: 20+)
- LM Studio running locally
- Engram CLI installed
- GitHub account (optional but recommended)
- Supabase project (optional)
- Notion integration (optional)

---

## 📦 Installation

Inside ai-agent/:

npm install

Dependencies:

- @octokit/rest
- @supabase/supabase-js
- @notionhq/client
- dotenv

---

## 🔐 Environment Variables (.env)

LMSTUDIO_API=http://127.0.0.1:1234/v1/chat/completions  
LMSTUDIO_MODEL=qwen2.5-coder-7b  

GITHUB_TOKEN=your_token  
GITHUB_OWNER=your_username  
GITHUB_REPO=your_repo  

SUPABASE_URL=https://your-project.supabase.co  
SUPABASE_KEY=your_service_role_key  

NOTION_KEY=your_notion_api_key  
NOTION_DATABASE_ID=your_database_id  

ENGRAM_PATH=YOUR_PATH\bin\engram.exe  

---

## 🧾 agent-input.txt (Control Panel)

mode: combined  

prompt:  
Create a task management API with CRUD operations  

spec: task-creation.md  

Modes:

- prompt → only manual instruction
- spec → only spec file
- combined → both

---

## 📜 agent.md (Rules)

Defines permanent constraints for the agent.

Example:

- Backend must use Spring Boot
- Controllers must use @RestController
- Java files must be under src/main/java
- Frontend must use Angular
- Angular files must be under src/
- Always return backend/ or frontend/ paths
- Do not output explanations, only JSON

This acts as the agent’s "behavior contract".

---

## 📚 Specs (specs/*.md)

Specs define what to build.

Example:

Create Task API:
- create task
- list tasks
- update task
- delete task

Specs are the main driver of development.

---

## 🤖 How the Agent Works

### Step 1 — Input

Reads:
- agent-input.txt
- optional spec file

---

### Step 2 — Planning

LLM generates a structured implementation plan before coding.

Purpose:
- avoid random output
- enforce architecture

---

### Step 3 — Memory (Engram)

Before coding:
- agent searches past memory
- injects relevant context into prompt

After coding:
- agent stores execution summary

Flow:

search → inject → generate → save

---

### Step 4 — Execution Loop

Agent runs in iterations:

- calls LLM
- receives JSON response
- processes up to 3 files per iteration

For each file:

- fix path (backend/frontend + structure)
- detect issues
- auto-fix using LLM if needed
- write file to disk
- push to GitHub
- log to Supabase
- log to Notion
- save memory
- generate test file

---

### Step 5 — Multi-file Generation

Agent expects:

{
  "action": "code",
  "files": [
    { "file": "...", "content": "..." }
  ]
}

Supports:
- multiple files per iteration
- iterative project building

---

### Step 6 — Path Auto-Fix

Automatically corrects:

- missing backend/ or frontend/
- wrong Java structure → src/main/java
- wrong test structure → src/test/java
- wrong Angular structure → src/

This compensates for LLM inconsistencies.

---

### Step 7 — Error Detection

Basic checks:

- empty content
- undefined
- TODO markers
- malformed output

If detected:
→ triggers auto-fix via LLM

---

### Step 8 — Error Recovery (LLM-based)

Agent sends code back to LLM with error context.

LLM returns corrected version.

NOTE:
This is NOT execution-based debugging (yet)

---

### Step 9 — Test Generation

After each file:

Java:
- src/test/java/...Test.java

Angular:
- *.spec.ts

Purpose:
- enforce safer development
- encourage test-first thinking

---

## 🧠 Memory System (Engram)

Uses CLI:

engram search "query"  
engram save "title" "content"  

Behavior:

- search before generation
- inject into context
- save after execution

---

## 🔗 Integrations

### GitHub

- creates or updates files
- commits automatically
- branch: main

---

### Supabase

Table required:

agent_logs(
  id uuid primary key default gen_random_uuid(),
  file text,
  action text,
  created_at timestamp default now()
)

Used for:
- execution history
- tracking generated files

---

### Notion

Database must contain:

- Name (title)
- File (rich_text)
- Action (rich_text)

Used for:
- activity tracking
- project visibility

---

### Engram

Local CLI path example:

C:\Users\Danny\bin\engram.exe

Used for:
- memory retrieval
- memory persistence

---

## ▶️ Run Agent

node agent.js


---

## 💡 Best Practices

- Keep specs small and clear
- Avoid large single prompts
- Use combined mode (spec + prompt)
- Prefer multiple iterations over one large task
- Use stronger models (7B+) when possible

---

## 🚀 Future Improvements

- Real execution loop (compile + fix)
- Runtime error detection
- Semantic memory (embeddings)
- Smarter retry handling
- Better test generation coverage
- Dependency auto-install
- DevOps integration (Docker, CI/CD)
- Tool calling / MCP integration

---

## 🎯 Purpose

This system is designed to:

- Replace manual coding with structured workflows
- Enable local, private AI development
- Simulate real developer thinking:
  plan → execute → fix → iterate

---

## 📌 Final Notes

This system provides:

- Full local control (no subscriptions required)
- Extensible architecture
- Repeatable development workflows

This is NOT plug-and-play AI.

This is a **developer-controlled AI system** designed to evolve with your workflow.
