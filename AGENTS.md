# Project Eloria: map creation workflow

For the proven rationale, handoff checklist, and Layer 1 reference implementation, read `docs/map-walkability-redline-handoff.md` when planning or implementing a new image-based map.

The user-approved workflow for this game's maps, including layer 2 and later, is:

1. Create and review the background map image first. Do not infer walkability from stone texture, moss, stairs, lighting, or apparent floor materials alone.
2. Ask the user to trace the intended walkable boundary in red on that image. The user-authored red outline is the source of truth: its enclosed region is walkable, including stone, moss, and stairs; outside it is not. Do not redraw, widen, or connect passages without the user's approval.
3. Align the red outline and collision mask to the background's native image coordinates. Show an overlay for visual review when useful.
4. For top-down/oblique walking, test only the actor's ground-contact point (`pos`) against the walkable mask. The sprite's upper body, shadow, or rendered shoes may visually overlap outside the floor boundary. Keep combat/hit radii separate from navigation.
5. Check the entire movement segment against the mask so a fast or diagonal move cannot jump over a thin blocked strip. Apply this to player, followers, enemies, knockback, scripted movement, and warps as relevant.
6. Verify real movement from spawn through narrow corridors to required landmarks and interactions, plus rejection of outside/abyss points. A center-point route existing in the mask is not enough without runtime movement verification.

Workflow separation: the `work | エロリア2` task handles image review/generation and implementation instructions. Code changes belong in `コード実装 | エロリア2` after explicit user approval for that implementation. When proposing an implementation, present the recommended Codex model; the user prefers Sol High over Astra when sufficient.

Read `docs/project-handoff.md` at the start of project work. Keep it current when the user confirms a direction, approves an instruction sheet, implementation or verification finishes, or a new unresolved issue appears. Distinguish proposed, approved, in-progress, and verified work; never record an unverified implementation as complete.
