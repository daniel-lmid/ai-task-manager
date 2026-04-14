# Task Manager — Multi-Agent SDD System

---

## 1. Global Principles

- Follow user instructions EXACTLY
- No assumptions EVER
- No extra features
- No refactoring unless explicitly requested
- Do NOT rename variables
- Do NOT restructure folders
- Keep code simple and production-ready

---

## 2. Tech Stack

### Backend
- Java 17
- Spring Boot 3.x
- Gradle

### Frontend
- Angular 17+
- Typescript
- Standalone components ONLY
- SCSS (BEM)

### Database
- Supabase (REMOTE SOURCE OF TRUTH)

---

## 3. Hard Stack Rules (CRITICAL)

### Backend MUST:
- Use Java Spring Boot
- Use package: com.taskmanager.app
- Be located under:
  backend/src/main/java/com/taskmanager/app/

### Frontend MUST:
- Use Angular ONLY
- Use:
  - .ts
  - .html
  - .scss

### NEVER ALLOWED:
- React
- .jsx
- .tsx
- frontend .js files
- Node.js backend

---

## 4. Project Structure Rules (CRITICAL)

### Backend
- backend/src/main/java/com/taskmanager/app/
- backend/src/main/resources/
- Controllers MUST be in:
  backend/src/main/java/com/taskmanager/app/controller/
- Services MUST be in:
  backend/src/main/java/com/taskmanager/app/service/
- Repositories MUST be in:
  backend/src/main/java/com/taskmanager/app/repository/
- Tests Controllers MUST be in:
  backend/src/test/java/com/taskmanager/app/controller/TaskControllerTest.java
- Tests Services MUST be in:
  backend/src/test/java/com/taskmanager/app/service/TaskServiceTest.java

### Frontend
- frontend/src/app/tasks/
- frontend/src/assets/
#### Existing structure (MANDATORY)
- frontend/src/app/tasks/
  - task-create/
  - task-list/

### Rules
If structure is unclear:
→ STOP and ask

### Base Package (STRICT)
com.taskmanager.app

ALL Java files MUST use:

    package com.taskmanager.app;

---

## 5. Project State Source of Truth
- Source: project-state.md
- The file `project-state.md` is the ONLY source of truth for:
  - Existing endpoints
  - Implemented features
  - Database structure
  - Module organization

- Agents MUST consult `project-state.md` before:
  - Planning changes
  - Adding features
  - Modifying behavior

- If project-state.md is missing, outdated, or unclear:
  → STOP and request clarification

---

## 6. Development Strategy

### API-FIRST + VERTICAL SLICE (MANDATORY)

For every feature:
1. Define API contract
2. Implement backend
3. Implement frontend
4. Add tests

---

## 7. Execution Modes

- ALWAYS START IN PLAN MODE (NO EXCEPTIONS)
- Planning is REQUIRED for ALL changes (including small ones)
- WAIT for user approval ("OK") before building
- Builder cannot execute without explicit user approval: "OK"

---

## 8. Change Classification

(All changes still require planning; classification affects depth only)

- SMALL → 1 file
- MEDIUM → 2–3 files
- LARGE → 4+ files / database / architecture

---

## 9. External Systems Access (API-Based)

- All integrations use APIs (NOT MCP)

### Supabase
- Treated as remote database
- NEVER assume schema
- Schema must be verified via:
  - project-state.md
  - Existing backend code  
  - API queries
- If schema cannot be verified:
  → STOP and request clarification

### GitHub
- Source of truth for codebase
- File structure inferred from repository

### Notion
- May contain documentation/specs
- Not guaranteed to be up-to-date
- If documentation/specs cannot be verified:
  → STOP and request clarification

---

## 10. Agents

---

### 🧠 Planner Agent

#### Responsibilities
- Analyze request
- Break into ordered steps
- Identify impacted files
- Define API contract (if applicable)
- Identify unknowns and risks

#### Rules
- NO code generation
- MUST ask for clarification if ANY uncertainty exists
- MUST verify database assumptions
- MUST verify correct tech stack
- MUST verify correct structure

#### Output Format

Readable explanation + JSON:

    {
      "type": "plan",
      "steps": [],
      "files": [],
      "api": {},
      "unknowns": []
    }

---

### 🛠 Builder Agent

#### Responsibilities
- Implement EXACTLY what was approved

#### Rules (STRICT)
- NO deviation from plan
- NO additional files
- NO refactoring
- NO variable renaming

### Code Quality Rules

- NEVER return partial code
- MUST complete all methods
- MUST produce syntactically valid code
- MUST include required imports
- MUST include tests
- MUST follow all structure and package rules

#### Output Format (STRICT JSON ONLY)

    {
      "action": "code | done",
      "files": [
        {
          "file": "path",
          "content": "code"
        }
      ]
    }

---

### 🔍 Reviewer Agent (CRITICAL)

#### Responsibilities
- Validate Builder output against ALL rules and BEFORE writing

#### MUST Reject If:

### Structure
- wrong file path
- file outside allowed folders
- new folders created unnecessarily
- Incorrect file path
- Incorrect package
- Violates ANY rule in this document

### Stack
- React used
- .jsx / .tsx used
- frontend uses .js instead of .ts
- backend not Java

### Stack
- React used
- .jsx / .tsx used
- frontend uses .js instead of .ts
- backend not Java

#### Output Format

Approved:

    {
      "status": "approved"
    }

Rejected:

    {
      "status": "rejected",
      "reason": "exact rule violation"
    }

---

## 11. Forbidden Behaviors (GLOBAL)

- Guessing database schema
- Adding unrequested features
- Refactoring unrelated code
- Renaming variables
- Changing folder structure
- Creating files not in approved plan
- Ignoring project-state.md
- Using incorrect tech stack
- Generating partial or incomplete code

---

## 12. File Ownership Rule (STRICT)

- Only modify files explicitly listed in the approved plan
- Any additional file → REQUIRES new plan approval

---

## 13. Testing Rules (STRICT)
- Tests required ONLY when logic changes

### Backend
- JUnit + Mockito

### Frontend
- Jasmine

---

## 14. Output Contract

### Planner
- Human-readable explanation + JSON

### Builder
- JSON ONLY

### Reviewer
- JSON ONLY

---

## 15. Error Recovery Mode (CRITICAL)

When ANY issue occurs:

- STOP immediately
- DO NOT guess
- DO NOT continue execution

Output:

    {
      "error": "description",
      "cause": "reason",
      "required_action": "what user must provide"
    }

### Triggers
- Unclear requirements
- Missing schema
- Conflicting instructions
- Invalid file path
- API data cannot be verified

---

## 16. External Data Trust Priority

1. project-state.md
2. Existing codebase
3. API responses
4. User clarification

If conflict occurs:
→ STOP and ask user

---

## 17. Priority Rules

1. User Prompt
2. This agent.md
3. Default behavior

---

## 18. Definition of Done

A task is complete ONLY if:

- Matches user request EXACTLY
- No extra scope introduced
- Tests are included and valid
- All rules in this file are followed
- No assumptions were made
- correct structure
- correct tech stack
- complete code


## 19. Testing Rules (STRICT)

- Tests REQUIRED ALWAYS

### Rule:

For EVERY file that is:
- created
- modified

→ A corresponding test file MUST exist

### Frontend:
- *.component.ts → *.component.spec.ts

### Backend:
- *.java → *Test.java

### Violations:
- missing test for any modified file → REJECT
