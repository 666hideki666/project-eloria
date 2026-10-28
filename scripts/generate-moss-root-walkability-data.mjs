import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

// The user-traced red boundary is the sole navigation authority. The older
// grayscale walkability image and floor-region ellipses are deliberately unused.
const maskPath = "assets/environments/moss-root-ruins/moss-root-ruins-walkability-red-v3.png";
const dataPath = "assets/environments/moss-root-ruins/moss-root-ruins-walkability-v2.rle.json";
const routePath = "assets/environments/moss-root-ruins/moss-root-ruins-required-route-v3.json";
const widthRequired = 1295;
const heightRequired = 1214;
const routeFootRadius = 0;
const routeWaypoints = [
  ["start", 648, 1160],
  ["battle1", 648, 1000],
  ["battle2", 648, 680],
  // The pedestal is solid; this point is on the walkable west interaction side.
  ["crystal", 1131, 525],
  ["rootApproach", 648, 360],
  ["rootBeyond", 648, 235],
  ["final", 648, 150],
  ["exit", 648, 20],
];
const blockedFixtures = [
  [800, 360], [850, 380], [900, 405], [840, 520], [890, 570],
  [188, 130], [283, 410], [949, 390], [110, 680],
  [437, 790], [845, 790], [250, 985], [1025, 980],
  [620, 20], [695, 20], [1015, 551], [1030, 552],
];
const walkableFixtures = [
  [648, 1160], [648, 1000], [648, 680], [648, 400], [648, 150], [648, 20],
  [202, 526], [510, 680], [760, 420], [830, 450], [920, 495],
  [1140, 515], [1129, 525], [1160, 525], [1190, 525],
  [1015, 549], [1030, 550],
];

function parseGrayscalePng(path) {
  const png = readFileSync(path);
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`Not a PNG: ${path}`);
  }
  let width = 0;
  let height = 0;
  const compressed = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const kind = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 0 || data[12] !== 0) {
        throw new Error("Walkability PNG must be 8-bit, non-interlaced grayscale");
      }
    } else if (kind === "IDAT") {
      compressed.push(data);
    } else if (kind === "IEND") {
      break;
    }
    offset += length + 12;
  }
  if (width !== widthRequired || height !== heightRequired || !compressed.length) {
    throw new Error(`Unexpected walkability PNG dimensions or missing IDAT: ${width}x${height}`);
  }
  const raw = inflateSync(Buffer.concat(compressed));
  if (raw.length !== (width + 1) * height) throw new Error("Unexpected walkability PNG data length");
  const pixels = new Uint8Array(width * height);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor++];
    if (filter > 4) throw new Error(`Unsupported PNG row filter: ${filter}`);
    for (let x = 0; x < width; x += 1) {
      const left = x ? pixels[y * width + x - 1] : 0;
      const above = y ? pixels[(y - 1) * width + x] : 0;
      const upperLeft = x && y ? pixels[(y - 1) * width + x - 1] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const estimate = left + above - upperLeft;
        const leftError = Math.abs(estimate - left);
        const aboveError = Math.abs(estimate - above);
        const cornerError = Math.abs(estimate - upperLeft);
        predictor = leftError <= aboveError && leftError <= cornerError
          ? left : aboveError <= cornerError ? above : upperLeft;
      }
      const value = (raw[cursor++] + predictor) & 255;
      if (value !== 0 && value !== 255) throw new Error(`Walkability PNG must be binary at ${x},${y}`);
      pixels[y * width + x] = value;
    }
  }
  return { png, width, height, pixels };
}

function buildRows(pixels, width, height) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const spans = [];
    let start = -1;
    for (let x = 0; x < width; x += 1) {
      const walkable = pixels[y * width + x] === 255;
      if (walkable && start < 0) start = x;
      if (!walkable && start >= 0) {
        spans.push([start, x]);
        start = -1;
      }
    }
    if (start >= 0) spans.push([start, width]);
    rows.push(spans);
  }
  return rows;
}

function erodeForFootprint(pixels, width, height, radius) {
  const safe = new Uint8Array(width * height);
  const offsets = [];
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radius * radius) offsets.push([x, y]);
    }
  }
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      let valid = true;
      for (const [offsetX, offsetY] of offsets) {
        if (pixels[(y + offsetY) * width + x + offsetX] !== 255) {
          valid = false;
          break;
        }
      }
      if (valid) safe[y * width + x] = 1;
    }
  }
  return safe;
}

function findRoute(safe, width, height, start, goal) {
  const startIndex = start[1] * width + start[0];
  const goalIndex = goal[1] * width + goal[0];
  if (!safe[startIndex]) throw new Error(`Route start is outside eroded mask: ${start}`);
  if (!safe[goalIndex]) throw new Error(`Route goal is outside eroded mask: ${goal}`);
  const parent = new Int32Array(width * height);
  parent.fill(-2);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIndex;
  parent[startIndex] = -1;
  const moves = [-width, 1, width, -1];
  while (head < tail && parent[goalIndex] === -2) {
    const current = queue[head++];
    const x = current % width;
    for (const move of moves) {
      const next = current + move;
      if (next < 0 || next >= safe.length || parent[next] !== -2 || !safe[next]) continue;
      if ((move === 1 && x === width - 1) || (move === -1 && x === 0)) continue;
      parent[next] = current;
      queue[tail++] = next;
      if (next === goalIndex) break;
    }
  }
  if (parent[goalIndex] === -2) throw new Error(`No eroded-mask route from ${start} to ${goal}`);
  const reversed = [];
  for (let current = goalIndex; current >= 0; current = parent[current]) {
    reversed.push([current % width, Math.floor(current / width)]);
  }
  reversed.reverse();
  const simplified = [];
  let previousDirection = null;
  for (let index = 0; index < reversed.length; index += 1) {
    const point = reversed[index];
    const next = reversed[index + 1];
    const direction = next ? [next[0] - point[0], next[1] - point[1]] : null;
    if (index === 0 || !direction || !previousDirection || direction[0] !== previousDirection[0] || direction[1] !== previousDirection[1]) {
      simplified.push(point);
    }
    previousDirection = direction;
  }
  return simplified;
}

const { png, width, height, pixels } = parseGrayscalePng(maskPath);
for (const [x, y] of blockedFixtures) {
  if (pixels[y * width + x] !== 0) throw new Error(`Known water/void fixture must be blocked: ${x},${y}`);
}
for (const [x, y] of walkableFixtures) {
  if (pixels[y * width + x] !== 255) throw new Error(`Known visible-floor fixture must be walkable: ${x},${y}`);
}
const rows = buildRows(pixels, width, height);
const sha256 = createHash("sha256").update(png).digest("hex");
const generated = {
  version: 5,
  coordinateSpace: "moss-root-ruins-red-boundary-native-raster",
  sourceWidth: width,
  sourceHeight: height,
  sha256,
  rows,
};
const safe = erodeForFootprint(pixels, width, height, routeFootRadius);
const routePoints = [];
for (let index = 0; index < routeWaypoints.length - 1; index += 1) {
  const from = routeWaypoints[index];
  const to = routeWaypoints[index + 1];
  const segment = findRoute(safe, width, height, [from[1], from[2]], [to[1], to[2]]);
  if (routePoints.length) segment.shift();
  routePoints.push(...segment);
}
for (const [x, y] of routePoints) {
  if (!safe[y * width + x]) throw new Error(`Generated route left eroded mask at ${x},${y}`);
}
const generatedRoute = {
  version: 4,
  maskSha256: sha256,
  footprintRadiusPixels: routeFootRadius,
  waypoints: Object.fromEntries(routeWaypoints.map(([name, x, y]) => [name, [x, y]])),
  points: routePoints,
};
if (process.argv.includes("--check")) {
  const committed = JSON.parse(readFileSync(dataPath, "utf8"));
  const committedRoute = JSON.parse(readFileSync(routePath, "utf8"));
  if (JSON.stringify(committed) !== JSON.stringify(generated)) {
    throw new Error(`Generated walkability data is stale. Run: node ${process.argv[1]}`);
  }
  if (JSON.stringify(committedRoute) !== JSON.stringify(generatedRoute)) {
    throw new Error(`Generated required route is stale. Run: node ${process.argv[1]}`);
  }
  console.log(`walkability mask OK: ${width}x${height}, binary, ${sha256.slice(0, 12)}, route ${routePoints.length} points`);
} else {
  writeFileSync(dataPath, `${JSON.stringify(generated)}\n`);
  writeFileSync(routePath, `${JSON.stringify(generatedRoute)}\n`);
  console.log(`wrote ${dataPath}: ${rows.reduce((sum, row) => sum + row.length, 0)} spans`);
  console.log(`wrote ${routePath}: ${routePoints.length} safe route points`);
}
