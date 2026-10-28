import { hash2d } from "../../game/math";
import { TRANSFER_CHAMBER } from "../../stage/roomDefinitions";

const { bounds } = TRANSFER_CHAMBER;

export function drawTransferChamberBackground(
  context: CanvasRenderingContext2D,
  time: number,
  northGateUnlocked = false,
): void {
  context.fillStyle = "#061210";
  context.fillRect(0, 0, 640, 360);

  context.fillStyle = "#0a1d19";
  context.fillRect(bounds.left - 10, bounds.top - 10, bounds.right - bounds.left + 20, bounds.bottom - bounds.top + 20);
  context.fillStyle = "#22372e";
  context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  context.fillStyle = "#1a2d26";
  context.fillRect(bounds.left + 4, bounds.top + 4, bounds.right - bounds.left - 8, bounds.bottom - bounds.top - 8);

  for (let y = bounds.top + 10; y < bounds.bottom - 6; y += 20) {
    for (let x = bounds.left + 8; x < bounds.right - 6; x += 22) {
      const jitterX = Math.floor(hash2d(x, y) * 5);
      const jitterY = Math.floor(hash2d(y, x) * 4);
      const tone = hash2d(x + 31, y - 17);
      context.fillStyle = tone > 0.66
        ? "#304238"
        : tone > 0.34
          ? "#283a31"
          : "#20342c";
      context.fillRect(x + jitterX, y + jitterY, 15, 10);
      context.fillStyle = tone > 0.55 ? "#425247" : "#293c33";
      context.fillRect(x + jitterX + 1, y + jitterY + 1, 12, 1);
      if (tone < 0.13) {
        context.fillStyle = "#44633d";
        context.fillRect(x + jitterX + 3, y + jitterY + 7, 4, 2);
      }
    }
  }

  drawOuterWalls(context);
  drawNorthGate(context, time, northGateUnlocked);
  drawTransferPedestal(context, time);
  drawWallCrystals(context, time);
}

export function drawTransferChamberForeground(
  context: CanvasRenderingContext2D,
): void {
  context.fillStyle = "#15251f";
  context.fillRect(bounds.left - 3, bounds.bottom - 3, bounds.right - bounds.left + 6, 5);
  context.fillStyle = "#506044";
  for (let x = bounds.left + 10; x < bounds.right - 8; x += 34) {
    const height = 2 + Math.floor(hash2d(x, bounds.bottom) * 3);
    context.fillRect(x, bounds.bottom - height, 14, height);
  }
  context.fillStyle = "#3a623c";
  context.fillRect(86, 111, 18, 3);
  context.fillRect(530, 113, 22, 3);
  context.fillStyle = "#66894b";
  context.fillRect(90, 109, 7, 2);
  context.fillRect(544, 110, 6, 2);
}

function drawOuterWalls(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#0a1713";
  context.fillRect(bounds.left - 8, bounds.top - 8, bounds.right - bounds.left + 16, 9);
  context.fillRect(bounds.left - 8, bounds.bottom, bounds.right - bounds.left + 16, 9);
  context.fillRect(bounds.left - 8, bounds.top, 9, bounds.bottom - bounds.top);
  context.fillRect(bounds.right, bounds.top, 9, bounds.bottom - bounds.top);

  for (let x = bounds.left; x < bounds.right; x += 23) {
    const blockHeight = 10 + Math.floor(hash2d(x, 8) * 8);
    context.fillStyle = "#39453a";
    context.fillRect(x, bounds.top - blockHeight, 18, blockHeight);
    context.fillStyle = "#17251f";
    context.fillRect(x + 2, bounds.top - blockHeight + 3, 14, blockHeight - 3);
    context.fillStyle = "#526051";
    context.fillRect(x + 2, bounds.top - blockHeight + 2, 11, 2);
  }

  context.fillStyle = "#38483b";
  context.fillRect(bounds.left, bounds.top, 188, 47);
  context.fillRect(394, bounds.top, 188, 47);
  context.fillStyle = "#1d2d26";
  context.fillRect(bounds.left + 5, bounds.top + 5, 178, 38);
  context.fillRect(399, bounds.top + 5, 178, 38);
  for (let x = bounds.left + 9; x < 238; x += 24) {
    context.fillStyle = "#52604e";
    context.fillRect(x, bounds.top + 9, 15, 2);
  }
  for (let x = 404; x < bounds.right - 7; x += 24) {
    context.fillStyle = "#52604e";
    context.fillRect(x, bounds.top + 9, 15, 2);
  }
}

function drawNorthGate(
  context: CanvasRenderingContext2D,
  time: number,
  unlocked: boolean,
): void {
  const gateLeft = 246;
  const gateTop = bounds.top;
  const pulse = 0.62 + Math.sin(time * 2) * 0.08;
  context.fillStyle = "#101e1a";
  context.fillRect(gateLeft, gateTop, 148, 51);
  context.fillStyle = "#4c5947";
  context.fillRect(gateLeft + 5, gateTop + 4, 138, 43);
  context.fillStyle = "#26372e";
  context.fillRect(gateLeft + 10, gateTop + 8, 128, 38);
  context.fillStyle = "#67705a";
  context.fillRect(gateLeft + 15, gateTop + 11, 56, 4);
  context.fillRect(gateLeft + 77, gateTop + 11, 46, 4);
  if (unlocked) {
    context.fillStyle = "#0b1714";
    context.fillRect(307, gateTop + 7, 26, 41);
    context.globalAlpha = pulse * 0.65;
    context.fillStyle = "#62dfd0";
    context.fillRect(317, gateTop + 13, 6, 26);
    context.globalAlpha = 1;
    context.fillStyle = "#52724a";
    context.fillRect(gateLeft + 14, gateTop + 43, 23, 3);
    context.fillRect(gateLeft + 105, gateTop + 43, 22, 3);
    return;
  }
  context.fillStyle = "#172720";
  context.fillRect(315, gateTop + 8, 10, 38);
  context.globalAlpha = pulse;
  context.fillStyle = "#5bd4c6";
  context.fillRect(318, gateTop + 15, 4, 17);
  context.fillStyle = "#bcfff0";
  context.fillRect(319, gateTop + 17, 2, 10);
  context.globalAlpha = 1;
  context.fillStyle = "#3b693d";
  context.fillRect(gateLeft + 16, gateTop + 43, 20, 3);
  context.fillRect(gateLeft + 104, gateTop + 43, 24, 3);
}

function drawTransferPedestal(context: CanvasRenderingContext2D, time: number): void {
  const pulse = 0.68 + Math.sin(time * 2.2) * 0.14;
  context.globalAlpha = 0.26;
  context.strokeStyle = "#5fd8ca";
  context.lineWidth = 1;
  for (let ring = 0; ring < 2; ring += 1) {
    context.beginPath();
    context.ellipse(320, 214, 30 + ring * 7, 15 + ring * 4, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
  context.fillStyle = "#14241f";
  context.beginPath();
  context.ellipse(320, 218, 27, 11, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#5a6552";
  context.beginPath();
  context.ellipse(320, 215, 24, 9, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#263c33";
  context.beginPath();
  context.ellipse(320, 213, 20, 7, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = pulse;
  context.fillStyle = "#49cfc4";
  context.beginPath();
  context.moveTo(320, 183);
  context.lineTo(327, 201);
  context.lineTo(323, 211);
  context.lineTo(316, 208);
  context.lineTo(312, 199);
  context.closePath();
  context.fill();
  context.fillStyle = "#c6fff3";
  context.fillRect(318, 188, 3, 16);
  context.globalAlpha = 1;
  context.fillStyle = "#367a71";
  context.fillRect(310, 212, 20, 2);
}

function drawWallCrystals(context: CanvasRenderingContext2D, time: number): void {
  const crystals = [
    [78, 132], [555, 131], [85, 288], [551, 286],
  ] as const;
  for (const [index, [x, y]] of crystals.entries()) {
    const pulse = 0.55 + Math.sin(time * 2.6 + index) * 0.16;
    context.globalAlpha = pulse;
    context.fillStyle = "#42c7be";
    context.beginPath();
    context.moveTo(x, y - 13);
    context.lineTo(x + 5, y - 1);
    context.lineTo(x + 1, y + 6);
    context.lineTo(x - 5, y + 3);
    context.closePath();
    context.fill();
    context.fillStyle = "#b9fff0";
    context.fillRect(x - 1, y - 9, 2, 8);
    context.globalAlpha = 1;
    context.fillStyle = "#1b2a23";
    context.fillRect(x - 8, y + 5, 16, 4);
  }
}
