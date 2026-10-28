import lightwingBackdropUrl from "../../../assets/concepts/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-full-map-concept-v3.png?url";
import lightwingBridgeLayerUrl from "../../../assets/environments/lightwing-crystal-cavern/lightwing-crystal-bridge-layer-v2.png?url";
import lightwingUnlockCrystalUrl from "../../../assets/environments/lightwing-crystal-cavern/lightwing-unlock-crystal-v1.png?url";
import type { WorldSnapshot } from "../../game/types";
import {
  LIGHTWING_BACKDROP_TRANSFORM,
  LIGHTWING_CRYSTAL_CAVERN,
  lightwingWorldToSource,
} from "../../stage/maps/lightwingCrystalCavernMap";

const backdrop = typeof Image === "undefined" ? null : new Image();
const bridgeLayer = typeof Image === "undefined" ? null : new Image();
const unlockCrystal = typeof Image === "undefined" ? null : new Image();
if (backdrop) {
  backdrop.decoding = "async";
  backdrop.src = lightwingBackdropUrl;
}
if (bridgeLayer) {
  bridgeLayer.decoding = "async";
  bridgeLayer.src = lightwingBridgeLayerUrl;
}
if (unlockCrystal) {
  unlockCrystal.decoding = "async";
  unlockCrystal.src = lightwingUnlockCrystalUrl;
}

const BRIDGE_START = 800;
const BRIDGE_END = 1170;

function drawCrystal(context: CanvasRenderingContext2D, x: number, y: number, active: boolean, time: number): void {
  context.save();
  if (unlockCrystal?.complete && unlockCrystal.naturalWidth > 0) {
    context.imageSmoothingEnabled = false;
    context.filter = active ? "none" : "brightness(0.7) saturate(0.72)";
    context.drawImage(unlockCrystal, x - 55, y - 105, 110, 125);
    context.filter = "none";
    if (active) {
      context.globalAlpha = 0.12 + Math.sin(time * 4) * 0.035;
      context.fillStyle = "#a6f4ff";
      context.beginPath(); context.arc(x, y - 35, 42, 0, Math.PI * 2); context.fill();
    }
    context.restore();
    return;
  }
  context.translate(x, y);
  context.fillStyle = "#273348";
  context.beginPath(); context.ellipse(0, 11, 21, 10, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#546779";
  context.fillRect(-15, 5, 30, 5);
  context.fillStyle = active ? "#67dbf5" : "#4289bc";
  context.beginPath();
  context.moveTo(0, -36); context.lineTo(11, -18); context.lineTo(8, 5);
  context.lineTo(-7, 5); context.lineTo(-11, -17); context.closePath(); context.fill();
  context.fillStyle = active ? "#d2ffff" : "#9dd9ee";
  context.beginPath(); context.moveTo(0, -32); context.lineTo(2, -19);
  context.lineTo(1, 1); context.lineTo(-2, 0); context.closePath(); context.fill();
  context.fillStyle = active ? "#78dbff" : "#3554aa";
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 14, -17); context.lineTo(side * 19, -8);
    context.lineTo(side * 16, 5); context.lineTo(side * 11, 3);
    context.closePath(); context.fill();
  }
  if (active) {
    context.globalAlpha = 0.17 + Math.sin(time * 4) * 0.05;
    context.fillStyle = "#a6f4ff";
    context.beginPath(); context.arc(0, -11, 31, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function drawBridgeSegment(context: CanvasRenderingContext2D, from: number, to: number, lift: number): void {
  if (lift <= 0 || !bridgeLayer?.complete || bridgeLayer.naturalWidth !== 1638 || bridgeLayer.naturalHeight !== 960) return;
  context.save();
  context.globalAlpha = Math.min(1, lift * 1.4);
  context.translate(0, Math.round((1 - lift) * 25));
  context.imageSmoothingEnabled = false;
  context.drawImage(bridgeLayer, from, 340, to - from, 140, from, 340, to - from, 140);
  context.restore();
}

function drawBridge(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  const progress = snapshot.crystalPathUnlocked ? 1 : snapshot.crystalPathAnimationProgress;
  if (progress <= 0) return;
  const stage = progress * 5;
  const width = (BRIDGE_END - BRIDGE_START + 1) / 5;
  context.save();
  context.scale(
    LIGHTWING_BACKDROP_TRANSFORM.worldRect.width / LIGHTWING_BACKDROP_TRANSFORM.sourceWidth,
    LIGHTWING_BACKDROP_TRANSFORM.worldRect.height / LIGHTWING_BACKDROP_TRANSFORM.sourceHeight,
  );
  for (let index = 0; index < 5; index += 1) {
    const lift = Math.max(0, Math.min(1, stage - index));
    const from = Math.round(BRIDGE_START + width * index);
    const to = index === 4 ? BRIDGE_END + 1 : Math.round(BRIDGE_START + width * (index + 1));
    drawBridgeSegment(context, from, to, lift);
  }
  context.restore();
}

export function drawLightwingCrystalCavernBackground(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  context.fillStyle = "#030b1e";
  context.fillRect(0, 0, LIGHTWING_CRYSTAL_CAVERN.width, LIGHTWING_CRYSTAL_CAVERN.height);
  if (backdrop?.complete && backdrop.naturalWidth === 1638 && backdrop.naturalHeight === 960) {
    context.imageSmoothingEnabled = false;
    context.drawImage(backdrop, 0, 0, LIGHTWING_CRYSTAL_CAVERN.width, LIGHTWING_CRYSTAL_CAVERN.height);
  }
  drawBridge(context, snapshot);
  const spring = LIGHTWING_CRYSTAL_CAVERN.spring;
  if (snapshot.healingSpringPhase !== "idle") {
    context.strokeStyle = `rgba(139,247,255,${0.27 + snapshot.healingSpringProgress * 0.35})`;
    context.lineWidth = 3;
    context.beginPath(); context.ellipse(spring.x, spring.y + 14, 54, 24, 0, 0, Math.PI * 2); context.stroke();
  }
}

/** The stone bases, rather than the tall crystal tips, set draw order. */
export function lightwingCrystalDepthObjects(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): readonly { y: number; draw: () => void }[] {
  const primary = LIGHTWING_CRYSTAL_CAVERN.primaryCrystal;
  const secondary = LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal;
  return [
    {
      y: primary.y + 16,
      draw: () => drawCrystal(context, primary.x, primary.y, snapshot.primaryCrystalActivated, snapshot.time),
    },
    {
      y: secondary.y + 16,
      draw: () => drawCrystal(context, secondary.x, secondary.y, snapshot.secondaryCrystalActivated, snapshot.time),
    },
  ];
}

export function drawLightwingCrystalCavernEntities(_context: CanvasRenderingContext2D, _snapshot: WorldSnapshot): void {}

export function lightwingCrystalSanctuaryDepthY(): number {
  return LIGHTWING_CRYSTAL_CAVERN.spring.y + 35;
}

export function drawLightwingCrystalCavernSanctuaryForegroundEdge(_context: CanvasRenderingContext2D, _snapshot: WorldSnapshot): void {}
export function drawLightwingCrystalCavernForeground(_context: CanvasRenderingContext2D, _snapshot: WorldSnapshot): void {}

export function lightwingTerrainVariant(column: number, row: number): number {
  return (column * 13 + row * 17) & 3;
}

/** Used by image-alignment QA to inspect visual and collision positions. */
export function lightwingBackdropPoint(point: { x: number; y: number }): { x: number; y: number } {
  return lightwingWorldToSource(point);
}
