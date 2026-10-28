/**
 * Presentation-only grounding values for party members.
 * These values never affect world positions, formation slots, or collisions.
 */
export const CHARACTER_GROUNDING = {
  shadow: {
    color: "#020807",
    opacity: 0.25,
    standing: {
      radiusX: 8,
      radiusY: 2.5,
      offsetY: 9,
    },
    downed: {
      radiusX: 9,
      radiusY: 3,
      offsetY: 6,
    },
  },
} as const;
