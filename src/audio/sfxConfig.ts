import type { SfxBusName } from "./AudioManager";

export const SFX_CUE = {
  kyleNormal: "kyleNormal",
  kyleSpecial: "kyleSpecial",
  kyleUltimate: "kyleUltimate",
  kyleSwitch: "kyleSwitch",
  nadiNormal: "nadiNormal",
  nadiReturn: "nadiReturn",
  nadiSpecial: "nadiSpecial",
  nadiUltimate: "nadiUltimate",
  nadiSwitch: "nadiSwitch",
  meruNormal: "meruNormal",
  meruHeal: "meruHeal",
  meruUltimate: "meruUltimate",
  meruSwitch: "meruSwitch",
  hitNormal: "hitNormal",
  hitArmor: "hitArmor",
  armorBreak: "armorBreak",
  enemyDefeat: "enemyDefeat",
  switchCommon: "switchCommon",
  pickupLeaf: "pickupLeaf",
  pickupMana: "pickupMana",
  expGain: "expGain",
  levelUp: "levelUp",
  dialogueType: "dialogueType",
  crystalActivate: "crystalActivate",
  rootGateOpen: "rootGateOpen",
  crystalPlatformRise: "crystalPlatformRise",
  crystalPathComplete: "crystalPathComplete",
  healingSpringActivate: "healingSpringActivate",
  healingSpringComplete: "healingSpringComplete",
} as const;

export type SfxCue = (typeof SFX_CUE)[keyof typeof SFX_CUE];
export type OscillatorShape = OscillatorType;

export interface FilterTuning {
  type: BiquadFilterType;
  startHz: number;
  endHz?: number;
  q?: number;
}

export interface ToneLayerTuning {
  wave: OscillatorShape;
  startHz: number;
  endHz?: number;
  delay: number;
  duration: number;
  gain: number;
  attack?: number;
  pan?: number;
  filter?: FilterTuning;
  echo?: number;
}

export interface NoiseLayerTuning {
  delay: number;
  duration: number;
  gain: number;
  attack?: number;
  pan?: number;
  filter: FilterTuning;
  echo?: number;
}

export interface SfxDefinition {
  label: string;
  section: "カイル" | "ナディ" | "メル" | "共通";
  bus: SfxBusName;
  gain: number;
  maxVoices: number;
  minInterval: number;
  /** Applied only to the three normal attacks. */
  pitchJitter: number;
  tones: readonly ToneLayerTuning[];
  noises: readonly NoiseLayerTuning[];
}

/**
 * Every synthesis/timing value lives here so play-test tuning does not require
 * editing the combat code or the audio graph.
 */
export const SFX_LIBRARY: Record<SfxCue, SfxDefinition> = {
  kyleNormal: {
    label: "連刃剣",
    section: "カイル",
    bus: "character",
    gain: 0.72,
    maxVoices: 3,
    minInterval: 0.07,
    pitchJitter: 0.04,
    tones: [
      { wave: "triangle", startHz: 920, endHz: 390, delay: 0, duration: 0.13, gain: 0.12, pan: -0.08 },
    ],
    noises: [
      { delay: 0, duration: 0.145, gain: 0.34, pan: 0.08, filter: { type: "bandpass", startHz: 4300, endHz: 1700, q: 0.7 } },
    ],
  },
  kyleSpecial: {
    label: "破陣突き",
    section: "カイル",
    bus: "character",
    gain: 0.86,
    maxVoices: 2,
    minInterval: 0.18,
    pitchJitter: 0,
    tones: [
      { wave: "sawtooth", startHz: 760, endHz: 300, delay: 0.02, duration: 0.24, gain: 0.1, filter: { type: "lowpass", startHz: 2100, endHz: 900, q: 0.8 } },
      { wave: "triangle", startHz: 150, endHz: 86, delay: 0.19, duration: 0.12, gain: 0.28 },
    ],
    noises: [
      { delay: 0, duration: 0.28, gain: 0.3, filter: { type: "highpass", startHz: 2400, endHz: 900, q: 0.6 } },
    ],
  },
  kyleUltimate: {
    label: "裂空断",
    section: "カイル",
    bus: "character",
    gain: 0.9,
    maxVoices: 1,
    minInterval: 0.7,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 190, endHz: 520, delay: 0, duration: 0.22, gain: 0.16 },
      { wave: "triangle", startHz: 520, endHz: 170, delay: 0.2, duration: 0.63, gain: 0.15, filter: { type: "lowpass", startHz: 2200, endHz: 700 } },
      { wave: "sine", startHz: 116, endHz: 62, delay: 0.52, duration: 0.35, gain: 0.31 },
    ],
    noises: [
      { delay: 0.18, duration: 0.8, gain: 0.44, filter: { type: "bandpass", startHz: 3600, endHz: 580, q: 0.55 }, echo: 0.09 },
    ],
  },
  kyleSwitch: {
    label: "先陣斬り",
    section: "カイル",
    bus: "character",
    gain: 0.72,
    maxVoices: 2,
    minInterval: 0.12,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 1040, endHz: 440, delay: 0.07, duration: 0.13, gain: 0.13, pan: 0.1 },
    ],
    noises: [
      { delay: 0, duration: 0.2, gain: 0.3, pan: -0.1, filter: { type: "bandpass", startHz: 4800, endHz: 1500, q: 0.7 } },
    ],
  },
  nadiNormal: {
    label: "月輪投げ",
    section: "ナディ",
    bus: "character",
    gain: 0.66,
    maxVoices: 3,
    minInterval: 0.09,
    pitchJitter: 0.035,
    tones: [
      { wave: "triangle", startHz: 760, endHz: 610, delay: 0, duration: 0.23, gain: 0.17, pan: -0.35 },
      { wave: "sine", startHz: 1010, endHz: 820, delay: 0.025, duration: 0.19, gain: 0.1, pan: 0.4, echo: 0.055 },
    ],
    noises: [
      { delay: 0, duration: 0.2, gain: 0.12, pan: 0.15, filter: { type: "bandpass", startHz: 3200, endHz: 2100, q: 2 } },
    ],
  },
  nadiReturn: {
    label: "月輪・復路",
    section: "ナディ",
    bus: "character",
    gain: 0.48,
    maxVoices: 2,
    minInterval: 0.12,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 620, endHz: 480, delay: 0, duration: 0.14, gain: 0.17, pan: 0.28 },
    ],
    noises: [
      { delay: 0, duration: 0.13, gain: 0.1, pan: -0.25, filter: { type: "bandpass", startHz: 2300, endHz: 1500, q: 1.7 } },
    ],
  },
  nadiSpecial: {
    label: "円月旋",
    section: "ナディ",
    bus: "character",
    gain: 0.82,
    maxVoices: 2,
    minInterval: 0.24,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 420, endHz: 690, delay: 0, duration: 0.45, gain: 0.18, pan: -0.65 },
      { wave: "sine", startHz: 560, endHz: 380, delay: 0.05, duration: 0.42, gain: 0.16, pan: 0.65 },
    ],
    noises: [
      { delay: 0, duration: 0.5, gain: 0.27, filter: { type: "bandpass", startHz: 2700, endHz: 1100, q: 0.65 }, echo: 0.07 },
    ],
  },
  nadiUltimate: {
    label: "月蝕乱舞",
    section: "ナディ",
    bus: "character",
    gain: 0.88,
    maxVoices: 1,
    minInterval: 0.8,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 380, endHz: 620, delay: 0.02, duration: 0.28, gain: 0.18, pan: -0.5 },
      { wave: "triangle", startHz: 460, endHz: 700, delay: 0.31, duration: 0.28, gain: 0.19, pan: 0.5 },
      { wave: "triangle", startHz: 540, endHz: 760, delay: 0.59, duration: 0.3, gain: 0.2 },
      { wave: "sine", startHz: 126, endHz: 74, delay: 0.82, duration: 0.46, gain: 0.34 },
    ],
    noises: [
      { delay: 0, duration: 1.28, gain: 0.28, filter: { type: "bandpass", startHz: 2600, endHz: 650, q: 0.65 }, echo: 0.08 },
    ],
  },
  nadiSwitch: {
    label: "輪光掃",
    section: "ナディ",
    bus: "character",
    gain: 0.72,
    maxVoices: 2,
    minInterval: 0.12,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 620, endHz: 430, delay: 0.05, duration: 0.19, gain: 0.19, pan: 0.25 },
    ],
    noises: [
      { delay: 0.04, duration: 0.2, gain: 0.28, pan: -0.18, filter: { type: "bandpass", startHz: 3500, endHz: 1200, q: 0.7 } },
    ],
  },
  meruNormal: {
    label: "燐光弾",
    section: "メル",
    bus: "character",
    gain: 0.6,
    maxVoices: 3,
    minInterval: 0.085,
    pitchJitter: 0.035,
    tones: [
      { wave: "sine", startHz: 980, endHz: 710, delay: 0, duration: 0.21, gain: 0.2, echo: 0.06 },
      { wave: "triangle", startHz: 510, endHz: 690, delay: 0.015, duration: 0.17, gain: 0.09 },
    ],
    noises: [
      { delay: 0.03, duration: 0.17, gain: 0.07, filter: { type: "bandpass", startHz: 4300, endHz: 2800, q: 1.2 } },
    ],
  },
  meruHeal: {
    label: "癒しの環",
    section: "メル",
    bus: "character",
    gain: 0.68,
    maxVoices: 2,
    minInterval: 0.35,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 523, delay: 0, duration: 0.42, gain: 0.12, pan: -0.18, echo: 0.11 },
      { wave: "sine", startHz: 659, delay: 0.11, duration: 0.42, gain: 0.13, pan: 0.15, echo: 0.11 },
      { wave: "sine", startHz: 784, delay: 0.22, duration: 0.45, gain: 0.13, pan: -0.08, echo: 0.12 },
      { wave: "triangle", startHz: 988, endHz: 910, delay: 0.34, duration: 0.4, gain: 0.08, pan: 0.1 },
    ],
    noises: [
      { delay: 0.08, duration: 0.66, gain: 0.1, filter: { type: "lowpass", startHz: 2400, endHz: 900, q: 0.5 } },
    ],
  },
  meruUltimate: {
    label: "天晶崩落",
    section: "メル",
    bus: "character",
    gain: 0.9,
    maxVoices: 1,
    minInterval: 1,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 260, endHz: 900, delay: 0, duration: 0.48, gain: 0.13, echo: 0.08 },
      { wave: "triangle", startHz: 190, endHz: 72, delay: 0.62, duration: 0.48, gain: 0.36 },
      { wave: "sine", startHz: 1200, endHz: 540, delay: 0.7, duration: 0.62, gain: 0.12, echo: 0.12 },
      { wave: "sine", startHz: 760, endHz: 520, delay: 1.02, duration: 0.45, gain: 0.08, echo: 0.14 },
    ],
    noises: [
      { delay: 0.56, duration: 0.64, gain: 0.42, filter: { type: "lowpass", startHz: 1800, endHz: 420, q: 0.8 } },
      { delay: 0.65, duration: 0.75, gain: 0.16, filter: { type: "bandpass", startHz: 4400, endHz: 1600, q: 1.4 }, echo: 0.1 },
    ],
  },
  meruSwitch: {
    label: "瞬光障壁",
    section: "メル",
    bus: "character",
    gain: 0.65,
    maxVoices: 2,
    minInterval: 0.12,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 480, endHz: 880, delay: 0.04, duration: 0.26, gain: 0.16, pan: -0.2, echo: 0.07 },
      { wave: "triangle", startHz: 720, endHz: 610, delay: 0.09, duration: 0.27, gain: 0.1, pan: 0.2 },
    ],
    noises: [
      { delay: 0.03, duration: 0.26, gain: 0.08, filter: { type: "highpass", startHz: 2600, endHz: 1500, q: 1 } },
    ],
  },
  hitNormal: {
    label: "通常命中",
    section: "共通",
    bus: "impact",
    gain: 0.62,
    maxVoices: 4,
    minInterval: 0.045,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 185, endHz: 95, delay: 0, duration: 0.09, gain: 0.22 },
    ],
    noises: [
      { delay: 0, duration: 0.085, gain: 0.24, filter: { type: "bandpass", startHz: 980, endHz: 460, q: 0.7 } },
    ],
  },
  hitArmor: {
    label: "石装甲命中",
    section: "共通",
    bus: "impact",
    gain: 0.72,
    maxVoices: 3,
    minInterval: 0.055,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 230, endHz: 112, delay: 0, duration: 0.13, gain: 0.28 },
      { wave: "sine", startHz: 680, endHz: 410, delay: 0.008, duration: 0.09, gain: 0.11 },
    ],
    noises: [
      { delay: 0, duration: 0.13, gain: 0.27, filter: { type: "bandpass", startHz: 1500, endHz: 620, q: 1.6 } },
    ],
  },
  armorBreak: {
    label: "装甲破壊",
    section: "共通",
    bus: "impact",
    gain: 0.82,
    maxVoices: 2,
    minInterval: 0.18,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 310, endHz: 132, delay: 0, duration: 0.28, gain: 0.24 },
      { wave: "sine", startHz: 620, endHz: 840, delay: 0.19, duration: 0.2, gain: 0.1 },
    ],
    noises: [
      { delay: 0, duration: 0.38, gain: 0.38, filter: { type: "bandpass", startHz: 1900, endHz: 480, q: 1.3 }, echo: 0.045 },
    ],
  },
  enemyDefeat: {
    label: "敵撃破",
    section: "共通",
    bus: "impact",
    gain: 0.66,
    maxVoices: 3,
    minInterval: 0.12,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 420, endHz: 145, delay: 0, duration: 0.34, gain: 0.19 },
      { wave: "sine", startHz: 820, endHz: 980, delay: 0.27, duration: 0.16, gain: 0.07, echo: 0.06 },
    ],
    noises: [
      { delay: 0.03, duration: 0.38, gain: 0.18, filter: { type: "lowpass", startHz: 1800, endHz: 520, q: 0.5 } },
    ],
  },
  switchCommon: {
    label: "キャラクター交代",
    section: "共通",
    bus: "ui",
    gain: 0.55,
    maxVoices: 2,
    minInterval: 0.1,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 520, endHz: 760, delay: 0.06, duration: 0.13, gain: 0.13 },
    ],
    noises: [
      { delay: 0, duration: 0.18, gain: 0.2, filter: { type: "bandpass", startHz: 3800, endHz: 1500, q: 0.7 } },
    ],
  },
  pickupLeaf: {
    label: "若葉の雫",
    section: "共通",
    bus: "ui",
    gain: 0.52,
    maxVoices: 3,
    minInterval: 0.1,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 440, delay: 0, duration: 0.24, gain: 0.14, pan: -0.15 },
      { wave: "sine", startHz: 587, delay: 0.09, duration: 0.23, gain: 0.14, pan: 0.15 },
    ],
    noises: [
      { delay: 0.03, duration: 0.24, gain: 0.07, filter: { type: "lowpass", startHz: 1700, endHz: 700 } },
    ],
  },
  pickupMana: {
    label: "魔力の露",
    section: "共通",
    bus: "ui",
    gain: 0.5,
    maxVoices: 3,
    minInterval: 0.1,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 659, endHz: 740, delay: 0, duration: 0.27, gain: 0.13, pan: -0.12, echo: 0.07 },
      { wave: "triangle", startHz: 880, endHz: 1046, delay: 0.1, duration: 0.23, gain: 0.1, pan: 0.12 },
    ],
    noises: [
      { delay: 0.05, duration: 0.25, gain: 0.05, filter: { type: "highpass", startHz: 3200, endHz: 2200, q: 0.7 } },
    ],
  },
  expGain: {
    label: "EXP取得",
    section: "共通",
    bus: "ui",
    gain: 0.34,
    maxVoices: 3,
    minInterval: 0.08,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 620, endHz: 760, delay: 0, duration: 0.12, gain: 0.12 },
    ],
    noises: [],
  },
  levelUp: {
    label: "レベルアップ",
    section: "共通",
    bus: "ui",
    gain: 0.64,
    maxVoices: 1,
    minInterval: 0.8,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 392, delay: 0, duration: 0.3, gain: 0.13 },
      { wave: "triangle", startHz: 523, delay: 0.16, duration: 0.34, gain: 0.14 },
      { wave: "triangle", startHz: 659, delay: 0.33, duration: 0.38, gain: 0.15 },
      { wave: "sine", startHz: 831, delay: 0.52, duration: 0.55, gain: 0.15, echo: 0.11 },
      { wave: "sine", startHz: 208, endHz: 170, delay: 0.52, duration: 0.5, gain: 0.12 },
    ],
    noises: [],
  },
  dialogueType: {
    label: "会話タイプ",
    section: "共通",
    bus: "ui",
    gain: 0.16,
    maxVoices: 1,
    minInterval: 0.045,
    pitchJitter: 0,
    tones: [{ wave: "triangle", startHz: 460, endHz: 420, delay: 0, duration: 0.026, gain: 0.08 }],
    noises: [],
  },
  crystalActivate: {
    label: "晶石起動",
    section: "共通",
    bus: "impact",
    gain: 0.64,
    maxVoices: 1,
    minInterval: 1,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 980, endHz: 760, delay: 0, duration: 0.12, gain: 0.12 },
      { wave: "sine", startHz: 220, endHz: 330, delay: 0.1, duration: 0.94, gain: 0.22, filter: { type: "lowpass", startHz: 1300, endHz: 800, q: 0.65 } },
      { wave: "triangle", startHz: 520, endHz: 740, delay: 0.22, duration: 0.38, gain: 0.12 },
      { wave: "sine", startHz: 720, endHz: 980, delay: 0.46, duration: 0.36, gain: 0.11 },
      { wave: "triangle", startHz: 940, endHz: 1260, delay: 0.74, duration: 0.34, gain: 0.1 },
      { wave: "sine", startHz: 760, endHz: 590, delay: 1.08, duration: 0.44, gain: 0.16, echo: 0.1 },
    ],
    noises: [{ delay: 0.18, duration: 0.78, gain: 0.1, filter: { type: "bandpass", startHz: 920, endHz: 460, q: 0.6 } }],
  },
  rootGateOpen: {
    label: "根の門開放",
    section: "共通",
    bus: "impact",
    gain: 0.74,
    maxVoices: 1,
    minInterval: 2.2,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 270, endHz: 220, delay: 0, duration: 0.54, gain: 0.2, filter: { type: "lowpass", startHz: 1200, endHz: 620, q: 0.65 } },
      { wave: "sawtooth", startHz: 320, endHz: 205, delay: 0.42, duration: 0.76, gain: 0.17, filter: { type: "bandpass", startHz: 1180, endHz: 420, q: 0.58 } },
      { wave: "triangle", startHz: 250, endHz: 178, delay: 0.98, duration: 0.72, gain: 0.24 },
      { wave: "sine", startHz: 210, endHz: 150, delay: 1.52, duration: 0.62, gain: 0.22 },
      { wave: "sine", startHz: 185, endHz: 118, delay: 2.12, duration: 0.38, gain: 0.34 },
    ],
    noises: [
      { delay: 0.4, duration: 1.82, gain: 0.28, filter: { type: "lowpass", startHz: 1750, endHz: 330, q: 0.65 } },
      { delay: 2.08, duration: 0.4, gain: 0.3, filter: { type: "lowpass", startHz: 460, endHz: 160, q: 0.8 } },
    ],
  },
  crystalPlatformRise: {
    label: "晶石足場出現",
    section: "共通",
    bus: "impact",
    gain: 0.58,
    maxVoices: 1,
    minInterval: 0.4,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 290, endHz: 222, delay: 0, duration: 0.42, gain: 0.25 },
      { wave: "sine", startHz: 205, endHz: 164, delay: 0.015, duration: 0.36, gain: 0.2 },
      { wave: "sine", startHz: 530, endHz: 610, delay: 0.12, duration: 0.24, gain: 0.08 },
    ],
    noises: [{ delay: 0.02, duration: 0.38, gain: 0.22, filter: { type: "lowpass", startHz: 1180, endHz: 300, q: 0.62 } }],
  },
  crystalPathComplete: {
    label: "晶石足場完成",
    section: "共通",
    bus: "ui",
    gain: 0.62,
    maxVoices: 1,
    minInterval: 0.5,
    pitchJitter: 0,
    tones: [
      { wave: "triangle", startHz: 460, endHz: 730, delay: 0, duration: 0.32, gain: 0.16 },
      { wave: "sine", startHz: 720, endHz: 1160, delay: 0.14, duration: 0.58, gain: 0.15, echo: 0.12 },
      { wave: "sine", startHz: 1080, endHz: 1420, delay: 0.4, duration: 0.54, gain: 0.11 },
    ],
    noises: [],
  },
  healingSpringActivate: {
    label: "回復の晶泉・起動",
    section: "共通",
    bus: "impact",
    gain: 0.56,
    maxVoices: 1,
    minInterval: 1.5,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 196, endHz: 262, delay: 0, duration: 0.72, gain: 0.15, filter: { type: "lowpass", startHz: 1100, endHz: 760, q: 0.55 } },
      { wave: "triangle", startHz: 392, endHz: 524, delay: 0.22, duration: 0.72, gain: 0.12, echo: 0.08 },
      { wave: "sine", startHz: 523, endHz: 784, delay: 0.5, duration: 0.62, gain: 0.11, echo: 0.1 },
      { wave: "triangle", startHz: 659, endHz: 988, delay: 0.86, duration: 0.48, gain: 0.09 },
    ],
    noises: [
      { delay: 0.04, duration: 1.18, gain: 0.12, filter: { type: "lowpass", startHz: 1700, endHz: 620, q: 0.55 } },
    ],
  },
  healingSpringComplete: {
    label: "回復の晶泉・完了",
    section: "共通",
    bus: "ui",
    gain: 0.54,
    maxVoices: 1,
    minInterval: 0.75,
    pitchJitter: 0,
    tones: [
      { wave: "sine", startHz: 784, endHz: 659, delay: 0, duration: 0.38, gain: 0.13, echo: 0.08 },
      { wave: "triangle", startHz: 659, endHz: 523, delay: 0.14, duration: 0.46, gain: 0.12, echo: 0.08 },
      { wave: "sine", startHz: 392, endHz: 330, delay: 0.3, duration: 0.48, gain: 0.12 },
    ],
    noises: [],
  },
};

export const SFX_CUE_ORDER: readonly SfxCue[] = [
  SFX_CUE.kyleNormal,
  SFX_CUE.kyleSpecial,
  SFX_CUE.kyleUltimate,
  SFX_CUE.kyleSwitch,
  SFX_CUE.nadiNormal,
  SFX_CUE.nadiReturn,
  SFX_CUE.nadiSpecial,
  SFX_CUE.nadiUltimate,
  SFX_CUE.nadiSwitch,
  SFX_CUE.meruNormal,
  SFX_CUE.meruHeal,
  SFX_CUE.meruUltimate,
  SFX_CUE.meruSwitch,
  SFX_CUE.hitNormal,
  SFX_CUE.hitArmor,
  SFX_CUE.armorBreak,
  SFX_CUE.enemyDefeat,
  SFX_CUE.switchCommon,
  SFX_CUE.pickupLeaf,
  SFX_CUE.pickupMana,
  SFX_CUE.expGain,
  SFX_CUE.levelUp,
  SFX_CUE.dialogueType,
  SFX_CUE.crystalActivate,
  SFX_CUE.rootGateOpen,
  SFX_CUE.crystalPlatformRise,
  SFX_CUE.crystalPathComplete,
  SFX_CUE.healingSpringActivate,
  SFX_CUE.healingSpringComplete,
];
