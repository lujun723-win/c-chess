# Default Project Workflow (PM + Low-Token)

## Goal
Run projects with a PM-style gated workflow:
1. Requirement clarification
2. Mind-map / flow discussion
3. Prototype discussion
4. MVP v1 implementation
5. Visual + architecture + solution sign-off
6. Step-by-step delivery to full project completion

## Default Skills To Use
Use these skills by default when relevant:
- `planning-with-files`: primary PM workflow and progress tracking
- `writing-plans`: convert requirements into actionable plans
- `mermaid-visualizer`: mind maps, workflows, architecture diagrams
- `excalidraw-diagram`: wireframes and prototype structure discussion
- `ui-ux-pro-max`: visual system and interaction quality
- `karpathy-guidelines`: keep implementation simple and scoped
- `doc`: maintain concise PRD/ADR/changelog docs
- `playwright`: smoke checks and key-flow verification
- `screenshot`: visual diff/review artifacts
- `find-skills`: add new skills only when gaps appear

## Default File Structure (Create If Missing)
When starting a new task/project, create and maintain these files:
- `.pm/requirements.md`
- `.pm/scope.md`
- `.pm/mindmap.mmd`
- `.pm/prototype-notes.md`
- `.pm/mvp-plan.md`
- `.pm/architecture.md`
- `.pm/tasks.md`
- `.pm/decision-log.md`
- `.pm/progress.md`
- `.pm/acceptance.md`

## Stage Gates (Must Pass In Order)
1. Requirement Gate:
   `requirements.md` + `scope.md` confirmed.
2. Diagram Gate:
   `mindmap.mmd` (Mermaid) reviewed and agreed.
3. Prototype Gate:
   `prototype-notes.md` (and Excalidraw when needed) reviewed.
4. MVP Gate:
   `mvp-plan.md` + `acceptance.md` define testable outcomes.
5. Build Gate:
   Execute tasks in `tasks.md` in small batches.
6. Release Gate:
   Run verification (tests/Playwright/screenshots), update `progress.md`.

Do not skip gates unless user explicitly requests skipping.

## Low-Token Operating Rules
- Prefer updating existing `.pm/*` files instead of rewriting from scratch.
- Keep responses concise by default; expand only on request.
- Use diagrams/tables/checklists in files to compress repeated context.
- Before coding, freeze:
  - MVP scope (what is in/out)
  - visual baseline
  - architecture boundary
  - acceptance criteria
- Work in small increments with explicit done criteria.
- Avoid speculative over-engineering and unnecessary abstractions.
- Reuse existing patterns and dependencies before introducing new ones.
- Summarize command outputs; do not dump long logs unless requested.

## Discussion Style
- Ask focused clarification questions only when ambiguity blocks progress.
- Present trade-offs briefly and recommend one default path.
- After each completed step, update `.pm/progress.md` and `tasks.md`.

## Default Kickoff Behavior
For any new project/task request:
1. Initialize `.pm/` files if missing.
2. Draft concise requirements + scope.
3. Generate Mermaid mind map for discussion.
4. Move to prototype + MVP planning after confirmation.
5. Implement in gated, testable increments.
