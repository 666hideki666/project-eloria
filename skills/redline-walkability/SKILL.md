---
name: redline-walkability
description: Build or review walkable areas for image-based game maps when the user marks the intended floor boundary in red. Use for redline-to-mask handoff, navigation collision, and route QA; not for maps without a user-authored boundary.
---

# Redline walkability

Use the user's marked image as the authority for **static walkable floor**, not material recognition or visually plausible shortcuts. An enclosed red region may contain stone, moss, stairs, or other textures. Preserve the unmarked exterior as blocked. If the outline is open, ambiguous, excludes a required landmark, or creates a suspiciously thin passage, show the location and ask before inventing geometry. Dynamic doors or puzzle blockers, when requested, are a separate layer over the static floor mask.

1. Confirm the final background image and the redlined version share the same native dimensions and alignment. Extract the red boundary, flood-fill the intended inside, and inspect a mask overlay at native scale. Do not silently widen or reconnect the user's trace.
2. In an oblique/top-down view, treat the actor's **ground-contact point** as the navigation anchor unless the user specifies another footprint. Sprite torso, shadow, and rendered shoes may overhang the floor edge. Keep combat, hit, and interaction radii independent of navigation.
3. Check the full movement segment against the mask, not only its endpoint. A short step, dash, knockback, warp, or diagonal slide must not tunnel across a thin blocked strip. Use source-pixel-aware traversal or equivalently reliable sweep logic.
4. Validate both positive and negative behavior: spawn-to-landmark routes, narrow necks, actual runtime movement, interactions at destinations, and attempts to cross red lines, voids, or image bounds. A graph route through the binary mask alone does not prove runtime traversal.
5. Hand off an overlay, coordinate-specific problem spots, tests, and any unresolved ambiguity. Keep image-review/instruction work separate from code implementation when the user's workflow requires approval or a dedicated implementation task.

For Project Eloria, also read `docs/map-walkability-redline-handoff.md` in that project before planning another layer. It records the successful Layer 1 implementation and task boundaries; do not assume its asset dimensions apply to a new map.
