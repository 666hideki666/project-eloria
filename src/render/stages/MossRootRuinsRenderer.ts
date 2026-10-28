import mossRootBackdropUrl from "../../../assets/environments/moss-root-ruins/moss-root-ruins-background-v2.png?url";
import mossRootSealUrl from "../../../assets/environments/moss-root-ruins/landmarks/moss-root-seal-v1.png?url";
import mossRootUnlockCrystalUrl from "../../../assets/environments/moss-root-ruins/landmarks/moss-root-unlock-crystal-v1.png?url";
import { hash2d } from "../../game/math";
import type { WorldSnapshot } from "../../game/types";
import {
  MOSS_ROOT_LANDMARKS,
  MOSS_ROOT_BACKDROP_TRANSFORM,
  MOSS_ROOT_GATE_TRANSFORM,
  mossRootBackdropSourceToWorld,
  mossRootBackdropWorldToSource,
  MOSS_ROOT_RUINS,
  MOSS_ROOT_ENCOUNTERS,
  MOSS_ROOT_NAV_BLOCKERS,
  MOSS_ROOT_NAV_MASK_ROWS,
  MOSS_ROOT_SOLID_PROPS,
  tileAt,
  type MossRootTile,
} from "../../stage/maps/mossRootRuinsMap";

export const MOSS_ROOT_BACKDROP_META = {
  sourceWidth: MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth,
  sourceHeight: MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight,
  worldWidth: MOSS_ROOT_BACKDROP_TRANSFORM.worldRect.width,
  worldHeight: MOSS_ROOT_BACKDROP_TRANSFORM.worldRect.height,
} as const;

function loadMossRootBackdrop(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image;
}

const mossRootBackdrop = loadMossRootBackdrop(mossRootBackdropUrl);
const mossRootSeal = loadMossRootBackdrop(mossRootSealUrl);
const mossRootUnlockCrystal = loadMossRootBackdrop(mossRootUnlockCrystalUrl);

function mossRootBackdropReady(): boolean {
  return Boolean(mossRootBackdrop?.complete && mossRootBackdrop.naturalWidth > 0);
}

function mossRootSealReady(): boolean {
  return Boolean(mossRootSeal?.complete && mossRootSeal.naturalWidth > 0);
}

export const MOSS_PALETTE = {
  voidDeep: "#010706",
  voidMid: "#071813",
  floorShadow: "#0d1d19",
  floorBase: "#202f28",
  floorLight: "#59634c",
  stoneDark: "#14231f",
  stoneBase: "#34463b",
  stoneLight: "#68715a",
  mossDark: "#24371f",
  mossBase: "#4b5d2b",
  mossLight: "#768548",
  rootDark: "#2b2015",
  rootBase: "#4b351f",
  rootLight: "#725332",
  waterDeep: "#052421",
  waterBase: "#0b4844",
  waterLight: "#25877e",
  crystalBase: "#28aaa0",
  crystalLight: "#a8f3e5",
} as const;

const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;
const TILE_SIZE = 32;
const SHOW_MOSS_NAV_QA = import.meta.env.DEV && typeof window !== "undefined" && (() => {
  const params = new URLSearchParams(window.location.search);
  return params.get("navQa") === "1" || params.get("mossNavQa") === "1";
})();
const MOSS_WATER_FRAME_QA = import.meta.env.DEV && typeof window !== "undefined"
  ? (() => {
      const value = Number(new URLSearchParams(window.location.search).get("waterFrameQa"));
      return Number.isInteger(value) && value >= 0 && value <= 3 ? value : null;
    })()
  : null;

function variantHash(column: number, row: number, seed = 0): number {
  return hash2d(column * 17.31 + seed * 41.7, row * 29.17 - seed * 23.3);
}

/** Stable 0–3 visual variant used by terrain tiles and smoke tests. */
export function mossTerrainVariant(column: number, row: number, seed = 0): number {
  return Math.floor(variantHash(column, row, seed) * 4);
}

function isWalkableTile(tile: MossRootTile): boolean {
  return tile === "floor" || tile === "bridge" || tile === "gate" ||
    tile === "layerGate";
}

function isRuinTile(tile: MossRootTile): boolean {
  return tile !== "void" && tile !== "water";
}

/** Bit mask of same-type N/E/S/W neighbours, without allocating neighbour arrays. */
export function mossRootNeighborMask(
  column: number,
  row: number,
  tile: MossRootTile,
): number {
  let mask = 0;
  if (tileAt(column, row - 1) === tile) mask |= NORTH;
  if (tileAt(column + 1, row) === tile) mask |= EAST;
  if (tileAt(column, row + 1) === tile) mask |= SOUTH;
  if (tileAt(column - 1, row) === tile) mask |= WEST;
  return mask;
}

function walkableNeighborMask(column: number, row: number): number {
  let mask = 0;
  if (isWalkableTile(tileAt(column, row - 1))) mask |= NORTH;
  if (isWalkableTile(tileAt(column + 1, row))) mask |= EAST;
  if (isWalkableTile(tileAt(column, row + 1))) mask |= SOUTH;
  if (isWalkableTile(tileAt(column - 1, row))) mask |= WEST;
  return mask;
}

function ruinNeighborMask(column: number, row: number): number {
  let mask = 0;
  if (isRuinTile(tileAt(column, row - 1))) mask |= NORTH;
  if (isRuinTile(tileAt(column + 1, row))) mask |= EAST;
  if (isRuinTile(tileAt(column, row + 1))) mask |= SOUTH;
  if (isRuinTile(tileAt(column - 1, row))) mask |= WEST;
  return mask;
}

function drawMossPatch(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tone: number,
): void {
  context.fillStyle = tone > 0.65 ? MOSS_PALETTE.mossLight : MOSS_PALETTE.mossBase;
  context.fillRect(x, y, width, height);
  context.fillStyle = MOSS_PALETTE.mossDark;
  context.fillRect(x + 1, y + Math.max(1, height - 2), Math.max(2, width - 2), 1);
}

function drawFloorTile(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
): void {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const variant = mossTerrainVariant(column, row);
  const first = variantHash(column, row, 1);
  const second = variantHash(column, row, 2);
  const third = variantHash(column, row, 3);
  const broadTone = variantHash(Math.floor(column / 3), Math.floor(row / 3), 21);
  context.fillStyle = broadTone > 0.7 ? "#27372e" : broadTone < 0.24 ? "#192821" : MOSS_PALETTE.floorBase;
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // Two or three broad, offset slabs are enough to read as an ancient floor.
  // Avoid outlining the 32px collision cell itself: only interior broken seams
  // are painted, and their offsets vary across large three-tile tone patches.
  context.fillStyle = MOSS_PALETTE.floorShadow;
  if (variant === 0) {
    context.fillRect(x - 2, y + 16, 22, 2);
    context.fillRect(x + 18, y + 5, 2, 13);
  } else if (variant === 1) {
    context.fillRect(x + 12, y - 2, 2, 14);
    context.fillRect(x - 2, y + 19, 18, 2);
  } else if (variant === 2) {
    context.fillRect(x + 15, y + 11, 19, 2);
    context.fillRect(x + 13, y + 12, 2, 16);
  } else {
    context.fillRect(x - 2, y + 13, 17, 2);
    context.fillRect(x + 14, y + 8, 2, 19);
  }

  context.fillStyle = broadTone > 0.72 ? "#43503f" : "#37453a";
  if (variant === 0) {
    context.fillRect(x + 1, y + 5, 16, 10);
    context.fillRect(x + 20, y + 18, 12, 9);
  } else if (variant === 1) {
    context.fillRect(x + 14, y + 2, 16, 10);
    context.fillRect(x + 2, y + 21, 14, 8);
  } else if (variant === 2) {
    context.fillRect(x + 2, y + 4, 11, 18);
    context.fillRect(x + 16, y + 14, 14, 12);
  } else {
    context.fillRect(x, y + 3, 14, 9);
    context.fillRect(x + 17, y + 17, 15, 10);
  }

  // Highlights are sparse and short, keeping actors readable over the floor.
  context.fillStyle = broadTone > 0.72 ? "#788069" : "#5d6854";
  if (variant === 0) context.fillRect(x + 3, y + 5, 8, 1);
  else if (variant === 1) context.fillRect(x + 16, y + 2, 9, 1);
  else if (variant === 2) context.fillRect(x + 3, y + 4, 6, 1);
  else context.fillRect(x + 2, y + 3, 7, 1);

  if (third > 0.82) {
    context.fillStyle = "#15231d";
    const crackX = x + 7 + variant * 4;
    context.fillRect(crackX, y + 23, 2, 5);
    context.fillRect(crackX + 1, y + 27, 4, 1);
  }
  if (first > 0.7) {
    drawMossPatch(context, x + 3 + Math.floor(second * 15), y + 28, 5, 2, third);
  }
  if (second > 0.92) drawMossPatch(context, x + 26, y + 10, 3, 5, first);
}

function drawFloorEdgeMoss(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  mask: number,
  tone: number,
): void {
  if (!(mask & NORTH)) drawMossPatch(context, x + 4, y + 1, 11, 2, tone);
  if (!(mask & EAST)) drawMossPatch(context, x + 28, y + 8, 2, 10, tone);
  if (!(mask & SOUTH)) drawMossPatch(context, x + 14, y + 28, 10, 2, tone);
  if (!(mask & WEST)) drawMossPatch(context, x + 1, y + 17, 2, 9, tone);
}

function drawWaterTile(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
  waveFrame: number,
): void {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const variant = mossTerrainVariant(column, row, 4);
  context.fillStyle = MOSS_PALETTE.waterDeep;
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = MOSS_PALETTE.waterBase;
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const shift = (waveFrame + variant) % 3;
  context.fillStyle = "#17635d";
  context.fillRect(x + 4 + shift * 2, y + 7, 10, 1);
  context.fillRect(x + 17 - shift, y + 15, 9, 1);
  context.fillStyle = MOSS_PALETTE.waterLight;
  context.fillRect(x + 8 + shift, y + 24, 6, 1);
  if (variant === 1 || variant === 3) context.fillRect(x + 22 - shift, y + 4, 4, 1);
}

function drawWaterBank(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: number,
  tone: number,
): void {
  context.fillStyle = MOSS_PALETTE.stoneDark;
  if (side === NORTH) context.fillRect(x, y, 32, 4);
  if (side === EAST) context.fillRect(x + 28, y, 4, 32);
  if (side === SOUTH) context.fillRect(x, y + 28, 32, 4);
  if (side === WEST) context.fillRect(x, y, 4, 32);
  context.fillStyle = MOSS_PALETTE.stoneLight;
  if (side === NORTH) context.fillRect(x + 3, y + 1, 17, 1);
  if (side === EAST) context.fillRect(x + 30, y + 5, 1, 15);
  if (side === SOUTH) context.fillRect(x + 10, y + 30, 14, 1);
  if (side === WEST) context.fillRect(x + 1, y + 11, 1, 13);
  if (tone > 0.52) {
    context.fillStyle = MOSS_PALETTE.mossBase;
    if (side === NORTH) context.fillRect(x + 21, y + 1, 6, 2);
    if (side === EAST) context.fillRect(x + 29, y + 21, 2, 5);
    if (side === SOUTH) context.fillRect(x + 3, y + 29, 6, 2);
    if (side === WEST) context.fillRect(x + 1, y + 4, 2, 6);
  }
}

function drawBridgeTile(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
): void {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const variant = mossTerrainVariant(column, row, 5);
  const bridgeMask = mossRootNeighborMask(column, row, "bridge");
  context.fillStyle = MOSS_PALETTE.waterDeep;
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#27352d";
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#6a7054";
  if (!(bridgeMask & NORTH)) context.fillRect(x + 1, y + 1, 30, 3);
  if (!(bridgeMask & SOUTH)) context.fillRect(x + 1, y + 28, 30, 3);
  if (!(bridgeMask & EAST)) context.fillRect(x + 28, y + 2, 3, 28);
  if (!(bridgeMask & WEST)) context.fillRect(x + 1, y + 2, 3, 28);
  context.fillStyle = "#3e4a3a";
  context.fillRect(x - 2 + (variant % 2) * 2, y + 6, 18, 8);
  context.fillRect(x + 15, y + 8, 19, 7);
  context.fillRect(x + 3, y + 18, 17, 7);
  context.fillRect(x + 20, y + 17, 14, 8);
  context.fillStyle = "#778061";
  context.fillRect(x + (variant % 2), y + 6, 10, 1);
  context.fillRect(x + 21, y + 17, 7, 1);
  if (variant === 0 || variant === 3) drawMossPatch(context, x + 24, y + 4, 3, 2, variantHash(column, row, 8));
}

function drawWallTile(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
): void {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const variant = mossTerrainVariant(column, row, 6);
  const walkableMask = walkableNeighborMask(column, row);
  context.fillStyle = MOSS_PALETTE.stoneDark;
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#1d2c25";
  context.fillRect(x, y + 2, TILE_SIZE, 30);
  // Irregular masonry clusters. They overlap the tile bounds horizontally,
  // which keeps long ruin walls from becoming a repeated horizontal stripe.
  context.fillStyle = "#2d3e33";
  context.fillRect(x - 3 + Math.floor(variantHash(column, row, 11) * 5), y + 4, 17, 7);
  context.fillRect(x + 14, y + 5 + Math.floor(variantHash(column, row, 12) * 3), 20, 8);
  context.fillRect(x + 2, y + 14, 13 + Math.floor(variantHash(column, row, 13) * 6), 8);
  context.fillRect(x + 18, y + 18, 17, 9);
  context.fillStyle = "#223229";
  context.fillRect(x - 1, y + 25, 18, 6);
  if (variant === 0 || variant === 3) context.fillRect(x + 18, y + 13, 9, 4);
  context.fillStyle = MOSS_PALETTE.stoneLight;
  context.fillRect(x - 1 + Math.floor(variantHash(column, row, 11) * 5), y + 4, 11, 1);
  context.fillRect(x + 16, y + 5 + Math.floor(variantHash(column, row, 12) * 3), 10, 1);
  if (variant === 1 || variant === 3) drawMossPatch(context, x + 6, y + 3, 8, 2, variantHash(column, row, 9));
  if (variant === 2) drawMossPatch(context, x + 23, y + 23, 4, 3, variantHash(column, row, 10));

  // A floor-facing cap is deliberately brighter than the vertical face, so
  // the visible cliff outline matches the actual collision boundary.
  context.fillStyle = "#697058";
  if (walkableMask & NORTH) context.fillRect(x + 2, y, 28, 3);
  if (walkableMask & EAST) context.fillRect(x + 29, y + 2, 3, 28);
  if (walkableMask & SOUTH) context.fillRect(x + 2, y + 29, 28, 3);
  if (walkableMask & WEST) context.fillRect(x, y + 2, 3, 28);
  context.fillStyle = "#18271f";
  if (walkableMask & NORTH) context.fillRect(x + 4, y + 3, 24, 3);
  if (walkableMask & EAST) context.fillRect(x + 26, y + 4, 3, 24);
  if (walkableMask & SOUTH) context.fillRect(x + 4, y + 26, 24, 3);
  if (walkableMask & WEST) context.fillRect(x + 3, y + 4, 3, 24);

  // Sparse roots and mineral seams break long wall runs without changing
  // their collision silhouette.
  const detail = variantHash(column, row, 19);
  if (detail > 0.73) {
    context.fillStyle = detail > 0.9 ? "#176b63" : MOSS_PALETTE.rootDark;
    const detailX = x + 7 + variant * 5;
    context.fillRect(detailX, y + 7, 2, 17);
    context.fillRect(detailX - 3, y + 21, 5, 2);
    if (detail > 0.9) {
      context.fillStyle = "#54c8b9";
      context.fillRect(detailX, y + 9, 1, 8);
    }
  }
}

function drawRootTile(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
): void {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const mask = mossRootNeighborMask(column, row, "root");
  const variant = mossTerrainVariant(column, row, 7);
  const density = variantHash(column, row, 18);
  context.fillStyle = "#151a12";
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = variant % 2 === 0 ? "#292217" : "#312719";
  context.fillRect(x + 1, y + 4, 30, 24);
  context.fillStyle = "#3a2c1b";
  context.fillRect(x + (variant % 2 ? 2 : 11), y + 8, 19, 9);
  context.fillRect(x + (variant % 2 ? 13 : 3), y + 18, 16, 8);

  // Only selected tiles carry a dominant bark strand. The surrounding solid
  // mass and neighbour-edge notches join them into a single tangled barrier.
  if (density > 0.38) {
    const angle = [-0.18, 0.14, 0.58, -0.54][variant] ?? 0;
    context.save();
    context.translate(x + 16, y + 16);
    context.rotate(angle);
    context.fillStyle = MOSS_PALETTE.rootDark;
    context.fillRect(-22, -5, 44, 11);
    context.fillStyle = "#503820";
    context.fillRect(-20, -3, 40, 7);
    context.fillStyle = "#7b5a35";
    context.fillRect(-15, -2, 20, 2);
    context.restore();
  }
  if (density > 0.82) {
    context.save();
    context.translate(x + 17, y + 15);
    context.rotate(variant % 2 === 0 ? -0.78 : 0.75);
    context.fillStyle = MOSS_PALETTE.rootDark;
    context.fillRect(-14, -3, 29, 7);
    context.fillStyle = "#47321d";
    context.fillRect(-12, -2, 24, 4);
    context.restore();
  }

  context.fillStyle = "#0f150e";
  if (!(mask & NORTH)) context.fillRect(x + 3, y, 9 + variant * 2, 3);
  if (!(mask & EAST)) context.fillRect(x + 29, y + 7, 3, 12 + variant * 2);
  if (!(mask & SOUTH)) context.fillRect(x + 13, y + 29, 14 - variant, 3);
  if (!(mask & WEST)) context.fillRect(x, y + 8, 3, 11 + variant * 2);
  if (variant !== 0 && density < 0.68) {
    drawMossPatch(context, x + 20, y + 5, 7, 2, variantHash(column, row, 11));
  }
}

function drawVoidTile(
  context: CanvasRenderingContext2D,
  column: number,
  row: number,
): void {
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const nearbyRuin = ruinNeighborMask(column, row);
  context.fillStyle = MOSS_PALETTE.voidDeep;
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  if (!nearbyRuin) return;
  const variant = mossTerrainVariant(column, row, 12);
  context.fillStyle = MOSS_PALETTE.voidMid;
  if (nearbyRuin & NORTH) {
    context.fillRect(x, y, 32, 9 + variant * 2);
    context.fillStyle = "#0b211b";
    context.fillRect(x + 3, y + 8 + variant, 10, 5);
    context.fillRect(x + 19, y + 6, 12, 4);
  }
  if (nearbyRuin & SOUTH) {
    context.fillRect(x, y + 22 - variant, 32, 10 + variant);
    context.fillStyle = "#0b211b";
    context.fillRect(x + 1, y + 20, 13, 5);
    context.fillRect(x + 20, y + 23 - variant, 10, 5);
  }
  if (nearbyRuin & WEST) {
    context.fillRect(x, y, 10 + variant, 32);
    context.fillStyle = "#0b211b";
    context.fillRect(x + 8, y + 4, 5, 11);
    context.fillRect(x + 6, y + 21, 4, 9);
  }
  if (nearbyRuin & EAST) {
    context.fillRect(x + 22 - variant, y, 10 + variant, 32);
    context.fillStyle = "#0b211b";
    context.fillRect(x + 19, y + 7, 6, 10);
    context.fillRect(x + 23, y + 22, 5, 8);
  }
  if (variant === 2 && variantHash(column, row, 20) > 0.68) {
    context.fillStyle = "#12544f";
    context.fillRect(x + 14, y + 15, 2, 4);
    context.fillStyle = "#59cfc1";
    context.fillRect(x + 14, y + 14, 1, 2);
  }
}

function drawBrokenStoneRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  seed: number,
): void {
  const segments = 22;
  for (let index = 0; index < segments; index += 1) {
    const phase = (index + 0.5) / segments * Math.PI * 2;
    const tone = hash2d(seed + index * 13, seed - index * 7);
    if (tone < 0.18) continue;
    const px = Math.round(x + Math.cos(phase) * radiusX);
    const py = Math.round(y + Math.sin(phase) * radiusY);
    context.fillStyle = tone > 0.7 ? "#80876d" : "#56634f";
    if (Math.abs(Math.cos(phase)) > Math.abs(Math.sin(phase))) {
      context.fillRect(px - 2, py - 4, 5, 8);
      context.fillStyle = MOSS_PALETTE.stoneDark;
      context.fillRect(px + (Math.cos(phase) > 0 ? 2 : -3), py - 3, 1, 6);
    } else {
      context.fillRect(px - 4, py - 2, 8, 5);
      context.fillStyle = MOSS_PALETTE.stoneDark;
      context.fillRect(px - 3, py + (Math.sin(phase) > 0 ? 2 : -3), 6, 1);
    }
  }
}

function drawCrystalCluster(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height = 15,
  variant = 0,
): void {
  const width = Math.max(5, Math.floor(height * 0.38));
  context.fillStyle = "#122923";
  context.fillRect(x - width - 6, y - 1, width * 2 + 12, 4);
  context.fillStyle = "#176b66";
  context.fillRect(x - width, y - height + 5, width * 2, height - 4);
  context.fillRect(x - width + 2, y - height, width * 2 - 4, 5);
  context.fillStyle = MOSS_PALETTE.crystalBase;
  context.fillRect(x - width + 2, y - height + 4, width * 2 - 4, height - 8);
  context.fillRect(x - width + 4, y - height + 1, width * 2 - 8, 4);
  context.fillStyle = MOSS_PALETTE.crystalLight;
  context.fillRect(x - 1, y - height + 3, 2, Math.max(4, height - 8));
  const side = variant % 2 === 0 ? -1 : 1;
  context.fillStyle = "#197d75";
  context.fillRect(x + side * (width + 3), y - 8, 4, 7);
  context.fillStyle = "#77ded1";
  context.fillRect(x + side * (width + 4), y - 10, 2, 3);
  context.fillStyle = "#1d5f57";
  context.fillRect(x - side * (width + 7), y - 5, 3, 4);
}

const MOSS_ROOT_CRYSTAL_LIGHT_PATH = [
  MOSS_ROOT_RUINS.crystal,
  mossRootBackdropSourceToWorld({ x: 1100, y: 515 }),
  mossRootBackdropSourceToWorld({ x: 1040, y: 470 }),
  mossRootBackdropSourceToWorld({ x: 1004, y: 390 }),
  mossRootBackdropSourceToWorld({ x: 976, y: 322 }),
  mossRootBackdropSourceToWorld({ x: 915, y: 273 }),
  mossRootBackdropSourceToWorld({ x: 780, y: 273 }),
  mossRootBackdropSourceToWorld({ x: 720, y: 312 }),
  mossRootBackdropSourceToWorld({ x: 685, y: 330 }),
  MOSS_ROOT_GATE_TRANSFORM.center,
] as const;

/** A restrained floor-bound pulse links the altar to the living root seal. */
function drawRootGateLightPath(
  context: CanvasRenderingContext2D,
  progress: number,
): void {
  const normalized = Math.max(0, Math.min(1, progress));
  if (normalized <= 0 || normalized >= 1) return;
  const segmentProgress = normalized * (MOSS_ROOT_CRYSTAL_LIGHT_PATH.length - 1);
  context.save();
  for (let index = 1; index < MOSS_ROOT_CRYSTAL_LIGHT_PATH.length; index += 1) {
    const amount = Math.max(0, Math.min(1, segmentProgress - (index - 1)));
    if (amount <= 0) break;
    const start = MOSS_ROOT_CRYSTAL_LIGHT_PATH[index - 1]!;
    const end = MOSS_ROOT_CRYSTAL_LIGHT_PATH[index]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 8));
    const visibleSteps = Math.max(1, Math.floor(steps * amount));
    for (let step = 0; step <= visibleSteps; step += 2) {
      const phase = step / steps;
      const x = Math.round(start.x + (end.x - start.x) * phase);
      const y = Math.round(start.y + (end.y - start.y) * phase);
      context.globalAlpha = 0.32 + normalized * 0.38;
      context.fillStyle = step % 4 === 0 ? "#91e8d9" : "#39a99e";
      context.fillRect(x - 1, y - 1, step % 4 === 0 ? 3 : 2, 2);
    }
  }
  context.globalAlpha = 1;
  context.restore();
}

/** The image's stone foot ends at the existing pedestal collider's center. */
function drawTransferCrystal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  activated: boolean,
  unlockProgress: number,
): void {
  if (!mossRootUnlockCrystal?.complete || mossRootUnlockCrystal.naturalWidth === 0) {
    drawTransferCrystalFallback(context, x, y, time, activated, unlockProgress);
    return;
  }

  context.save();
  context.imageSmoothingEnabled = false;
  context.filter = activated ? "none" : "brightness(0.8) saturate(0.8)";
  context.drawImage(mossRootUnlockCrystal, x - 31, y - 53, 62, 70);
  context.filter = "none";

  const progress = Math.max(0, Math.min(1, unlockProgress));
  if (progress > 0 && progress < 1) {
    context.globalAlpha = 0.32 * progress;
    context.fillStyle = "#9ff3e4";
    const spokeLength = 14 + Math.round(progress * 18);
    context.fillRect(x - spokeLength, y + 1, spokeLength - 7, 1);
    context.fillRect(x + 7, y + 1, spokeLength - 7, 1);
    context.fillRect(x, y + 6, 1, Math.max(2, Math.round(progress * 15)));
  }
  context.restore();
}

/** Procedural fallback while the production asset is loading or unavailable. */
function drawTransferCrystalFallback(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  activated: boolean,
  unlockProgress: number,
): void {
  const pulseStep = activated ? 2 : Math.floor(time * 2.4) % 3;
  const glow = activated ? 0.86 : 0.32 + pulseStep * 0.08;
  const progress = Math.max(0, Math.min(1, unlockProgress));
  context.save();

  context.globalAlpha = 0.34;
  context.fillStyle = "#06110f";
  context.beginPath();
  context.ellipse(x, y + 5, 29, 9, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  // Low, weathered masonry shares the backdrop palette and avoids a UI-like
  // black outline. Irregular one-pixel chips keep the silhouette archaeological.
  context.fillStyle = "#26352e";
  context.fillRect(x - 24, y - 3, 48, 7);
  context.fillRect(x - 19, y - 8, 38, 5);
  context.fillStyle = "#435348";
  context.fillRect(x - 21, y - 6, 42, 3);
  context.fillRect(x - 16, y - 11, 32, 4);
  context.fillStyle = "#6d7563";
  context.fillRect(x - 13, y - 11, 10, 1);
  context.fillRect(x + 3, y - 11, 8, 1);
  context.fillRect(x - 18, y - 6, 15, 1);
  context.fillStyle = "#40542f";
  context.fillRect(x - 22, y - 3, 7, 3);
  context.fillRect(x + 13, y - 3, 8, 3);

  const shard = (offsetX: number, height: number, halfWidth: number, dark: string, mid: string) => {
    const baseY = y - 10;
    context.fillStyle = dark;
    context.beginPath();
    context.moveTo(x + offsetX, baseY - height);
    context.lineTo(x + offsetX + halfWidth + 1, baseY - height + 6);
    context.lineTo(x + offsetX + halfWidth, baseY);
    context.lineTo(x + offsetX - halfWidth, baseY);
    context.lineTo(x + offsetX - halfWidth - 1, baseY - height + 7);
    context.closePath();
    context.fill();
    context.fillStyle = mid;
    context.beginPath();
    context.moveTo(x + offsetX, baseY - height + 2);
    context.lineTo(x + offsetX + halfWidth - 1, baseY - height + 7);
    context.lineTo(x + offsetX + halfWidth - 2, baseY - 2);
    context.lineTo(x + offsetX, baseY - 3);
    context.closePath();
    context.fill();
    context.fillStyle = "#9beadd";
    context.fillRect(x + offsetX, baseY - height + 5, 1, Math.max(3, height - 11));
  };

  shard(-16, 17, 4, "#14534f", "#278d84");
  shard(15, 20, 4, "#124e4a", "#247f78");
  shard(-8, 12, 3, "#174a45", "#318d82");
  shard(8, 13, 3, "#174a45", "#2a756d");
  shard(0, 34, 7, "#12504b", "#2aa197");

  context.globalAlpha = glow + progress * 0.1;
  context.fillStyle = activated ? "#b8f5e9" : "#77d8cc";
  context.fillRect(x - 1, y - 39, 2, 17);
  context.fillRect(x - 19, y - 25, 2, 5);
  context.fillRect(x + 17, y - 28, 2, 6);
  if (progress > 0) {
    context.fillStyle = "#9ff3e4";
    const spokeLength = 14 + Math.round(progress * 18);
    context.fillRect(x - spokeLength, y + 1, spokeLength - 7, 1);
    context.fillRect(x + 7, y + 1, spokeLength - 7, 1);
    context.fillRect(x, y + 6, 1, Math.max(2, Math.round(progress * 15)));
  }
  context.globalAlpha = 1;
  context.restore();
}

function drawRootGate(
  context: CanvasRenderingContext2D,
  open: boolean,
  progress = open ? 1 : 0,
): void {
  const opening = open ? 1 : Math.max(0, Math.min(1, progress));
  const remaining = 1 - opening;
  const { center, rotation, visualWidth, visualHeight, visualBaseline } = MOSS_ROOT_GATE_TRANSFORM;
  const half = Math.round(visualWidth * 0.5);
  context.save();
  context.translate(center.x, center.y);
  context.rotate(rotation);

  if (mossRootSealReady() && mossRootSeal) {
    if (remaining > 0.025) {
      const assetWidth = Math.round(visualWidth * (0.94 + remaining * 0.06));
      const assetHeight = Math.max(2, Math.round(visualHeight * remaining));
      context.imageSmoothingEnabled = false;
      context.globalAlpha = 0.22 + remaining * 0.78;
      context.drawImage(
        mossRootSeal,
        0,
        0,
        256,
        128,
        -Math.round(assetWidth * 0.5),
        visualBaseline - assetHeight,
        assetWidth,
        assetHeight,
      );
    }
    if (opening > 0 && opening < 1) {
      context.globalAlpha = 0.22 + opening * 0.26;
      context.fillStyle = "#8c8060";
      for (let mote = 0; mote < 8; mote += 1) {
        const moteX = -48 + ((mote * 17) % 97);
        const moteY = 23 - Math.round(opening * (9 + (mote % 4) * 4));
        context.fillRect(moteX, moteY, mote % 3 === 0 ? 2 : 1, 2);
      }
    }
    context.globalAlpha = 1;
    context.restore();
    return;
  }

  // Load-failure fallback: broken masonry and organic roots, never a black panel.
  for (const side of [-1, 1] as const) {
    const edge = side * (half + 4);
    context.fillStyle = "#1c2a24";
    context.fillRect(edge - (side < 0 ? 12 : 0), -25, 12, 50);
    context.fillRect(edge - (side < 0 ? 18 : -1), 13, 18, 13);
    context.fillStyle = "#405044";
    context.fillRect(edge - (side < 0 ? 9 : -2), -21, 8, 15);
    context.fillRect(edge - (side < 0 ? 14 : -2), -2, 13, 11);
    context.fillRect(edge - (side < 0 ? 15 : -2), 15, 14, 7);
    context.fillStyle = "#737966";
    context.fillRect(edge - (side < 0 ? 8 : -3), -20, 6, 1);
    context.fillStyle = "#53673b";
    context.fillRect(edge - (side < 0 ? 11 : 0), -9, 8, 3);
  }

  if (remaining > 0.02) {
    const rootPaths = [
      [{ x: -51, y: -19 }, { x: -33, y: -15 }, { x: -13, y: -5 }, { x: 9, y: 1 }, { x: 29, y: 10 }, { x: 51, y: 16 }],
      [{ x: -51, y: 14 }, { x: -32, y: 8 }, { x: -12, y: 2 }, { x: 10, y: -4 }, { x: 30, y: -12 }, { x: 51, y: -17 }],
      [{ x: -49, y: -3 }, { x: -29, y: 0 }, { x: -8, y: 7 }, { x: 12, y: 4 }, { x: 31, y: -1 }, { x: 49, y: 2 }],
      [{ x: -43, y: 22 }, { x: -29, y: 12 }, { x: -14, y: 1 }, { x: 3, y: -8 }, { x: 21, y: -17 }, { x: 42, y: -22 }],
    ] as const;
    const lift = Math.round(opening * 28);
    context.globalAlpha = 0.35 + remaining * 0.65;
    context.lineCap = "butt";
    context.lineJoin = "miter";
    for (let root = 0; root < rootPaths.length; root += 1) {
      const path = rootPaths[root]!;
      const trace = (offsetY: number) => {
        context.beginPath();
        context.moveTo(path[0]!.x, path[0]!.y + offsetY - lift);
        for (let point = 1; point < path.length; point += 1) {
          context.lineTo(path[point]!.x, path[point]!.y + offsetY - lift);
        }
      };
      trace(0);
      context.strokeStyle = "#1b2419";
      context.lineWidth = 12 - (root % 2);
      context.stroke();
      trace(0);
      context.strokeStyle = root % 2 === 0 ? "#514528" : "#454025";
      context.lineWidth = 7 - (root % 2);
      context.stroke();
      trace(-1);
      context.strokeStyle = root % 2 === 0 ? "#7a673c" : "#686039";
      context.lineWidth = 1;
      context.stroke();
    }
    context.fillStyle = "#557044";
    context.fillRect(-44, -21 - lift, 11, 3);
    context.fillRect(31, 17 - lift, 13, 3);


  }

  if (opening > 0 && opening < 1) {
    context.globalAlpha = 0.32 + opening * 0.45;
    context.fillStyle = "#72d8c8";
    for (let mote = 0; mote < 7; mote += 1) {
      const side = mote % 2 === 0 ? -1 : 1;
      const moteX = side * (9 + mote * 5) * opening;
      const moteY = -18 + ((mote * 13) % 35);
      context.fillRect(Math.round(moteX), moteY, mote % 3 === 0 ? 2 : 1, 2);
    }
  }
  context.globalAlpha = 1;
  context.restore();
}

function drawRuinPillar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  variant: number,
): void {
  context.fillStyle = "#15241f";
  context.fillRect(x - 6, y - height + 3, 13, height + 4);
  context.fillStyle = MOSS_PALETTE.stoneBase;
  context.fillRect(x - 4, y - height, 9, height);
  context.fillStyle = MOSS_PALETTE.stoneLight;
  context.fillRect(x - 5, y - height - 2, 11, 4);
  context.fillStyle = "#25372d";
  context.fillRect(x - 2, y - height + 5, 3, height - 8);
  if (variant % 2 === 0) drawMossPatch(context, x - 5, y - height + 6, 4, 3, variantHash(x, y, 13));
}


export type MossRootDecorationKind =
  | "crystal"
  | "pillar"
  | "root"
  | "rubble"
  | "moss";

export interface MossRootSceneDecoration {
  kind: MossRootDecorationKind;
  x: number;
  y: number;
  size: number;
  variant: number;
}

/**
 * Curated landmarks sit above the deterministic tile texture. Keeping this
 * data separate from collision lets later ruins reuse the same small drawing
 * vocabulary without turning decoration into invisible blockers.
 */
export const MOSS_ROOT_SCENE_DECORATIONS: readonly MossRootSceneDecoration[] = [
  // Safe southern plaza and arrival path.
  { kind: "pillar", x: 790, y: 1688, size: 30, variant: 1 },
  { kind: "root", x: 820, y: 1540, size: 46, variant: 2 },
  { kind: "crystal", x: 1240, y: 1645, size: 20, variant: 3 },
  { kind: "pillar", x: 1235, y: 1785, size: 27, variant: 4 },
  { kind: "rubble", x: 910, y: 1830, size: 20, variant: 5 },
  { kind: "moss", x: 1110, y: 1800, size: 18, variant: 6 },
  // Curved lower ascent and first battle plaza.
  { kind: "root", x: 815, y: 1390, size: 42, variant: 7 },
  { kind: "pillar", x: 865, y: 1190, size: 27, variant: 8 },
  { kind: "crystal", x: 1190, y: 1160, size: 17, variant: 9 },
  { kind: "moss", x: 930, y: 1010, size: 17, variant: 10 },
  { kind: "rubble", x: 1110, y: 995, size: 23, variant: 11 },
  // West and east halves of the main loop.
  { kind: "pillar", x: 580, y: 1000, size: 30, variant: 12 },
  { kind: "crystal", x: 390, y: 925, size: 18, variant: 13 },
  { kind: "root", x: 285, y: 770, size: 50, variant: 14 },
  { kind: "moss", x: 510, y: 710, size: 19, variant: 15 },
  { kind: "pillar", x: 1450, y: 995, size: 30, variant: 16 },
  { kind: "crystal", x: 1645, y: 930, size: 19, variant: 17 },
  { kind: "root", x: 1765, y: 760, size: 49, variant: 18 },
  { kind: "rubble", x: 1520, y: 690, size: 22, variant: 19 },
  // Central branch plaza.
  { kind: "pillar", x: 855, y: 720, size: 28, variant: 20 },
  { kind: "crystal", x: 1165, y: 675, size: 17, variant: 21 },
  { kind: "moss", x: 1075, y: 530, size: 18, variant: 22 },
  { kind: "rubble", x: 930, y: 540, size: 21, variant: 23 },
  // Secret dead end and quiet upper split.
  { kind: "root", x: 570, y: 520, size: 43, variant: 24 },
  { kind: "crystal", x: 690, y: 360, size: 20, variant: 25 },
  { kind: "pillar", x: 790, y: 360, size: 26, variant: 26 },
  { kind: "moss", x: 860, y: 435, size: 17, variant: 27 },
  { kind: "pillar", x: 1420, y: 470, size: 31, variant: 28 },
  { kind: "root", x: 1550, y: 360, size: 42, variant: 29 },
  { kind: "crystal", x: 1490, y: 300, size: 17, variant: 30 },
  // Final plaza and cave throat.
  { kind: "pillar", x: 760, y: 260, size: 31, variant: 31 },
  { kind: "crystal", x: 1265, y: 245, size: 22, variant: 32 },
  { kind: "root", x: 865, y: 90, size: 45, variant: 33 },
  { kind: "rubble", x: 1140, y: 340, size: 24, variant: 34 },
  { kind: "moss", x: 1010, y: 100, size: 16, variant: 35 },
] as const;

function decorationVisible(
  decoration: MossRootSceneDecoration,
  snapshot: WorldSnapshot,
  margin = 72,
): boolean {
  const camera = snapshot.camera;
  return decoration.x >= camera.x - margin &&
    decoration.x <= camera.x + camera.viewportWidth + margin &&
    decoration.y >= camera.y - margin &&
    decoration.y <= camera.y + camera.viewportHeight + margin;
}

function drawRubbleScatter(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number,
): void {
  const pieces = 5 + variant % 3;
  for (let index = 0; index < pieces; index += 1) {
    const tone = hash2d(x + index * 19, y - variant * 11);
    const px = Math.round(x + (tone - 0.5) * size * 1.8);
    const py = Math.round(y + (hash2d(y + index * 7, x) - 0.5) * size * 0.7);
    const width = 3 + (index + variant) % 5;
    context.fillStyle = MOSS_PALETTE.stoneDark;
    context.fillRect(px - 1, py + 1, width + 2, 3);
    context.fillStyle = index % 3 === 0 ? MOSS_PALETTE.stoneLight : MOSS_PALETTE.stoneBase;
    context.fillRect(px, py, width, 2);
  }
}

function drawMossTuft(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number,
): void {
  context.fillStyle = MOSS_PALETTE.mossDark;
  context.fillRect(Math.round(x - size * 0.5), y, size, 3);
  context.fillStyle = MOSS_PALETTE.mossBase;
  context.fillRect(Math.round(x - size * 0.4), y - 3, Math.round(size * 0.8), 4);
  context.fillRect(x - 2, y - 8, 2, 6);
  context.fillRect(x + 4, y - 6, 2, 5);
  context.fillStyle = MOSS_PALETTE.mossLight;
  context.fillRect(x - 5, y - 4, 5, 2);
  if (variant % 3 === 0) {
    context.fillStyle = "#c7d76a";
    context.fillRect(x - 2, y - 10, 3, 3);
    context.fillStyle = "#e3e996";
    context.fillRect(x - 1, y - 11, 1, 1);
  }
}

function drawSurfaceRoot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number,
): void {
  context.save();
  context.translate(x, y);
  const segments = 4 + variant % 2;
  for (let index = 0; index < segments; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    context.save();
    context.translate(side * (index * 4 - 3), -index * 4);
    context.rotate(side * (0.18 + index * 0.08));
    const length = Math.max(13, size - index * 7);
    const width = Math.max(4, 10 - index);
    const left = -Math.floor(length * 0.5);
    const top = -Math.floor(width * 0.5);
    context.fillStyle = MOSS_PALETTE.rootDark;
    context.fillRect(left - 2, top - 1, length + 4, width + 2);
    context.fillStyle = MOSS_PALETTE.rootBase;
    context.fillRect(left, top, length, width);
    context.fillStyle = MOSS_PALETTE.rootLight;
    context.fillRect(left + 3, top + 1, Math.max(4, length - 10), 2);
    context.restore();
  }
  context.fillStyle = MOSS_PALETTE.mossBase;
  context.fillRect(Math.round(-size * 0.22), Math.round(-size * 0.42), Math.max(7, Math.round(size * 0.42)), 3);
  context.restore();
}

function drawSceneDecorations(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): void {
  for (const decoration of MOSS_ROOT_SCENE_DECORATIONS) {
    if (!decorationVisible(decoration, snapshot)) continue;
    if (decoration.kind === "crystal") {
      drawCrystalCluster(
        context,
        decoration.x,
        decoration.y,
        decoration.size,
        decoration.variant,
      );
    } else if (decoration.kind === "pillar") {
      drawRuinPillar(
        context,
        decoration.x,
        decoration.y,
        decoration.size,
        decoration.variant,
      );
      drawRubbleScatter(
        context,
        decoration.x + (decoration.variant % 2 ? 10 : -9),
        decoration.y + 2,
        Math.max(9, Math.round(decoration.size * 0.45)),
        decoration.variant,
      );
    } else if (decoration.kind === "root") {
      drawSurfaceRoot(
        context,
        decoration.x,
        decoration.y,
        decoration.size,
        decoration.variant,
      );
    } else if (decoration.kind === "rubble") {
      drawRubbleScatter(
        context,
        decoration.x,
        decoration.y,
        decoration.size,
        decoration.variant,
      );
    } else {
      drawMossTuft(
        context,
        decoration.x,
        decoration.y,
        decoration.size,
        decoration.variant,
      );
    }
  }
}

function drawAncientPlazaMosaic(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  seed: number,
  crystalFocus = false,
): void {
  const camera = snapshot.camera;
  const margin = Math.max(radiusX, radiusY) + 32;
  if (x < camera.x - margin ||
      x > camera.x + camera.viewportWidth + margin ||
      y < camera.y - margin ||
      y > camera.y + camera.viewportHeight + margin) return;
  drawBrokenStoneRing(context, x, y, radiusX, radiusY, seed);
  drawBrokenStoneRing(context, x, y, radiusX * 0.73, radiusY * 0.7, seed + 17);
  drawBrokenStoneRing(context, x, y + 1, radiusX * 0.28, radiusY * 0.26, seed + 31);
  for (let index = 0; index < 12; index += 1) {
    if (hash2d(seed * 11 + index * 17, seed - index * 23) < 0.2) continue;
    const angle = index / 12 * Math.PI * 2;
    const spokeX = Math.round(x + Math.cos(angle) * radiusX * 0.47);
    const spokeY = Math.round(y + Math.sin(angle) * radiusY * 0.47);
    const length = 12 + (index + seed) % 10;
    context.save();
    context.translate(spokeX, spokeY);
    context.rotate(angle);
    context.fillStyle = MOSS_PALETTE.floorShadow;
    context.fillRect(-Math.floor(length * 0.5), -2, length, 4);
    context.fillStyle = index % 3 === 0 ? MOSS_PALETTE.stoneLight : "#465443";
    context.fillRect(-Math.floor(length * 0.5) + 2, -1, Math.max(4, length - 5), 1);
    if (crystalFocus && index % 3 === 0) {
      context.fillStyle = "#23887f";
      context.fillRect(-Math.floor(length * 0.28), 1, Math.floor(length * 0.48), 1);
    }
    context.restore();
  }
  drawMossPatch(
    context,
    Math.round(x - radiusX * 0.7),
    Math.round(y + radiusY * 0.48),
    14,
    3,
    hash2d(seed, 44),
  );
  drawMossPatch(
    context,
    Math.round(x + radiusX * 0.48),
    Math.round(y - radiusY * 0.58),
    11,
    3,
    hash2d(seed, 61),
  );
}

interface MossRootWaterfallSource {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Native backdrop coordinates. These overlays animate only the painted water
// already present in the authored image; they never reconstruct terrain tiles.
const MOSS_ROOT_WATERFALLS: readonly MossRootWaterfallSource[] = [
  { x: 188, y: 104, width: 20, height: 55 },
  { x: 268, y: 365, width: 30, height: 67 },
  { x: 936, y: 333, width: 26, height: 87 },
  { x: 1071, y: 432, width: 30, height: 58 },
  { x: 92, y: 642, width: 31, height: 88 },
  { x: 419, y: 746, width: 36, height: 94 },
  { x: 824, y: 739, width: 40, height: 104 },
  { x: 228, y: 939, width: 38, height: 98 },
  { x: 1001, y: 916, width: 48, height: 128 },
] as const;

const MOSS_ROOT_WATER_RIPPLES = [
  { x: 229, y: 292, width: 54 },
  { x: 917, y: 520, width: 62 },
  { x: 507, y: 630, width: 45 },
  { x: 789, y: 625, width: 48 },
  { x: 149, y: 904, width: 55 },
  { x: 1080, y: 1040, width: 60 },
] as const;

function drawMossRootWaterAnimation(
  context: CanvasRenderingContext2D,
  time: number,
  camera: WorldSnapshot["camera"],
): void {
  const frame = MOSS_WATER_FRAME_QA ?? Math.floor(time * 8) % 4;
  context.save();
  context.imageSmoothingEnabled = false;
  for (const fall of MOSS_ROOT_WATERFALLS) {
    const topLeft = mossRootBackdropSourceToWorld({ x: fall.x, y: fall.y });
    const bottomRight = mossRootBackdropSourceToWorld({
      x: fall.x + fall.width,
      y: fall.y + fall.height,
    });
    const width = Math.max(4, Math.round(bottomRight.x - topLeft.x));
    const height = Math.max(8, Math.round(bottomRight.y - topLeft.y));
    if (
      topLeft.x + width < camera.x - 8 || topLeft.x > camera.x + camera.viewportWidth + 8 ||
      topLeft.y + height < camera.y - 8 || topLeft.y > camera.y + camera.viewportHeight + 8
    ) continue;
    context.globalAlpha = 0.22;
    context.fillStyle = "#5bc8bc";
    for (let stripe = 0; stripe < 4; stripe += 1) {
      const stripeX = Math.round(topLeft.x + 2 + stripe * Math.max(2, (width - 5) / 4));
      const stripeY = Math.round(topLeft.y + ((frame * 7 + stripe * 11) % Math.max(10, height - 9)));
      const stripeHeight = 5 + ((stripe + frame) % 3) * 3;
      context.fillRect(stripeX, stripeY, stripe % 2 === 0 ? 2 : 1, Math.min(stripeHeight, topLeft.y + height - stripeY));
    }
    context.globalAlpha = 0.32;
    context.fillStyle = "#b3f2e5";
    for (let foam = 0; foam < 4; foam += 1) {
      const foamX = Math.round(topLeft.x + 2 + ((foam * 13 + frame * 5) % Math.max(4, width - 5)));
      const foamY = Math.round(topLeft.y + height - 3 + ((foam + frame) % 2));
      context.fillRect(foamX, foamY, foam % 2 === 0 ? 4 : 2, 1);
    }
  }
  context.globalAlpha = 0.24;
  context.fillStyle = "#79d8ce";
  for (let index = 0; index < MOSS_ROOT_WATER_RIPPLES.length; index += 1) {
    const ripple = MOSS_ROOT_WATER_RIPPLES[index]!;
    const center = mossRootBackdropSourceToWorld({ x: ripple.x, y: ripple.y });
    const width = Math.max(8, Math.round(ripple.width * MOSS_ROOT_BACKDROP_TRANSFORM.worldRect.width / MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth));
    if (
      center.x + width < camera.x || center.x - width > camera.x + camera.viewportWidth ||
      center.y < camera.y - 4 || center.y > camera.y + camera.viewportHeight + 4
    ) continue;
    const shift = (frame + index) % 4;
    context.fillRect(Math.round(center.x - width * 0.45 + shift), Math.round(center.y), Math.round(width * 0.35), 1);
    context.fillRect(Math.round(center.x + width * 0.08 - shift), Math.round(center.y + 3), Math.round(width * 0.28), 1);
  }
  context.globalAlpha = 1;
  context.restore();
}

export function drawMossRootRuinsBackground(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): void {
  const camera = snapshot.camera;
  context.fillStyle = MOSS_PALETTE.voidDeep;
  context.fillRect(camera.x, camera.y, camera.viewportWidth, camera.viewportHeight);
  const backdropReady = mossRootBackdropReady();
  const startColumn = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
  const endColumn = Math.min(
    MOSS_ROOT_RUINS.columns - 1,
    Math.ceil((camera.x + camera.viewportWidth) / TILE_SIZE) + 1,
  );
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
  const endRow = Math.min(
    MOSS_ROOT_RUINS.rows - 1,
    Math.ceil((camera.y + camera.viewportHeight) / TILE_SIZE) + 1,
  );
  const waveFrame = Math.floor(snapshot.time * 3) % 3;

  if (backdropReady && mossRootBackdrop) {
    const sourceStart = mossRootBackdropWorldToSource({ x: camera.x, y: camera.y });
    const sourceEnd = mossRootBackdropWorldToSource({
      x: camera.x + camera.viewportWidth,
      y: camera.y + camera.viewportHeight,
    });
    const sourceX = sourceStart.x;
    const sourceY = sourceStart.y;
    const sourceWidth = sourceEnd.x - sourceStart.x;
    const sourceHeight = sourceEnd.y - sourceStart.y;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      mossRootBackdrop,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      camera.x,
      camera.y,
      camera.viewportWidth,
      camera.viewportHeight,
    );
  }

  if (!backdropReady) {
    // The procedural terrain is retained strictly as an image-load failure
    // fallback. It is never blended over the authored backdrop.
    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        const tile = tileAt(column, row);
        if (tile === "void") drawVoidTile(context, column, row);
        else if (tile === "water") drawWaterTile(context, column, row, waveFrame);
        else if (tile === "bridge") drawBridgeTile(context, column, row);
        else if (tile === "root") drawRootTile(context, column, row);
        else if (tile === "wall") drawWallTile(context, column, row);
        else drawFloorTile(context, column, row);
      }
    }
    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        const tile = tileAt(column, row);
        const x = column * TILE_SIZE;
        const y = row * TILE_SIZE;
        if (isWalkableTile(tile)) {
          drawFloorEdgeMoss(context, x, y, walkableNeighborMask(column, row), variantHash(column, row, 14));
        } else if (tile === "water") {
          const waterMask = mossRootNeighborMask(column, row, "water");
          const tone = variantHash(column, row, 15);
          if (!(waterMask & NORTH)) drawWaterBank(context, x, y, NORTH, tone);
          if (!(waterMask & EAST)) drawWaterBank(context, x, y, EAST, tone);
          if (!(waterMask & SOUTH)) drawWaterBank(context, x, y, SOUTH, tone);
          if (!(waterMask & WEST)) drawWaterBank(context, x, y, WEST, tone);
        }
      }
    }
    context.save();
    drawAncientPlazaMosaic(context, snapshot, MOSS_ROOT_LANDMARKS.transferPlaza.x, MOSS_ROOT_LANDMARKS.transferPlaza.y, 148, 92, 1, true);
    drawAncientPlazaMosaic(context, snapshot, MOSS_ROOT_LANDMARKS.introPlaza.x, MOSS_ROOT_LANDMARKS.introPlaza.y, 126, 101, 3);
    drawAncientPlazaMosaic(context, snapshot, MOSS_ROOT_LANDMARKS.centralPlaza.x, MOSS_ROOT_LANDMARKS.centralPlaza.y, 130, 101, 4, true);
    drawAncientPlazaMosaic(context, snapshot, MOSS_ROOT_LANDMARKS.rightPlaza.x, MOSS_ROOT_LANDMARKS.rightPlaza.y, 132, 103, 5);
    drawAncientPlazaMosaic(context, snapshot, MOSS_ROOT_LANDMARKS.finalPlaza.x, MOSS_ROOT_LANDMARKS.finalPlaza.y, 136, 103, 6, true);
    drawSceneDecorations(context, snapshot);
    context.restore();
  } else {
    drawMossRootWaterAnimation(context, snapshot.time, camera);
  }

  drawRootGateLightPath(context, snapshot.gateUnlockProgress);

  drawRootGate(
    context,
    snapshot.northGateUnlocked,
    snapshot.gateUnlockProgress,
  );
}

/** The crystal shares the actors' footpoint depth order, using its solid stone base. */
export function mossRootCrystalDepthY(): number {
  return MOSS_ROOT_SOLID_PROPS[0].center.y;
}

export function drawMossRootRuinsCrystal(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): void {
  drawTransferCrystal(
    context,
    MOSS_ROOT_RUINS.crystal.x,
    MOSS_ROOT_RUINS.crystal.y,
    snapshot.time,
    snapshot.northGateUnlocked,
    snapshot.gateUnlockProgress,
  );
}

function drawMossRootNavigationQa(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): void {
  if (!SHOW_MOSS_NAV_QA) return;
  context.save();
  context.fillStyle = "rgba(112,24,30,0.2)";
  context.fillRect(
    snapshot.camera.x,
    snapshot.camera.y,
    snapshot.camera.viewportWidth,
    snapshot.camera.viewportHeight,
  );
  const sourceScaleX = MOSS_ROOT_BACKDROP_TRANSFORM.worldRect.width / MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth;
  const sourceScaleY = MOSS_ROOT_BACKDROP_TRANSFORM.worldRect.height / MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight;
  const sourceStartY = Math.max(0, Math.floor(mossRootBackdropWorldToSource({
    x: snapshot.camera.x,
    y: snapshot.camera.y,
  }).y));
  const sourceEndY = Math.min(
    MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight - 1,
    Math.ceil(mossRootBackdropWorldToSource({
      x: snapshot.camera.x,
      y: snapshot.camera.y + snapshot.camera.viewportHeight,
    }).y),
  );
  context.fillStyle = "rgba(65,220,145,0.34)";
  for (let sourceY = sourceStartY; sourceY <= sourceEndY; sourceY += 1) {
    const worldY = Math.floor(sourceY * sourceScaleY);
    for (const span of MOSS_ROOT_NAV_MASK_ROWS[sourceY] ?? []) {
      context.fillRect(
        Math.floor(span[0] * sourceScaleX),
        worldY,
        Math.ceil((span[1] - span[0]) * sourceScaleX),
        Math.ceil(sourceScaleY),
      );
    }
  }

  context.fillStyle = "rgba(244,79,76,0.62)";
  if (!snapshot.northGateUnlocked) {
    const blocker = MOSS_ROOT_GATE_TRANSFORM.collision;
    context.save();
    context.translate(blocker.center.x, blocker.center.y);
    context.rotate(blocker.rotation);
    context.fillRect(-blocker.width * 0.5, -blocker.height * 0.5, blocker.width, blocker.height);
    context.restore();
  }
  const blockers = [
    !snapshot.clearedEncounters.includes("mossGate") ? MOSS_ROOT_NAV_BLOCKERS.layerGate : null,
  ];
  for (const blocker of blockers) {
    if (blocker) context.fillRect(blocker.x, blocker.y, blocker.width, blocker.height);
  }
  context.strokeStyle = "rgba(255,108,99,0.9)";
  context.lineWidth = 2;
  for (const prop of MOSS_ROOT_SOLID_PROPS) {
    context.beginPath();
    context.ellipse(prop.center.x, prop.center.y, prop.radiusX, prop.radiusY, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = "#ffe36b";
  for (const group of MOSS_ROOT_ENCOUNTERS) {
    for (const enemy of group.enemies) context.fillRect(enemy.x - 2, enemy.y - 2, 5, 5);
  }
  context.fillStyle = "#ffffff";
  context.fillRect(MOSS_ROOT_RUINS.spawn.x - 3, MOSS_ROOT_RUINS.spawn.y - 3, 7, 7);
  context.lineWidth = 1;
  context.strokeStyle = "rgba(255,255,255,0.95)";
  for (const member of snapshot.party) {
    if (member.downed) continue;
    context.beginPath();
    context.ellipse(member.pos.x, member.pos.y, member.radius, member.radius, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.strokeStyle = "rgba(255,214,92,0.82)";
  for (const enemy of snapshot.enemies) {
    if (!enemy.alive) continue;
    context.beginPath();
    context.ellipse(enemy.pos.x, enemy.pos.y, enemy.radius, enemy.radius, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

export function drawMossRootRuinsForeground(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
): void {
  const camera = snapshot.camera;
  const startRow = Math.max(0, Math.floor(camera.y / 64) - 1);
  const endRow = Math.min(
    Math.ceil(MOSS_ROOT_RUINS.height / 64),
    Math.ceil((camera.y + camera.viewportHeight) / 64) + 1,
  );
  const startX = Math.max(40, Math.floor((camera.x - 97) / 97) * 97 + 40);
  const endX = Math.min(MOSS_ROOT_RUINS.width, camera.x + camera.viewportWidth + 97);
  for (let row = startRow; row <= endRow; row += 1) {
    for (let x = startX; x < endX; x += 97) {
      const density = hash2d(x, row);
      if (density < 0.79) continue;
      const y = row * 64 + 50 + Math.floor(density * 7);
      context.fillStyle = "rgba(20,44,31,0.62)";
      context.fillRect(x, y, 2, 9);
      context.fillRect(x + 2, y + 3, 2, 5);
      if (density > 0.93) {
        context.fillStyle = "rgba(81,105,57,0.46)";
        context.fillRect(x + 3, y + 1, 3, 2);
      }
    }
  }

  // Sparse mineral motes add cave atmosphere without obscuring actors or HUD.
  const moteStartX = Math.max(24, Math.floor((camera.x - 113) / 113) * 113 + 24);
  const moteEndX = Math.min(MOSS_ROOT_RUINS.width, camera.x + camera.viewportWidth + 113);
  const moteStartRow = Math.max(0, Math.floor((camera.y - 127) / 127));
  const moteEndRow = Math.min(
    Math.ceil(MOSS_ROOT_RUINS.height / 127),
    Math.ceil((camera.y + camera.viewportHeight + 127) / 127),
  );
  for (let row = moteStartRow; row <= moteEndRow; row += 1) {
    for (let x = moteStartX; x < moteEndX; x += 113) {
      const density = hash2d(x + 37, row * 29);
      if (density < 0.74) continue;
      const baseY = row * 127 + 31 + Math.floor(density * 41);
      const drift = Math.round(Math.sin(snapshot.time * 0.8 + x * 0.02 + row) * 3);
      context.fillStyle = density > 0.9 ? "rgba(91,211,196,0.48)" : "rgba(45,132,121,0.32)";
      context.fillRect(x, baseY + drift, density > 0.92 ? 2 : 1, 1);
    }
  }

  drawMossRootNavigationQa(context, snapshot);
}
