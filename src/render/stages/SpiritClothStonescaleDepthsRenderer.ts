import depthsBackdropUrl from "../../../assets/concepts/environments/spirit-cloth-stonescale-depths/spirit-cloth-stonescale-depths-full-map-concept-v2.png?url";
import spiritLampSteleUrl from "../../../assets/concepts/environments/spirit-cloth-stonescale-depths/landmarks/spirit-lamp-stele-concept-v1.png?url";
import stoneWedgeSteleUrl from "../../../assets/concepts/environments/spirit-cloth-stonescale-depths/landmarks/stone-wedge-stele-concept-v1.png?url";
import restorationCrystalUrl from "../../../assets/concepts/environments/spirit-cloth-stonescale-depths/landmarks/preboss-restoration-crystal-concept-v1.png?url";
import type { WorldSnapshot } from "../../game/types";
import {
  DEPTHS_BACKDROP_TRANSFORM,
  SPIRIT_CLOTH_STONESCALE_DEPTHS,
} from "../../stage/maps/spiritClothStonescaleDepthsMap";

const backdrop = typeof Image === "undefined" ? null : new Image();
if (backdrop) {
  backdrop.decoding = "async";
  backdrop.src = depthsBackdropUrl;
}

function loadStele(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image;
}

const spiritLampStele = loadStele(spiritLampSteleUrl);
const stoneWedgeStele = loadStele(stoneWedgeSteleUrl);
const restorationCrystal = loadStele(restorationCrystalUrl);

const SCALE = SPIRIT_CLOTH_STONESCALE_DEPTHS.width / DEPTHS_BACKDROP_TRANSFORM.sourceWidth;

/** Reveal the north walkway beneath the door lintel using native source pixels. */
function drawOpenedGatePatch(context: CanvasRenderingContext2D, progress: number): void {
  if (!backdrop?.complete || backdrop.naturalWidth !== 1638 || backdrop.naturalHeight !== 960) return;
  const exposed = Math.floor(120 * Math.max(0, Math.min(1, progress)));
  if (exposed <= 0) return;
  // The slab occupies x=780..897, y=220..323; its cast shadow continues to
  // y=339. Cover both so the north-side floor joins the walkway below it.
  const sourceY = 80 + 120 - exposed;
  const targetY = 220 + 120 - exposed;
  context.drawImage(backdrop, 780, sourceY, 118, exposed,
    780 * SCALE, targetY * SCALE, 118 * SCALE, exposed * SCALE);
}

const STELE_SOURCE = { x: 270, y: 0, width: 670, height: 1275 } as const;

function drawStele(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  foot: { x: number; y: number },
  height: number,
  active: boolean,
  glow: string,
): void {
  if (!image?.complete || image.naturalWidth !== 1205 || image.naturalHeight !== 1306) return;
  const width = height * STELE_SOURCE.width / STELE_SOURCE.height;
  const top = Math.round(foot.y + 14 - height);
  context.save();
  context.imageSmoothingEnabled = false;
  if (active) {
    const aura = context.createRadialGradient(foot.x, top + height * 0.27, 2, foot.x, top + height * 0.27, 34);
    aura.addColorStop(0, glow);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = aura;
    context.fillRect(foot.x - 34, top + height * 0.27 - 34, 68, 68);
  }
  // The approved PNG is unchanged. Crop only its transparent canvas margin.
  context.filter = active ? "brightness(1.08) saturate(1.12)" : "brightness(0.58) saturate(0.72)";
  context.drawImage(image,
    STELE_SOURCE.x, STELE_SOURCE.y, STELE_SOURCE.width, STELE_SOURCE.height,
    Math.round(foot.x - width / 2), top, Math.round(width), Math.round(height));
  context.restore();
}

function drawRestorationCrystal(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  if (!restorationCrystal?.complete || restorationCrystal.naturalWidth !== 1310 || restorationCrystal.naturalHeight !== 1201) return;
  const foot = SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal;
  const source = { x: 70, y: 40, width: 1185, height: 1145 };
  const height = 52;
  const width = height * source.width / source.height;
  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = "rgba(4,19,27,0.28)";
  context.beginPath();
  context.ellipse(foot.x, foot.y + 6, 17, 5, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.93 + 0.07 * Math.sin(snapshot.time * 2.6);
  context.drawImage(restorationCrystal,
    source.x, source.y, source.width, source.height,
    Math.round(foot.x - width / 2), Math.round(foot.y + 11 - height),
    Math.round(width), height);
  context.restore();
}

/** Stone bases share the actor y-sort; the tall tops never set depth. */
export function spiritClothStonescaleDepthObjects(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): readonly { y: number; draw: () => void }[] {
  const { spiritLamp, stoneWedge, restorationCrystal: crystal } = SPIRIT_CLOTH_STONESCALE_DEPTHS;
  return [
    {
      y: spiritLamp.y + 10,
      draw: () => drawStele(context, spiritLampStele, spiritLamp, 96, snapshot.spiritLampActivated, "rgba(106,105,246,0.44)"),
    },
    {
      y: stoneWedge.y + 10,
      draw: () => drawStele(context, stoneWedgeStele, stoneWedge, 100, snapshot.stoneWedgeActivated, "rgba(255,171,53,0.40)"),
    },
    {
      y: crystal.y + 6,
      draw: () => drawRestorationCrystal(context, snapshot),
    },
  ];
}

export function drawSpiritClothStonescaleDepthsBackground(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  if (!backdrop?.complete || backdrop.naturalWidth !== 1638 || backdrop.naturalHeight !== 960) return;
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(backdrop, 0, 0, 1638, 960,
    0, 0, SPIRIT_CLOTH_STONESCALE_DEPTHS.width, SPIRIT_CLOTH_STONESCALE_DEPTHS.height);
  drawOpenedGatePatch(context, snapshot.depthsCentralGateOpenProgress);
  context.restore();
}

export function drawSpiritClothStonescaleDepthsForeground(_context: CanvasRenderingContext2D, _snapshot: WorldSnapshot): void {
  // The accepted v2 image already contains the parapets and stair foreground.
}
