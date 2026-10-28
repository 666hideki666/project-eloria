import forestBackdropUrl from "../../../assets/concepts/environments/star-circling-forest-intro-map-redline-base-v1.png?url";
import type { WorldSnapshot } from "../../game/types";
import { ANCIENT_FOREST, ANCIENT_FOREST_BACKDROP_TRANSFORM } from "../../stage/maps/ancientForestMap";

const backdrop = typeof Image === "undefined" ? null : new Image();
if (backdrop) {
  backdrop.decoding = "async";
  backdrop.src = forestBackdropUrl;
}

export function drawAncientForestBackground(context: CanvasRenderingContext2D, _snapshot: WorldSnapshot): void {
  if (!backdrop?.complete ||
    backdrop.naturalWidth !== ANCIENT_FOREST_BACKDROP_TRANSFORM.sourceWidth ||
    backdrop.naturalHeight !== ANCIENT_FOREST_BACKDROP_TRANSFORM.sourceHeight) return;
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(backdrop,
    0, 0, ANCIENT_FOREST_BACKDROP_TRANSFORM.sourceWidth, ANCIENT_FOREST_BACKDROP_TRANSFORM.sourceHeight,
    0, 0, ANCIENT_FOREST.width, ANCIENT_FOREST.height);
  context.restore();
}
