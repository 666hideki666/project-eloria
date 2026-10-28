import { hash2d } from "../../game/math";
import { MOSS_CORRIDOR } from "../../stage/roomDefinitions";

const { bounds } = MOSS_CORRIDOR;

export function drawMossCorridorBackground(
  context: CanvasRenderingContext2D,
  time: number,
): void {
  context.fillStyle = "#06120f";
  context.fillRect(0, 0, 640, 360);
  context.fillStyle = "#0c2019";
  context.fillRect(bounds.left - 10, bounds.top - 10, bounds.right - bounds.left + 20, bounds.bottom - bounds.top + 20);
  context.fillStyle = "#293a30";
  context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  context.fillStyle = "#1b3027";
  context.fillRect(bounds.left + 4, bounds.top + 4, bounds.right - bounds.left - 8, bounds.bottom - bounds.top - 8);

  for (let y = bounds.top + 8; y < bounds.bottom - 5; y += 14) {
    for (let x = bounds.left + 7; x < bounds.right - 5; x += 17) {
      const jitterX = Math.floor(hash2d(x, y) * 4);
      const jitterY = Math.floor(hash2d(y, x) * 3);
      const tone = hash2d(x + 19, y - 11);
      context.fillStyle = tone > 0.68
        ? "#3b4b3a"
        : tone > 0.35
          ? "#304334"
          : "#26382e";
      context.fillRect(x + jitterX, y + jitterY, 11, 7);
      context.fillStyle = tone > 0.5 ? "#53614b" : "#354a37";
      context.fillRect(x + jitterX + 1, y + jitterY + 1, 8, 1);
      if (tone < 0.18) {
        context.fillStyle = "#55713d";
        context.fillRect(x + jitterX + 2, y + jitterY + 5, 4, 2);
      }
    }
  }

  drawWalls(context);
  drawGates(context, time);
  drawSideCrystals(context, time);
}

export function drawMossCorridorForeground(
  context: CanvasRenderingContext2D,
): void {
  context.fillStyle = "#182b20";
  context.fillRect(bounds.left - 3, bounds.bottom - 3, bounds.right - bounds.left + 6, 5);
  for (const [x, y, width] of [[122, 215, 31], [485, 223, 26], [140, 300, 42], [456, 296, 39]] as const) {
    context.fillStyle = "#315638";
    context.fillRect(x, y, width, 3);
    context.fillStyle = "#68874a";
    context.fillRect(x + 4, y - 2, Math.max(4, width - 15), 2);
  }
}

function drawWalls(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#091711";
  context.fillRect(bounds.left - 8, bounds.top - 8, bounds.right - bounds.left + 16, 9);
  context.fillRect(bounds.left - 8, bounds.bottom, bounds.right - bounds.left + 16, 9);
  context.fillRect(bounds.left - 8, bounds.top, 9, bounds.bottom - bounds.top);
  context.fillRect(bounds.right, bounds.top, 9, bounds.bottom - bounds.top);
  context.fillStyle = "#3b4939";
  context.fillRect(bounds.left, bounds.top, 180, 50);
  context.fillRect(402, bounds.top, 180, 50);
  context.fillRect(bounds.left, 120, 60, 94);
  context.fillRect(522, 120, 60, 94);
  context.fillStyle = "#1c2c22";
  context.fillRect(bounds.left + 5, bounds.top + 5, 170, 41);
  context.fillRect(407, bounds.top + 5, 170, 41);
  context.fillRect(bounds.left + 5, 125, 50, 84);
  context.fillRect(527, 125, 50, 84);
  context.fillStyle = "#47613d";
  for (const [x, y, width] of [[72, 112, 49], [518, 115, 45], [66, 196, 34], [540, 178, 36]] as const) {
    context.fillRect(x, y, width, 3);
    context.fillRect(x + 7, y + 3, Math.max(7, width - 16), 2);
  }
}

function drawGates(context: CanvasRenderingContext2D, time: number): void {
  const pulse = 0.56 + Math.sin(time * 2.2) * 0.12;
  context.fillStyle = "#17271e";
  context.fillRect(238, bounds.top, 164, 50);
  context.fillStyle = "#3d513b";
  context.fillRect(244, bounds.top + 4, 152, 43);
  context.fillStyle = "#1a2c21";
  context.fillRect(250, bounds.top + 8, 140, 39);
  context.fillStyle = "#31583a";
  context.fillRect(255, bounds.top + 30, 132, 5);
  context.fillStyle = "#5a7a49";
  context.fillRect(259, bounds.top + 34, 38, 3);
  context.fillRect(342, bounds.top + 36, 32, 3);

  context.fillStyle = "#13241c";
  context.fillRect(244, bounds.bottom - 16, 152, 16);
  context.fillStyle = "#52614a";
  context.fillRect(250, bounds.bottom - 13, 140, 6);
  context.globalAlpha = pulse;
  context.fillStyle = "#49cfc3";
  context.fillRect(317, bounds.bottom - 12, 6, 5);
  context.globalAlpha = 1;
}

function drawSideCrystals(context: CanvasRenderingContext2D, time: number): void {
  const crystals = [[132, 156], [500, 147], [152, 267], [476, 262]] as const;
  for (const [index, [x, y]] of crystals.entries()) {
    context.globalAlpha = 0.54 + Math.sin(time * 2.5 + index) * 0.16;
    context.fillStyle = "#44c9bd";
    context.beginPath();
    context.moveTo(x, y - 11);
    context.lineTo(x + 4, y - 1);
    context.lineTo(x + 1, y + 5);
    context.lineTo(x - 5, y + 3);
    context.closePath();
    context.fill();
    context.fillStyle = "#c8fff0";
    context.fillRect(x - 1, y - 8, 2, 7);
    context.globalAlpha = 1;
  }
}
