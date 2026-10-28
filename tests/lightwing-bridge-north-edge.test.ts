import { describe, expect, it } from "vitest";
import redlineMask from "../assets/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-walkability-v1.rle.json";
import correctedMask from "../assets/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-walkability-v2.rle.json";
import {
  lightwingNavigationSourcePixel,
  lightwingSourceToWorld,
  lightwingWorldToSource,
} from "../src/stage/maps/lightwingCrystalCavernMap";
import {
  isLightwingPositionWalkable,
  resolveLightwingMovement,
} from "../src/stage/lightwingCrystalCavernCollision";

type Span = readonly [number, number];
type Rows = readonly (readonly Span[])[];
const WIDTH = 1638;
const HEIGHT = 960;

function unpack(rows: Rows): Uint8Array {
  const pixels = new Uint8Array(WIDTH * HEIGHT);
  rows.forEach((spans, y) => spans.forEach(([left, right]) => {
    pixels.fill(1, y * WIDTH + left, y * WIDTH + right);
  }));
  return pixels;
}

describe("Layer 2 bridge north-edge correction", () => {
  it("deletes only approved bridge pixels and preserves the original static floor and south edge", () => {
    expect(correctedMask.staticRows).toEqual(redlineMask.staticRows);
    const before = unpack(redlineMask.bridgeRows as unknown as Rows);
    const after = unpack(correctedMask.bridgeRows as unknown as Rows);
    let removed = 0;
    let added = 0;
    let removedOutsideBridge = 0;
    for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
      if (after[index] && !before[index]) added += 1;
      if (before[index] && !after[index]) {
        const x = index % WIDTH;
        if (x < 800 || x > 1170) removedOutsideBridge += 1;
        removed += 1;
      }
    }
    expect(added).toBe(0);
    expect(removedOutsideBridge).toBe(0);
    expect(removed).toBe(6025);
    expect(correctedMask.removedBridgePixels).toBe(removed);
    for (let x = 800; x <= 1170; x += 1) {
      let oldSouth = -1;
      let newSouth = -1;
      for (let y = 350; y < 450; y += 1) {
        if (before[y * WIDTH + x]) oldSouth = y;
        if (after[y * WIDTH + x]) newSouth = y;
      }
      expect(newSouth, `south edge at ${x}`).toBe(oldSouth);
    }
  });

  it("blocks the former north-water strip while leaving the paved crossing open", () => {
    for (const [x, y] of [[950, 365], [1000, 365], [950, 350], [1000, 350]] as const) {
      expect(lightwingNavigationSourcePixel(x, y, true), `${x},${y}`).toBe(false);
    }
    for (const [x, y] of [[825, 395], [950, 380], [1000, 390], [1150, 395]] as const) {
      expect(lightwingNavigationSourcePixel(x, y, true), `${x},${y}`).toBe(true);
      expect(lightwingNavigationSourcePixel(x, y, false), `locked ${x},${y}`).toBe(false);
    }
  });

  it("stops normal, fast, diagonal, and knockback-sized movement at the north edge", () => {
    for (const [x, y, north] of [[825, 395, 386], [950, 390, 376], [1000, 390, 375], [1100, 395, 381]] as const) {
      const start = lightwingSourceToWorld({ x, y });
      for (const radius of [1, 9, 22]) {
        const ended = resolveLightwingMovement(
          start,
          lightwingSourceToWorld({ x, y: 330 }),
          radius,
          { crystalPathUnlocked: true },
        );
        const source = lightwingWorldToSource(ended);
        expect(Math.floor(source.y + 1e-7), `${x},radius=${radius}`).toBeGreaterThanOrEqual(north);
        expect(isLightwingPositionWalkable(ended, radius, { crystalPathUnlocked: true })).toBe(true);
      }
    }
    const diagonal = resolveLightwingMovement(
      lightwingSourceToWorld({ x: 850, y: 395 }),
      lightwingSourceToWorld({ x: 1050, y: 330 }),
      9,
      { crystalPathUnlocked: true },
    );
    expect(lightwingWorldToSource(diagonal).y).toBeGreaterThan(370);
    expect(isLightwingPositionWalkable(diagonal, 9, { crystalPathUnlocked: true })).toBe(true);
  });

  it("still crosses both shore joins in either direction after unlocking", () => {
    const west = lightwingSourceToWorld({ x: 760, y: 395 });
    const east = lightwingSourceToWorld({ x: 1190, y: 395 });
    expect(resolveLightwingMovement(west, east, 9, { crystalPathUnlocked: true }).x).toBeCloseTo(east.x, 3);
    expect(resolveLightwingMovement(east, west, 9, { crystalPathUnlocked: true }).x).toBeCloseTo(west.x, 3);
    expect(resolveLightwingMovement(west, east, 9, { crystalPathUnlocked: false }).x).toBeLessThan(
      lightwingSourceToWorld({ x: 800, y: 395 }).x,
    );
  });
});
