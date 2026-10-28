import type { Vec2 } from "../game/types";

export type StageId = "forestRuins01";

export type RoomId =
  | "ancientForest"
  | "mossRootRuins"
  | "lightwingCrystalCavern"
  | "spiritClothStonescaleDepths"
  | "transferChamber"
  | "mossCorridor"
  | "luminousGarden"
  | "brokenBridge"
  | "spiritClothHall"
  | "stoneScalePassage"
  | "guardianAntechamber"
  | "crystalAltar";

export type GameMode = "stage" | "arena";

/** Whether the field represents just the active explorer or the battle party. */
export type PartyPresence = "solo" | "formation";

export type StageEncounterState =
  | "dormant"
  | "noticed"
  | "active"
  | "cleared";

export interface RectBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CircleObstacle {
  kind: "circle";
  x: number;
  y: number;
  radius: number;
}

export interface RectObstacle extends RectBounds {
  kind: "rect";
}

export type RoomObstacle = CircleObstacle | RectObstacle;

export interface StageRoomExit {
  direction: "north" | "south" | "west" | "east";
  target: RoomId | null;
  locked: boolean;
}

export interface StageRoomDefinition {
  id: RoomId;
  name: string;
  bounds: RectBounds;
  spawn: Vec2;
  obstacles: readonly RoomObstacle[];
  exits: readonly StageRoomExit[];
}

/** Stage-owned dimensions and progression anchors for a scrolling world. */
export interface ScrollingStageDefinition {
  id: RoomId;
  name: string;
  tileSize: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
  spawn: Vec2;
  goal: Vec2;
  cameraBounds: RectBounds;
  progression: "southToNorth" | "northToSouth" | "westToEast" | "eastToWest" | "freeform";
}
