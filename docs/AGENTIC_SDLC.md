# Agentic Software Development Lifecycle (SDLC) Guide
## Git-Flow with Multi-Agent Orchestration & Human-in-the-Loop UAT

This document details the software development lifecycle (SDLC) and multi-agent coordination protocol established for the **Bordful Job Board Platform** expansion. This system leverages specialized AI agents, local code intelligence models, testing runtimes, and a structured human-in-the-loop review workflow to guarantee exceptional reliability and velocity.

---

## 🔄 The Multi-Agent SDLC Architecture

The development pipeline operates as an autonomous loop orchestrated by **Hermes (PM)** with **Claude Code (Developer)** executing implementations, a dedicated **QA Agent (Tester)** auditing compliance, and **Brandon (Product Owner / Human)** performing final verification:

```
                  [ Human (Brandon) ]
                    │ (UAT Approval & Merge)
                    ▼
     ┌─────────────────────────────────┐
     │      Hermes (PM Agent)          │ ◄─── (Orchestrates, grooms Backlog & Board)
     └──────────────┬──────────────────┘
                    │ (Selects task, branches, spawns runner)
                    ▼
     ┌─────────────────────────────────┐
     │     Claude Code (Dev Agent)     │ ◄─── (Analyzes symbols, writes code, pushes PR)
     └──────────────┬──────────────────┘
                    │ (Pushes feature branch & opens Draft PR)
                    ▼
     ┌─────────────────────────────────┐
     │        QA Agent (Tester)        │ ◄─── (Spawns Next.js, runs Vitest & Playwright)
     └──────────────┬──────────────────┘
                    │ (Generates & posts QA Test Report)
                    ▼
                  [ Human (Brandon) ] ◄────── (Performs UAT, merges to main)
```

---

## 👥 Agent Roster & Division of Labor

### 1. Hermes (The Project Manager)
* **Role**: Primary orchestrator, repository governor, and team coordinator.
* **Responsibilities**:
  * Owns the **GitHub Project Board** (`Bordful Job Board Platform` #5) and backlog grooming.
  * Breaks down product goals into highly structured issues.
  * Spawns, monitors, and terminates specialist developer and tester agents.
  * Coordinates branch switching, merges, and alerts the Human Product Owner when UAT is ready.
  * **Compiles the "Lessons Learned Retrospective"**: At the conclusion of each development phase (post-UAT and merge), Hermes compiles a comprehensive retroactive log detailing architectural trade-offs, agent optimizations, solved tooling hurdles, and process adjustments. This log is appended directly to the project's historical knowledge base inside Obsidian (under `Lessons Learned/`) and the repository documentation.

### 2. Claude Code (The Developer Agent)
* **Role**: Headless feature engineer executing codebase modifications.
* **Responsibilities**:
  * Spawned inside isolated `tmux` developer workspaces.
  * Reads specialized role prompts (`backend.md`, `frontend.md`, `database.md`) inside `.claude/agents/` to adopt precise target boundaries.
  * Uses **CodeGraph** for structural symbol mapping and **Headroom** for context window compression.
  * Writes code, runs formatters/linters locally, and commits changes.
  * Opens a **Draft Pull Request** on GitHub, linking to the active issue.

### 3. QA Agent (The Automation Tester)
* **Role**: Independent validator verifying quality gates.
* **Responsibilities**:
  * Spawned autonomously by Hermes PM upon PR creation.
  * Checks out the PR branch, boots up test development configurations.
  * Executes unit and server-side testing suites via **Vitest**.
  * Executes automated end-to-end user journeys via **Playwright**.
  * Audits linter checks (`ultracite check`).
  * Generates a structured **QA Test Report** markdown file and appends it directly as a comment on the GitHub PR.

### 4. Brandon (The Human Product Owner)
* **Role**: Ultimate authority and quality standard.
* **Responsibilities**:
  * Performs **User Acceptance Testing (UAT)**.
  * Audits the QA Test Report and inspects the live preview on the Tailscale dev URL (`http://100.81.217.66:3000`).
  * Provides feedback, requests adjustments, or merges the PR directly on GitHub.

---

## 🛠️ Step-by-Step Execution Protocol

### Step 1: Sprint Planning & Backlog Grooming
* **Hermes PM** reviews the project state and grooms the GitHub Project Board.
* All cards are organized into five columns: `Todo`, `Ready`, `In Progress`, `QA Review`, and `Done`.
* Tasks are prioritized according to the **`PLAN.md` Roadmap** phases.

### Step 2: Task Assignment & Branching
1. **Hermes PM** selects the highest priority card from `Ready` (e.g., `Phase 0 — Foundation & Hygiene`) and shifts it to `In Progress`.
2. **Hermes PM** creates a clean, dedicated feature branch locally on `worker`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/phase0-hygiene-setup
   ```
3. **Hermes PM** boots up an isolated `tmux` session on `worker` and initiates **Claude Code**:
   ```bash
   tmux new-session -d -s "bordful-dev" "claude -p"
   ```

### Step 3: Feature Implementation & Local Checks
1. **Claude Code** consumes the task scope and loads the corresponding agent persona (e.g., `@backend`).
2. It queries **CodeGraph** to map symbols and structural dependencies:
   ```bash
   codegraph query "JobRepository"
   ```
3. **Claude Code** performs edits, runs local linting/formatting checks, and validates compilation:
   ```bash
   bun x ultracite check
   bun run build
   ```
4. It commits changes adhering to **Conventional Commits**:
   ```bash
   git add .
   git commit -m "feat: implement generic JobRepository contract"
   ```
5. **Claude Code** pushes the branch to GitHub:
   ```bash
   git push -u origin HEAD
   ```
6. **Claude Code** creates a **Draft Pull Request** using the `gh` CLI:
   ```bash
   gh pr create --draft --title "feat: phase 0 hygiene setup" --body "Closes #1"
   ```

### Step 4: Automated QA Execution
1. **Hermes PM** detects the draft PR, updates the issue on the Project Board to `QA Review`, and spawns the **QA Agent** in a detached environment.
2. The **QA Agent** runs the comprehensive linter and test suite:
   ```bash
   bun run test:unit
   bun run test:e2e
   ```
3. The **QA Agent** outputs a **QA Test Report** markdown block. 
   * **If tests fail**: The QA Agent details the precise tracebacks, and Hermes PM re-assigns the task back to Claude Code for immediate resolution.
   * **If tests pass**: The QA Agent marks the report 100% green and posts the report directly to the PR:
     ```bash
     gh pr comment <pr_number> --body-file qa_report.md
     ```

### Step 5: Human UAT & Merging
1. **Hermes PM** alerts **Brandon** that a feature is ready for UAT and links the PR.
2. **Brandon** reviews the PR diff, reads the QA Test Report, and optionally tests the feature live on the active dev server running on Tailscale at **`http://100.81.217.66:3000`**.
3. **Brandon** approves and merges the PR on GitHub:
   ```bash
   gh pr merge --squash --delete-branch
   ```
4. **Hermes PM** closes the issue, pulls the merged `main` branch to the local workspace on `worker`, and grooms the next item.

---

## 📐 Quality Standards & Gates

* **Zero Build Warnings**: TypeScript compile checks (`tsc --noEmit`) must report zero errors before any PR is promoted out of Draft.
* **Biome/Ultracite Compliance**: Formatter and linter checks must be completely clean. No stylistic deviations.
* **Test Coverage Integrity**: Every new Server Action, normalizer function, and helper module added by the `@backend` agent must ship with associated **Vitest** unit tests.
* **End-to-End Visual Coverage**: Any new UI layout or workflow route added by `@frontend` must include a corresponding **Playwright** automated script asserting viewport responsiveness and form operations.
