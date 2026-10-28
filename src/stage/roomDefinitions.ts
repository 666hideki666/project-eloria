import type { StageRoomDefinition } from "./types";
import { ANCIENT_FOREST } from "./maps/ancientForestMap";
import { MOSS_ROOT_RUINS } from "./maps/mossRootRuinsMap";
import { LIGHTWING_CRYSTAL_CAVERN } from "./maps/lightwingCrystalCavernMap";
import { SPIRIT_CLOTH_STONESCALE_DEPTHS } from "./maps/spiritClothStonescaleDepthsMap";
import { CRYSTAL_ALTAR } from "./maps/crystalAltarMap";

export const ANCIENT_FOREST_ROOM: StageRoomDefinition = {
  id: "ancientForest",
  name: ANCIENT_FOREST.name,
  bounds: { left: 0, top: 0, right: ANCIENT_FOREST.width, bottom: ANCIENT_FOREST.height },
  spawn: ANCIENT_FOREST.spawn,
  obstacles: [],
  exits: [],
};

export const MOSS_ROOT_RUINS_ROOM: StageRoomDefinition = {
  id: "mossRootRuins",
  name: MOSS_ROOT_RUINS.name,
  bounds: {
    left: 0,
    top: 0,
    right: MOSS_ROOT_RUINS.width,
    bottom: MOSS_ROOT_RUINS.height,
  },
  spawn: MOSS_ROOT_RUINS.spawn,
  obstacles: [],
  exits: [],
};

export const LIGHTWING_CRYSTAL_CAVERN_ROOM: StageRoomDefinition = {
  id: "lightwingCrystalCavern",
  name: LIGHTWING_CRYSTAL_CAVERN.name,
  bounds: {
    left: 0,
    top: 0,
    right: LIGHTWING_CRYSTAL_CAVERN.width,
    bottom: LIGHTWING_CRYSTAL_CAVERN.height,
  },
  spawn: LIGHTWING_CRYSTAL_CAVERN.spawn,
  obstacles: [],
  exits: [],
};

export const SPIRIT_CLOTH_STONESCALE_DEPTHS_ROOM: StageRoomDefinition = {
  id: "spiritClothStonescaleDepths",
  name: SPIRIT_CLOTH_STONESCALE_DEPTHS.name,
  bounds: {
    left: 0,
    top: 0,
    right: SPIRIT_CLOTH_STONESCALE_DEPTHS.width,
    bottom: SPIRIT_CLOTH_STONESCALE_DEPTHS.height,
  },
  spawn: SPIRIT_CLOTH_STONESCALE_DEPTHS.spawn,
  obstacles: [],
  exits: [],
};

export const CRYSTAL_ALTAR_ROOM: StageRoomDefinition = {
  id: "crystalAltar",
  name: CRYSTAL_ALTAR.name,
  bounds: { left: 0, top: 0, right: CRYSTAL_ALTAR.width, bottom: CRYSTAL_ALTAR.height },
  spawn: CRYSTAL_ALTAR.spawn,
  obstacles: [],
  exits: [{ direction: "south", target: "spiritClothStonescaleDepths", locked: false }],
};

export const TRANSFER_CHAMBER: StageRoomDefinition = {
  id: "transferChamber",
  name: "晶界・転送の間",
  bounds: {
    left: 58,
    top: 58,
    right: 582,
    bottom: 318,
  },
  spawn: { x: 320, y: 258 },
  obstacles: [
    { kind: "circle", x: 320, y: 214, radius: 23 },
    { kind: "rect", left: 58, top: 58, right: 246, bottom: 105 },
    { kind: "rect", left: 394, top: 58, right: 582, bottom: 105 },
  ],
  exits: [
    {
      direction: "north",
      target: "mossCorridor",
      locked: true,
    },
  ],
};

export const TRANSFER_CHAMBER_NORTH_GATE_BLOCKER = {
  kind: "rect" as const,
  left: 246,
  top: 58,
  right: 394,
  bottom: 105,
};

export const MOSS_CORRIDOR: StageRoomDefinition = {
  id: "mossCorridor",
  name: "晶界・苔の回廊",
  bounds: { left: 58, top: 52, right: 582, bottom: 322 },
  spawn: { x: 320, y: 292 },
  obstacles: [
    { kind: "rect", left: 58, top: 52, right: 238, bottom: 102 },
    { kind: "rect", left: 402, top: 52, right: 582, bottom: 102 },
    { kind: "rect", left: 58, top: 120, right: 118, bottom: 214 },
    { kind: "rect", left: 522, top: 120, right: 582, bottom: 214 },
    { kind: "circle", x: 190, y: 224, radius: 18 },
    { kind: "circle", x: 452, y: 204, radius: 20 },
  ],
  exits: [
    { direction: "south", target: "transferChamber", locked: false },
    { direction: "north", target: "luminousGarden", locked: true },
  ],
};

export const STAGE_ROOMS = {
  ancientForest: ANCIENT_FOREST_ROOM,
  mossRootRuins: MOSS_ROOT_RUINS_ROOM,
  lightwingCrystalCavern: LIGHTWING_CRYSTAL_CAVERN_ROOM,
  spiritClothStonescaleDepths: SPIRIT_CLOTH_STONESCALE_DEPTHS_ROOM,
  crystalAltar: CRYSTAL_ALTAR_ROOM,
  transferChamber: TRANSFER_CHAMBER,
  mossCorridor: MOSS_CORRIDOR,
} as const;
