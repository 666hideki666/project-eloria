import velgranWalkUrl from "../../../assets/sprites/bosses/velgran/velgran-direction-walk-sheet-v1.png?url";
import velgranAwakeningUrl from "../../../assets/sprites/bosses/velgran/velgran-awakening-body-sheet-v1.png?url";
import velgranStompUrl from "../../../assets/sprites/bosses/velgran/velgran-ganju-tosai-attack-sheet-v1.png?url";
import velgranRootsUrl from "../../../assets/sprites/bosses/velgran/velgran-nebashiri-attack-sheet-v1.png?url";
import velgranShardsUrl from "../../../assets/sprites/bosses/velgran/velgran-shohen-tobashi-attack-sheet-v1.png?url";
import velgranCoreUrl from "../../../assets/sprites/bosses/velgran/velgran-stagger-core-exposed-sheet-v1.png?url";
import velgranCollapseUrl from "../../../assets/sprites/bosses/velgran/velgran-defeat-collapse-sheet-v1.png?url";
import sealStoneUrl from "../../../assets/items/key-items/forest-seal-stone-formation-sheet-v1.png?url";
import arenaBackgroundUrl from "../../../assets/concepts/environments/crystal-dungeon-01/velgran-boss-arena-production-layout-concept-v1.png?url";
import type { VelgranPhase, VelgranSnapshot, WorldSnapshot } from "../../game/types";
import { CRYSTAL_ALTAR, CRYSTAL_ALTAR_BACKDROP_TRANSFORM } from "../../stage/maps/crystalAltarMap";

function loadImage(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const image = new Image();
  image.src = url;
  return image;
}

const bossImage = loadImage(velgranWalkUrl);
const awakeningImage = loadImage(velgranAwakeningUrl);
const stompImage = loadImage(velgranStompUrl);
const rootsImage = loadImage(velgranRootsUrl);
const shardsImage = loadImage(velgranShardsUrl);
const coreImage = loadImage(velgranCoreUrl);
const collapseImage = loadImage(velgranCollapseUrl);
const sealImage = loadImage(sealStoneUrl);
const arenaBackgroundImage = loadImage(arenaBackgroundUrl);

type FrameAnchor = readonly [x: number, footY: number];

// The generated sheets do not share a consistent subject origin inside each
// cell. These authored foot anchors keep every pose planted at boss.pos.
const WALK_ANCHORS: readonly FrameAnchor[] = [
  [308.5, 255], [244.5, 255], [182.5, 254],
  [309.5, 256], [245.5, 256], [178, 256],
  [315, 216], [251, 216], [178.5, 218],
  [306, 194], [242, 194], [167.5, 190],
];

const WALK_QA = (() => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const match = new URLSearchParams(window.location.search).get("bossWalkQa")?.match(/^(left|right)-([0-2])$/);
  if (!match) return null;
  return { row: match[1] === "left" ? 2 : 3, column: Number(match[2]) };
})();
const AWAKENING_QA_FRAME = (() => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get("bossAwakeningQaFrame"));
  return Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;
})();
const CORE_QA_FRAME = (() => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get("bossCoreQaFrame"));
  return Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;
})();
const COLLAPSE_QA_FRAME = (() => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get("bossCollapseQaFrame"));
  return Number.isInteger(value) && value >= 0 && value <= 5 ? value : null;
})();
// Frame 0's atlas cell has a few isolated pixels on its bottom edge. They are
// not Velgran's contact point: the sleeping forepaws and belly actually meet
// the ground at local Y=450. Anchoring to the alpha tail (512) made the
// dormant/awakening pose visibly float above the shared ground shadow.
export const VELGRAN_AWAKENING_ANCHORS: readonly FrameAnchor[] = [
  [278, 450], [270, 454], [204.5, 455], [286.5, 373], [256, 379], [201, 373],
];

export function resolveVelgranAwakeningFrame(
  phase: VelgranPhase,
  phaseTime: number,
  qaFrame: number | null = null,
): number | null {
  // Keep the authored sleeping pose planted through the pre-awakening camera
  // sequence. Awakening then starts from that exact same frame, so neither the
  // body nor its common world-space shadow jumps at a phase boundary.
  if (phase === "dormant" || phase === "introParty" || phase === "introPan") return 0;
  if (phase === "awakening") return qaFrame ?? Math.min(5, Math.floor(phaseTime * 4));
  return null;
}
// Frame 1 contains a small claw fragment from the adjacent authored cell in
// its far-right transparent margin. Trim only that contaminated margin while
// retaining the main paw and the original anchor/scale.
// The source atlas has small pieces of the neighbouring pose at the far-right
// edge of frames 1, 3 and 4. Crop only those transparent-gap-separated pieces;
// keeping the destination scale unchanged preserves the boss foot anchor.
export const VELGRAN_AWAKENING_TRIM_RIGHT: readonly number[] = [0, 32, 0, 42, 74, 0];
const STOMP_ANCHORS: readonly FrameAnchor[] = [
  [217.5, 415], [191, 417], [203, 411], [158.5, 411],
  [208.5, 354], [188, 378], [173, 378], [162.5, 375],
];
const ROOTS_ANCHORS: readonly FrameAnchor[] = [
  [307.5, 459], [252.5, 452], [204.5, 477], [304, 412], [255.5, 378], [203.5, 396],
];
const SHARDS_ANCHORS: readonly FrameAnchor[] = [
  [306.5, 447], [255, 443], [209, 443], [277, 386], [249.5, 384], [208.5, 391],
];
const CORE_ANCHORS: readonly FrameAnchor[] = [
  [290, 431], [265.5, 469], [214.5, 473], [279, 385], [240, 385], [218, 387],
];
// Core-exposure frame 1 contains a disconnected claw copied into the final
// 24 pixels of its atlas cell. The authored boss ends at x=421, so removing
// that isolated margin preserves every claw attached to the body.
export const VELGRAN_CORE_TRIM_RIGHT: readonly number[] = [0, 24, 0, 0, 0, 0];
const COLLAPSE_ANCHORS: readonly FrameAnchor[] = [
  [287.5, 446], [275.5, 449], [197.5, 450], [271, 344], [270.5, 348], [206.5, 348],
];
// The collapse atlas has the same adjacent-cell contamination in frames 1
// and 4. Keep the actual body/paws and discard only the separated edge pieces.
export const VELGRAN_COLLAPSE_TRIM_RIGHT: readonly number[] = [0, 6, 0, 0, 20, 0];

export function drawCrystalAltarBackground(context: CanvasRenderingContext2D, _snapshot: WorldSnapshot): void {
  const rect = CRYSTAL_ALTAR_BACKDROP_TRANSFORM.worldRect;
  if (!arenaBackgroundImage?.complete || arenaBackgroundImage.naturalWidth <= 0) {
    context.fillStyle = "#020a08";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    return;
  }
  context.drawImage(arenaBackgroundImage, rect.x, rect.y, rect.width, rect.height);
}

export function drawVelgranBackEffects(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  const boss = snapshot.velgran;
  if (!boss) return;
  // Hazards remain in the combat snapshot for hit detection, but are not
  // rendered as range guides. Velgran's authored motion is the attack cue.
  for (const shot of boss.crystalProjectiles) {
    if (!shot.active) continue;
    context.save();
    context.translate(shot.pos.x, shot.pos.y);
    context.rotate(snapshot.time * 7 + shot.id);
    context.fillStyle = "#7ef2dd";
    context.strokeStyle = "#ddfff6";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -9);
    context.lineTo(6, 0);
    context.lineTo(0, 9);
    context.lineTo(-6, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
  if (boss.attack === "forestRing") {
    const windup = 1;
    const duration = 0.75;
    if (boss.attackTime < windup) {
      const charge = Math.min(1, boss.attackTime / windup);
      context.save();
      context.translate(Math.round(boss.pos.x), Math.round(boss.pos.y - 28));
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI * 0.25 + snapshot.time * 1.7;
        const radius = 30 - charge * 17 + (index % 2) * 4;
        const x = Math.round(Math.cos(angle) * radius);
        const y = Math.round(Math.sin(angle) * radius * 0.62);
        context.fillStyle = index % 2 === 0 ? "rgba(119,244,216,0.78)" : "rgba(210,255,244,0.7)";
        context.fillRect(x - 2, y - 2, 4, 4);
      }
      context.restore();
    } else if (boss.attackTime <= windup + duration) {
      const progress = Math.min(1, (boss.attackTime - windup) / duration);
      const radius = 45 + (260 - 45) * progress;
      const alpha = 0.95 - progress * 0.34;
      context.save();
      context.translate(Math.round(boss.pos.x), Math.round(boss.pos.y));
      context.lineCap = "butt";
      context.strokeStyle = `rgba(22,78,69,${alpha * 0.8})`;
      context.lineWidth = 8;
      context.beginPath();
      context.ellipse(0, 0, radius, radius * 0.62, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(75,221,193,${alpha})`;
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(0, 0, radius, radius * 0.62, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(222,255,246,${alpha * 0.9})`;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(0, 0, radius - 4, Math.max(1, radius * 0.62 - 3), 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  } else if (boss.attack === "repel") {
    const windup = 0.5;
    if (boss.attackTime < windup) {
      const charge = Math.min(1, boss.attackTime / windup);
      context.save();
      context.translate(Math.round(boss.pos.x), Math.round(boss.pos.y - 29));
      for (let index = 0; index < 6; index += 1) {
        const angle = index * Math.PI / 3 + snapshot.time * 2.2;
        const radius = 24 - charge * 12 + (index % 2) * 3;
        context.fillStyle = index % 2 === 0 ? "#68dbc5" : "#c7fff1";
        context.fillRect(
          Math.round(Math.cos(angle) * radius) - 1,
          Math.round(Math.sin(angle) * radius * 0.62) - 1,
          3,
          3,
        );
      }
      context.restore();
    } else if (boss.attackTime < windup + 0.22) {
      const progress = (boss.attackTime - windup) / 0.22;
      const radius = 28 + progress * 64;
      context.save();
      context.translate(Math.round(boss.pos.x), Math.round(boss.pos.y));
      context.lineCap = "butt";
      context.strokeStyle = `rgba(38,105,91,${0.72 - progress * 0.4})`;
      context.lineWidth = Math.max(2, 7 - progress * 4);
      context.beginPath();
      context.ellipse(0, 0, radius, radius * 0.62, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(126,239,216,${0.9 - progress * 0.52})`;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(0, 0, radius - 3, Math.max(1, radius * 0.62 - 2), 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }
}

export function drawVelgran(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  const boss = snapshot.velgran;
  if (!boss || boss.phase === "inactive" || boss.phase === "cleared") return;
  const dormant = boss.phase === "dormant";
  const collapsed = boss.phase === "defeatStagger" || boss.phase === "calming" || boss.phase === "sealForming" || boss.phase === "sealReady" || boss.phase === "blessing";
  const row = WALK_QA?.row ?? (boss.facing.y > 0.38 ? 0 : boss.facing.y < -0.38 ? 1 : boss.facing.x < 0 ? 2 : 3);
  const column = WALK_QA?.column ?? (boss.moving ? Math.floor(boss.moveTime * 5) % 3 : 1);
  const walkFrame = boss.phase === "peaceful" ? 1 : row * 3 + (dormant || collapsed ? 1 : column);
  const actionFrame = boss.attack
    ? boss.attack === "forestRing"
      ? boss.attackTime < 0.45 ? 0 : boss.attackTime < 0.82 ? 1 : boss.attackTime < 1 ? 2 : boss.attackTime < 1.32 ? 3 : boss.attackTime < 1.65 ? 4 : 5
      : boss.attack === "repel"
        ? boss.attackTime < 0.2 ? 0 : boss.attackTime < 0.5 ? 1 : boss.attackTime < 0.68 ? 3 : 4
      : Math.min((boss.attack === "stomp" ? 8 : 6) - 1, Math.floor(boss.attackTime * 6))
    : 0;
  const collapseFrame = boss.phase === "defeatStagger"
    ? COLLAPSE_QA_FRAME ?? Math.min(5, Math.floor(boss.phaseTime * 4))
    : 5;
  const awakeningFrame = resolveVelgranAwakeningFrame(boss.phase, boss.phaseTime, AWAKENING_QA_FRAME);
  const shadow = velgranShadowProfile(boss, collapsed);
  context.save();
  context.translate(Math.round(boss.pos.x), Math.round(boss.pos.y));
  context.fillStyle = `rgba(0,0,0,${shadow.alpha})`;
  context.beginPath();
  context.ellipse(0, 0, shadow.radiusX, shadow.radiusY, 0, 0, Math.PI * 2);
  context.fill();
  if (boss.hurtFlash > 0) context.globalAlpha = 0.45;
  const actionImage = boss.attack === "stomp" ? stompImage : boss.attack === "roots" ? rootsImage : boss.attack === "shards" || boss.attack === "forestRing" || boss.attack === "repel" ? shardsImage : null;
  if (WALK_QA && drawAnchoredSequenceSheet(context, bossImage, 3, 4, walkFrame, 192, 96, WALK_ANCHORS)) {
    // DEV-only fixed-frame QA for the two asymmetric side rows.
  } else if (awakeningFrame !== null && drawAnchoredSequenceSheet(
    context,
    awakeningImage,
    3,
    2,
    awakeningFrame,
    200,
    132,
    VELGRAN_AWAKENING_ANCHORS,
    VELGRAN_AWAKENING_TRIM_RIGHT,
  )) {
    // Authored awakening sequence.
  } else if (boss.phase === "coreExposed" && drawAnchoredSequenceSheet(
    context,
    coreImage,
    3,
    2,
    CORE_QA_FRAME ?? Math.floor(boss.phaseTime * 6) % 6,
    200,
    132,
    CORE_ANCHORS,
    VELGRAN_CORE_TRIM_RIGHT,
  )) {
    // Authored armor-break/core exposure sequence.
  } else if (collapsed && drawAnchoredSequenceSheet(
    context,
    collapseImage,
    3,
    2,
    collapseFrame,
    200,
    132,
    COLLAPSE_ANCHORS,
    VELGRAN_COLLAPSE_TRIM_RIGHT,
  )) {
    // Play the collapse once, then hold its final grounded frame through every
    // post-defeat phase instead of restarting when phaseTime resets.
  } else if (actionImage && drawAnchoredSequenceSheet(
    context,
    actionImage,
    boss.attack === "stomp" ? 4 : 3,
    2,
    actionFrame,
    200,
    132,
    boss.attack === "stomp" ? STOMP_ANCHORS : boss.attack === "roots" ? ROOTS_ANCHORS : SHARDS_ANCHORS,
  )) {
    // Authored attack sequence.
  } else if (drawAnchoredSequenceSheet(context, bossImage, 3, 4, walkFrame, 192, 96, WALK_ANCHORS)) {
    // The center frame is a true idle pose; walking advances only while moving.
  } else {
    context.fillStyle = "#577140";
    context.fillRect(-34, -54, 68, 58);
    context.fillStyle = "#70ead4";
    context.fillRect(-10, -28, 20, 22);
  }
  if (boss.phase === "coreExposed") {
    context.globalAlpha = 0.42 + Math.sin(snapshot.time * 13) * 0.15;
    context.fillStyle = "#8cfff0";
    context.beginPath();
    context.arc(0, -27, 20, 0, Math.PI * 2);
    context.fill();
  }
  if (boss.attack === "forestRing") {
    const charge = boss.attackTime < 1 ? boss.attackTime : Math.max(0, 1.75 - boss.attackTime);
    context.globalAlpha = Math.min(0.82, 0.28 + charge * 0.54);
    context.fillStyle = boss.attackTime >= 1 ? "#dffff5" : "#72e9ce";
    context.beginPath();
    context.moveTo(0, -43);
    context.lineTo(12, -29);
    context.lineTo(0, -16);
    context.lineTo(-12, -29);
    context.closePath();
    context.fill();
  } else if (boss.attack === "repel") {
    const charge = boss.attackTime < 0.5
      ? boss.attackTime / 0.5
      : Math.max(0, 1 - (boss.attackTime - 0.5) / 0.42);
    context.globalAlpha = Math.min(0.88, 0.3 + charge * 0.58);
    context.fillStyle = boss.attackTime >= 0.5 ? "#d8fff4" : "#6ce1ca";
    context.beginPath();
    context.moveTo(0, -42);
    context.lineTo(11, -29);
    context.lineTo(0, -17);
    context.lineTo(-11, -29);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function velgranShadowProfile(
  boss: VelgranSnapshot,
  collapsed: boolean,
): { radiusX: number; radiusY: number; alpha: number } {
  if (collapsed) return { radiusX: 54, radiusY: 10, alpha: 0.3 };
  if (boss.phase === "awakening") return { radiusX: 47, radiusY: 9, alpha: 0.42 };
  if (boss.phase === "coreExposed" || boss.phase === "recovering") return { radiusX: 46, radiusY: 9, alpha: 0.42 };
  if (boss.attack === "stomp") return { radiusX: 49, radiusY: 10, alpha: 0.45 };
  if (boss.attack) return { radiusX: 45, radiusY: 9, alpha: 0.44 };
  return { radiusX: 43, radiusY: 9, alpha: 0.43 };
}

function drawAnchoredSequenceSheet(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  columns: number,
  rows: number,
  frame: number,
  width: number,
  height: number,
  anchors: readonly FrameAnchor[],
  trimRightByFrame: readonly number[] = [],
): boolean {
  if (!image?.complete || image.naturalWidth <= 0) return false;
  const total = columns * rows;
  const normalizedFrame = Math.max(0, Math.min(total - 1, frame));
  const cellWidth = image.naturalWidth / columns;
  const cellHeight = image.naturalHeight / rows;
  const anchor = anchors[normalizedFrame] ?? [cellWidth / 2, cellHeight];
  const scaleX = width / cellWidth;
  const sourceWidth = resolveVelgranFrameSourceWidth(cellWidth, normalizedFrame, trimRightByFrame);
  const dx = -anchor[0] * scaleX;
  const dy = 4 - anchor[1] * (height / cellHeight);
  context.drawImage(
    image,
    (normalizedFrame % columns) * cellWidth,
    Math.floor(normalizedFrame / columns) * cellHeight,
    sourceWidth,
    cellHeight,
    dx,
    dy,
    sourceWidth * scaleX,
    height,
  );
  return true;
}

export function resolveVelgranFrameSourceWidth(
  cellWidth: number,
  frame: number,
  trimRightByFrame: readonly number[] = [],
): number {
  const trimRight = Math.max(0, Math.min(cellWidth - 1, trimRightByFrame[frame] ?? 0));
  return cellWidth - trimRight;
}

// Source-space centers of the forming roots/crystal. Loose particles in the
// first two frames are not used to anchor the finished object.
const SEAL_STONE_FRAME_CENTER_X = [256, 250, 206, 285, 247, 198] as const;
const SEAL_STONE_BASE_Y = 372;
const SEAL_STONE_DRAW_WIDTH = 144;
const SEAL_STONE_DRAW_HEIGHT = 96;
const SEAL_STONE_CELL_SIZE = 512;

export function sealStoneFrameDrawRect(frame: number, position: { x: number; y: number }): {
  x: number; y: number; width: number; height: number;
} {
  const centerX = SEAL_STONE_FRAME_CENTER_X[frame] ?? SEAL_STONE_FRAME_CENTER_X[5];
  return {
    x: position.x - centerX * SEAL_STONE_DRAW_WIDTH / SEAL_STONE_CELL_SIZE,
    y: position.y - SEAL_STONE_BASE_Y * SEAL_STONE_DRAW_HEIGHT / SEAL_STONE_CELL_SIZE,
    width: SEAL_STONE_DRAW_WIDTH,
    height: SEAL_STONE_DRAW_HEIGHT,
  };
}

export function drawCrystalAltarForeground(context: CanvasRenderingContext2D, snapshot: WorldSnapshot): void {
  const boss = snapshot.velgran;
  if (!boss?.sealStoneVisible) return;
  const p = CRYSTAL_ALTAR.sealStone;
  const frame = boss.phase === "sealForming" ? Math.min(4, Math.floor(boss.phaseTime * 4)) : 5;
  context.save();
  context.globalAlpha = boss.phase === "sealForming" ? Math.min(1, 0.35 + boss.phaseTime) : 1;
  if (sealImage?.complete && sealImage.naturalWidth > 0) {
    const cellWidth = sealImage.naturalWidth / 3;
    const cellHeight = sealImage.naturalHeight / 2;
    const rect = sealStoneFrameDrawRect(frame, p);
    context.drawImage(sealImage, (frame % 3) * cellWidth, Math.floor(frame / 3) * cellHeight, cellWidth, cellHeight, rect.x, rect.y, rect.width, rect.height);
  } else {
    context.fillStyle = "#8affdf";
    context.beginPath();
    context.moveTo(p.x, p.y - 28);
    context.lineTo(p.x + 14, p.y);
    context.lineTo(p.x, p.y + 28);
    context.lineTo(p.x - 14, p.y);
    context.closePath();
    context.fill();
  }
  context.restore();
}
