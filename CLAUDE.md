# AgentBoardroom — start here

This repo builds and maintains the **Sector Rotation Terminal**, a single-page claude.ai
Artifact (https://claude.ai/artifact/JBivgL88qHWeaCSsepr7cN), plus a set of RealTest scripts
that feed it data and cross-check its own math.

**Before doing anything else in this repo:**

1. Read `docs/PROJECT_KNOWLEDGE_BASE.md` — architecture, tab inventory, the Ask-engine
   internals, RealTest data flow (both directions), what's open, and known gotchas. It exists
   specifically so you don't need to read the ~29,000-line live page to get oriented.
2. Load the `sector-terminal` skill (`.claude/skills/sector-terminal/SKILL.md`) before making
   *any* change to the terminal page itself — it has the required scratchpad setup, the
   regression-test recipe, and the publish/commit checklist. Skipping it risks silently
   breaking an existing Ask-engine question.
3. `docs/FINAL_HANDOFF_*.txt` is an archival, chronological session log — read the newest one
   for blow-by-blow detail on the most recent change, but treat the knowledge-base file above
   as the working reference, not these.

**Never edit `artifact/base/orig.html` directly.** Every feature is an additive JS layer under
`artifact/layers/`, concatenated by `artifact/layers/splice81.py`. See the knowledge-base file,
section 4, for why and how.
