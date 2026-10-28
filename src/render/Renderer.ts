import { DOWNED_FRAME } from "./downedCharacterSprites";
import {
  ACCESSIBILITY,
  ENEMY_AI,
  UTSUROBOU_MASK_CURSE_WAVE,
  VIEW,
} from "../config";
import type { Effect, EffectPool } from "../effects/EffectPool";
import { hash2d, normalize, sub } from "../game/math";
import type {
  CharacterId,
  CharacterState,
  EnemyKind,
  EnemyState,
  Projectile,
  WorldSnapshot,
} from "../game/types";
import { CRYSTAL_ALTAR } from "../stage/maps/crystalAltarMap";
import { MOSS_ROOT_RUINS } from "../stage/maps/mossRootRuinsMap";
import { drawAncientForestBackground } from "./stages/AncientForestRenderer";
import { CHARACTER_GROUNDING } from "./characterGroundingConfig";
import {
  CharacterSpriteRenderer,
  type CharacterSpriteDebugState,
} from "./CharacterSpriteRenderer";
import {
  CHARACTER_SPRITE_CONFIGS,
  type CharacterSpriteConfig,
} from "./characterSpriteConfig";
import {
  EnemySpriteRenderer,
  type EnemySpriteDebugState,
  type EnemySpriteLoadStatus,
} from "./EnemySpriteRenderer";
import { ENEMY_SPRITE_CONFIGS } from "./enemySpriteConfig";
import {
  drawTransferChamberBackground,
  drawTransferChamberForeground,
} from "./rooms/TransferChamberRenderer";
import {
  drawMossCorridorBackground,
  drawMossCorridorForeground,
} from "./rooms/MossCorridorRenderer";
import {
  drawLightwingCrystalCavernBackground,
  drawLightwingCrystalCavernEntities,
  drawLightwingCrystalCavernForeground,
  lightwingCrystalDepthObjects,
} from "./stages/LightwingCrystalCavernRenderer";
import {
  drawMossRootRuinsBackground,
  drawMossRootRuinsCrystal,
  drawMossRootRuinsForeground,
  mossRootCrystalDepthY,
} from "./stages/MossRootRuinsRenderer";
import {
  drawSpiritClothStonescaleDepthsBackground,
  drawSpiritClothStonescaleDepthsForeground,
  spiritClothStonescaleDepthObjects,
} from "./stages/SpiritClothStonescaleDepthsRenderer";
import {
  drawCrystalAltarBackground,
  drawCrystalAltarForeground,
  drawVelgran,
  drawVelgranBackEffects,
} from "./stages/CrystalAltarRenderer";
import { resolveSpriteDirection } from "./spriteDirection";

interface Drawable {
  y: number;
  draw: () => void;
}

export function shouldDrawEnemyTelegraph(enemy: EnemyState): boolean {
  return enemy.alive && enemy.telegraph > 0 && enemy.archetype !== "heavyCharge";
}

export function resolveNormalEffectCoreColor(
  bright: string,
  muted: string,
  strongFlashes: boolean = ACCESSIBILITY.strongFlashes,
): string {
  return strongFlashes ? bright : muted;
}

export function resolveIwaUrokoRenderMode(
  _armor: number,
  spriteStatus: EnemySpriteLoadStatus | undefined,
): "sprite" | "fallback" {
  // Armor break is a combat state, not an asset-family change. Keep the
  // authored Iwa Uroko sprite for every live state and reserve the legacy
  // procedural body strictly for an unavailable/failed sprite sheet.
  return spriteStatus === "ready" ? "sprite" : "fallback";
}

export interface MossPlunShadowPresentation {
  radiusX: number;
  radiusY: number;
  alpha: number;
}

export function resolveMossPlunShadow(
  enemy: EnemyState,
): MossPlunShadowPresentation {
  if (enemy.aiState === "windup") {
    return {
      radiusX: enemy.stateAge < 0.3 ? 13 : 15,
      radiusY: 4,
      alpha: 0.48,
    };
  }
  if (enemy.aiState === "attack") {
    if (enemy.stateAge < 0.08) {
      return { radiusX: 11, radiusY: 3, alpha: 0.42 };
    }
    if (enemy.stateAge < 0.18) {
      return { radiusX: 8, radiusY: 2, alpha: 0.28 };
    }
    return { radiusX: 17, radiusY: 4, alpha: 0.5 };
  }
  if (enemy.aiState === "recover" && enemy.stateAge < 0.16) {
    return { radiusX: 17, radiusY: 4, alpha: 0.5 };
  }
  return { radiusX: 13, radiusY: 4, alpha: 0.48 };
}

export interface LumibaneShadowPresentation {
  radiusX: number;
  radiusY: number;
  alpha: number;
  rotation: number;
}

export function resolveLumibaneShadow(
  enemy: EnemyState,
): LumibaneShadowPresentation {
  if (enemy.aiState === "attack" && enemy.stateAge < 0.12) {
    return {
      radiusX: 10,
      radiusY: 1.6,
      alpha: 0.22,
      rotation: Math.atan2(
        enemy.attackDirection.y,
        enemy.attackDirection.x,
      ),
    };
  }
  if (
    (enemy.aiState === "attack" && enemy.stateAge >= 0.12) ||
    (enemy.aiState === "recover" && enemy.stateAge < 0.12)
  ) {
    return { radiusX: 10, radiusY: 2, alpha: 0.22, rotation: 0 };
  }
  return { radiusX: 8, radiusY: 2, alpha: 0.22, rotation: 0 };
}

export interface GaracrowShadowPresentation {
  radiusX: number;
  radiusY: number;
  alpha: number;
  rotation: number;
}

export function resolveGaracrowShadow(
  enemy: EnemyState,
): GaracrowShadowPresentation {
  if (enemy.aiState === "windup") {
    return { radiusX: 12, radiusY: 3, alpha: 0.24, rotation: 0 };
  }
  if (enemy.aiState === "attack" && enemy.stateAge < 0.18) {
    return {
      radiusX: 14,
      radiusY: 2.6,
      alpha: 0.24,
      rotation: Math.atan2(
        enemy.attackDirection.y,
        enemy.attackDirection.x,
      ),
    };
  }
  if (
    (enemy.aiState === "attack" && enemy.stateAge >= 0.18) ||
    (enemy.aiState === "recover" && enemy.stateAge < 0.18)
  ) {
    return { radiusX: 16, radiusY: 3, alpha: 0.24, rotation: 0 };
  }
  return { radiusX: 14, radiusY: 3, alpha: 0.24, rotation: 0 };
}

export interface UtsurobouTelegraphPresentation {
  radius: number;
  alpha: number;
  lineWidth: number;
}

export function resolveUtsurobouTelegraph(
  enemy: EnemyState,
): UtsurobouTelegraphPresentation | null {
  if (
    enemy.aiState !== "windup" ||
    enemy.telegraphDuration <= 0
  ) {
    return null;
  }
  const progress = Math.max(
    0,
    Math.min(
      1,
      1 - enemy.telegraph / enemy.telegraphDuration,
    ),
  );
  return {
    radius: 30 + (UTSUROBOU_MASK_CURSE_WAVE.radius - 30) * progress,
    alpha: 0.18 + 0.24 * progress,
    lineWidth: 1 + progress,
  };
}

export interface UtsurobouShadowPresentation {
  radiusX: number;
  radiusY: number;
  alpha: number;
}

export function resolveUtsurobouShadow(
  enemy: EnemyState,
): UtsurobouShadowPresentation {
  if (enemy.aiState === "windup") {
    return { radiusX: 9, radiusY: 2.7, alpha: 0.24 };
  }
  if (
    enemy.aiState === "attack" &&
    enemy.stateAge >= UTSUROBOU_MASK_CURSE_WAVE.impactTime &&
    enemy.stateAge < 0.18
  ) {
    return { radiusX: 10, radiusY: 3, alpha: 0.26 };
  }
  return { radiusX: 10, radiusY: 3, alpha: 0.26 };
}

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly characterSprites = Object.fromEntries(
    Object.entries(CHARACTER_SPRITE_CONFIGS).map(([id, config]) => [
      id,
      new CharacterSpriteRenderer(config),
    ]),
  ) as Partial<Record<CharacterId, CharacterSpriteRenderer>>;
  private readonly enemySprites = Object.fromEntries(
    Object.entries(ENEMY_SPRITE_CONFIGS).map(([kind, config]) => [
      kind,
      new EnemySpriteRenderer(config),
    ]),
  ) as Partial<Record<EnemyKind, EnemySpriteRenderer>>;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly effectPool: EffectPool,
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    this.context = context;
    this.context.imageSmoothingEnabled = false;
  }

  public getCharacterSpriteState(
    characterId: CharacterId,
  ): CharacterSpriteDebugState | null {
    return this.characterSprites[characterId]?.debugState ?? null;
  }

  public get kyleSpriteState(): CharacterSpriteDebugState {
    const state = this.getCharacterSpriteState("kyle");
    if (!state) throw new Error("Kyle sprite renderer is not registered.");
    return state;
  }

  public getEnemySpriteState(
    enemyKind: EnemyKind,
    enemyId: number,
  ): EnemySpriteDebugState | null {
    return this.enemySprites[enemyKind]?.getDebugState(enemyId) ?? null;
  }

  public destroy(): void {
    for (const sprite of Object.values(this.characterSprites)) {
      sprite?.destroy();
    }
    for (const sprite of Object.values(this.enemySprites)) {
      sprite?.destroy();
    }
  }

  public render(snapshot: WorldSnapshot, anomaly?: { age: number }): void {
    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackdrop(snapshot.time);

    context.save();
    if (snapshot.shake > 0 && ACCESSIBILITY.screenShake) {
      const shakeX = Math.round(Math.sin(snapshot.time * 91) * snapshot.shake * 0.38);
      const shakeY = Math.round(Math.cos(snapshot.time * 73) * snapshot.shake * 0.25);
      context.translate(shakeX, shakeY);
    }
    const scrollingStage = snapshot.mode === "stage" && snapshot.stageLayer !== null;
    if (scrollingStage) {
      context.translate(-snapshot.camera.x, -snapshot.camera.y);
      if (snapshot.stageLayer === "ancientForest") drawAncientForestBackground(context, snapshot);
      else if (snapshot.stageLayer === "crystalAltar") drawCrystalAltarBackground(context, snapshot);
      else if (snapshot.stageLayer === "lightwingCrystalCavern") drawLightwingCrystalCavernBackground(context, snapshot);
      else if (snapshot.stageLayer === "spiritClothStonescaleDepths") drawSpiritClothStonescaleDepthsBackground(context, snapshot);
      else drawMossRootRuinsBackground(context, snapshot);
    } else if (snapshot.mode === "stage" && snapshot.roomId === "transferChamber") {
      drawTransferChamberBackground(
        context,
        snapshot.time,
        snapshot.northGateUnlocked,
      );
    } else if (snapshot.mode === "stage" && snapshot.roomId === "mossCorridor") {
      drawMossCorridorBackground(context, snapshot.time);
    } else {
      this.drawArena(snapshot.time);
    }
    if (scrollingStage && snapshot.stageLayer === "crystalAltar") drawVelgranBackEffects(context, snapshot);
    this.drawTelegraphs(snapshot);
    this.drawEffects("back");
    this.drawPickups(snapshot);
    if (scrollingStage && snapshot.stageLayer === "lightwingCrystalCavern") {
      drawLightwingCrystalCavernEntities(context, snapshot);
    }
    const lightwingDepth = scrollingStage && snapshot.stageLayer === "lightwingCrystalCavern";
    const mossRootDepth = scrollingStage && snapshot.stageLayer === "mossRootRuins";
    const depthsDepth = scrollingStage && snapshot.stageLayer === "spiritClothStonescaleDepths";
    const altarDepth = scrollingStage && snapshot.stageLayer === "crystalAltar";
    const depthOverlays: readonly Drawable[] = lightwingDepth
      ? lightwingCrystalDepthObjects(context, snapshot)
      : mossRootDepth
        ? [{ y: mossRootCrystalDepthY(), draw: () => drawMossRootRuinsCrystal(context, snapshot) }]
        : depthsDepth
          ? spiritClothStonescaleDepthObjects(context, snapshot)
          : altarDepth
            ? [{ y: CRYSTAL_ALTAR.sealStone.y, draw: () => drawCrystalAltarForeground(context, snapshot) }]
            : [];
    this.drawActors(snapshot, depthOverlays, anomaly?.age);
    this.drawProjectiles(snapshot.projectiles, snapshot.time);
    if (scrollingStage) {
      if (snapshot.stageLayer === "ancientForest") {
        // The approved background already includes its stone and root foreground.
      } else if (snapshot.stageLayer === "lightwingCrystalCavern") drawLightwingCrystalCavernForeground(context, snapshot);
      else if (snapshot.stageLayer === "spiritClothStonescaleDepths") drawSpiritClothStonescaleDepthsForeground(context, snapshot);
      else drawMossRootRuinsForeground(context, snapshot);
    } else if (snapshot.mode === "stage" && snapshot.roomId === "transferChamber") {
      drawTransferChamberForeground(context);
    } else if (snapshot.mode === "stage" && snapshot.roomId === "mossCorridor") {
      drawMossCorridorForeground(context);
    }
    this.drawEffects("front");
    if (anomaly && snapshot.stageLayer === "mossRootRuins") {
      const t = anomaly.age;
      const beat = Math.exp(-Math.pow((t - .24) / .13, 2)) + .65 * Math.exp(-Math.pow((t - .64) / .09, 2)) + .8 * Math.exp(-Math.pow((t - 1.12) / .18, 2));
      const glow = context.createRadialGradient(MOSS_ROOT_RUINS.crystal.x, MOSS_ROOT_RUINS.crystal.y - 35, 0,
        MOSS_ROOT_RUINS.crystal.x, MOSS_ROOT_RUINS.crystal.y - 35, 210);
      glow.addColorStop(0, `rgba(70,170,255,${Math.min(.28, beat * .25)})`);
      glow.addColorStop(1, "rgba(40,110,230,0)");
      context.save(); context.fillStyle = glow;
      context.fillRect(MOSS_ROOT_RUINS.crystal.x - 210, MOSS_ROOT_RUINS.crystal.y - 245, 420, 420);
      context.restore();
    }
    if (snapshot.mode === "stage" && snapshot.stageEncounter === "noticed") {
      this.drawStageEncounterNotice(snapshot);
    }
    if (snapshot.debugAi) this.drawAiDebug(snapshot);
    context.restore();

    if (snapshot.roomTransitionOpacity > 0) {
      context.fillStyle = `rgba(2,8,7,${snapshot.roomTransitionOpacity})`;
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.drawEffects("hud");
  }

  private drawStageEncounterNotice(snapshot: WorldSnapshot): void {
    const enemy = snapshot.enemies.find(
      (item) => item.alive && item.id === snapshot.stageEncounterNoticeEnemyId,
    ) ?? snapshot.enemies.find((item) => item.alive);
    if (!enemy) return;
    const context = this.context;
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y - 31));
    context.fillStyle = "#efffbd";
    context.strokeStyle = "#294a36";
    context.lineWidth = 2;
    context.font = "bold 16px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeText("!", 0, 0);
    context.fillText("!", 0, 0);
    context.restore();
  }

  private drawBackdrop(time: number): void {
    const context = this.context;
    context.fillStyle = "#020a0b";
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    const glow = context.createRadialGradient(320, 190, 35, 320, 190, 350);
    glow.addColorStop(0, "#17372d");
    glow.addColorStop(0.58, "#071b18");
    glow.addColorStop(1, "#020909");
    context.fillStyle = glow;
    context.fillRect(0, 0, VIEW.width, VIEW.height);

    context.globalAlpha = 0.25;
    for (let x = 18; x < VIEW.width; x += 52) {
      const height = 8 + hash2d(x, 4) * 28;
      context.fillStyle = x % 104 === 18 ? "#2ad1c7" : "#1c716d";
      context.beginPath();
      context.moveTo(x, 48 - height);
      context.lineTo(x + 4, 48);
      context.lineTo(x - 4, 48);
      context.closePath();
      context.fill();
      if (Math.floor(time * 2 + x) % 7 === 0) {
        context.fillRect(x - 1, 31 - height * 0.25, 2, 2);
      }
    }
    context.globalAlpha = 1;
  }

  private drawArena(time: number): void {
    const context = this.context;
    const { left, top, right, bottom } = VIEW.arena;
    context.fillStyle = "#10241d";
    context.fillRect(left - 8, top - 7, right - left + 16, bottom - top + 14);
    context.fillStyle = "#26382b";
    context.fillRect(left, top, right - left, bottom - top);
    context.fillStyle = "#1d3026";
    context.fillRect(left + 4, top + 4, right - left - 8, bottom - top - 8);

    for (let y = top + 7; y < bottom - 5; y += 15) {
      for (let x = left + 7; x < right - 5; x += 18) {
        const jitterX = Math.floor(hash2d(x, y) * 5);
        const jitterY = Math.floor(hash2d(y, x) * 4);
        const shade = hash2d(x + 7, y - 4);
        context.fillStyle = shade > 0.67
          ? "#304336"
          : shade > 0.32
            ? "#263a2e"
            : "#213329";
        context.fillRect(x + jitterX, y + jitterY, 12, 8);
        context.fillStyle = "rgba(112, 137, 100, 0.14)";
        context.fillRect(x + jitterX + 1, y + jitterY + 1, 9, 1);
      }
    }

    context.strokeStyle = "rgba(48, 180, 159, 0.13)";
    context.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      context.ellipse(320, 194, 58 + ring * 46, 32 + ring * 28, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 0.18 + Math.sin(time * 2) * 0.035;
    context.strokeStyle = "#56daca";
    context.beginPath();
    context.arc(320, 194, 25, 0, Math.PI * 2);
    context.moveTo(320, 164);
    context.lineTo(326, 181);
    context.lineTo(344, 194);
    context.lineTo(326, 207);
    context.lineTo(320, 224);
    context.lineTo(314, 207);
    context.lineTo(296, 194);
    context.lineTo(314, 181);
    context.closePath();
    context.stroke();
    context.globalAlpha = 1;

    this.drawArenaWalls(time);
  }

  private drawArenaWalls(time: number): void {
    const context = this.context;
    const { left, top, right, bottom } = VIEW.arena;
    context.fillStyle = "#091713";
    context.fillRect(left - 8, top - 8, right - left + 16, 8);
    context.fillRect(left - 8, bottom, right - left + 16, 8);
    context.fillRect(left - 8, top, 8, bottom - top);
    context.fillRect(right, top, 8, bottom - top);

    for (let x = left - 5; x <= right; x += 22) {
      const height = 8 + Math.floor(hash2d(x, 10) * 7);
      context.fillStyle = "#324237";
      context.fillRect(x, top - height, 17, height);
      context.fillStyle = "#182a23";
      context.fillRect(x + 2, top - height + 3, 13, height - 3);
      context.fillStyle = "#475545";
      context.fillRect(x + 2, top - height + 2, 10, 2);
    }

    const crystals = [
      [55, 68],
      [580, 72],
      [69, 308],
      [565, 306],
    ] as const;
    crystals.forEach(([x, y], index) => {
      const pulse = 0.72 + Math.sin(time * 2.4 + index) * 0.16;
      context.globalAlpha = pulse;
      context.fillStyle = "#31c5bd";
      context.beginPath();
      context.moveTo(x, y - 17);
      context.lineTo(x + 6, y - 4);
      context.lineTo(x + 2, y + 6);
      context.lineTo(x - 5, y + 2);
      context.lineTo(x - 7, y - 7);
      context.closePath();
      context.fill();
      context.fillStyle = "#b5fff0";
      context.fillRect(x - 1, y - 12, 2, 9);
      context.globalAlpha = 1;
      context.fillStyle = "#1b2821";
      context.fillRect(x - 9, y + 5, 18, 5);
      context.fillStyle = "#50604d";
      context.fillRect(x - 7, y + 4, 14, 2);
    });
  }

  private drawTelegraphs(snapshot: WorldSnapshot): void {
    const context = this.context;
    for (const enemy of snapshot.enemies) {
      if (!shouldDrawEnemyTelegraph(enemy)) continue;
      const progress = 1 - enemy.telegraph / enemy.telegraphDuration;
      const direction = normalize(sub(enemy.telegraphTarget, enemy.pos), enemy.facing);
      const pulse = 0.18 + progress * 0.2 + Math.sin(snapshot.time * 18) * 0.04;
      context.save();
      context.translate(enemy.pos.x, enemy.pos.y);
      context.rotate(Math.atan2(direction.y, direction.x));
      context.fillStyle = `rgba(238, 129, 62, ${pulse})`;
      context.strokeStyle = progress > 0.72 ? "#ffd28c" : "#e88c52";
      context.lineWidth = progress > 0.72 ? 2 : 1;

      context.beginPath();
      context.arc(16, 0, 25, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.arc(16, 0, 25 * progress, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  private drawPickups(snapshot: WorldSnapshot): void {
    const context = this.context;
    for (const pickup of snapshot.pickups) {
      const bob = Math.sin(snapshot.time * 5 + pickup.id) * 2;
      context.save();
      context.translate(Math.round(pickup.pos.x), Math.round(pickup.pos.y + bob));
      context.globalAlpha = Math.min(1, pickup.life * 2);
      context.fillStyle = "rgba(3, 11, 10, 0.45)";
      context.beginPath();
      context.ellipse(0, 7, 7, 3, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = pickup.kind === "leaf" ? "#a4e869" : "#8e9eea";
      context.beginPath();
      context.moveTo(0, -8);
      context.lineTo(5, -1);
      context.lineTo(3, 5);
      context.lineTo(0, 8);
      context.lineTo(-4, 3);
      context.lineTo(-5, -2);
      context.closePath();
      context.fill();
      context.fillStyle = "#e8fff0";
      context.fillRect(-1, -4, 2, 4);
      if (pickup.kind === "leaf") {
        context.fillStyle = "#476e34";
        context.fillRect(-2, -1, 4, 1);
      } else {
        context.strokeStyle = "#d6ddff";
        context.lineWidth = 1;
        context.beginPath();
        context.arc(0, 1, 3, 0, Math.PI * 1.55);
        context.stroke();
      }
      context.restore();
    }
  }

  private drawAiDebug(snapshot: WorldSnapshot): void {
    const context = this.context;
    context.save();
    context.font = "bold 7px monospace";
    context.textBaseline = "bottom";

    for (const member of snapshot.party) {
      if (member.id === snapshot.activeId || member.downed) continue;
      context.globalAlpha = 0.72;
      context.strokeStyle = member.accent;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(member.pos.x, member.pos.y);
      context.lineTo(member.formationSlot.x, member.formationSlot.y);
      context.stroke();
      context.setLineDash([]);
      context.strokeRect(
        member.formationSlot.x - 4,
        member.formationSlot.y - 4,
        8,
        8,
      );
      context.fillStyle = member.accent;
      context.fillText(
        `${member.id}:${member.followerState}`,
        member.formationSlot.x + 6,
        member.formationSlot.y - 4,
      );
    }

    for (const enemy of snapshot.enemies) {
      if (!enemy.alive) continue;
      const behavior = ENEMY_AI.behavior[enemy.archetype];
      context.globalAlpha = enemy.aware ? 0.28 : 0.18;
      context.strokeStyle = enemy.hasAttackToken
        ? "#ff765f"
        : enemy.isReadySlot
          ? "#f0ce65"
          : "#74b7a5";
      context.setLineDash([4, 5]);
      context.beginPath();
      context.arc(
        enemy.pos.x,
        enemy.pos.y,
        behavior.detectionRadius,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.setLineDash([]);

      context.globalAlpha = 0.8;
      context.beginPath();
      context.moveTo(enemy.pos.x, enemy.pos.y);
      context.lineTo(enemy.reservedPos.x, enemy.reservedPos.y);
      context.stroke();
      context.strokeRect(
        enemy.reservedPos.x - 3,
        enemy.reservedPos.y - 3,
        6,
        6,
      );
      context.fillStyle = enemy.hasAttackToken
        ? "#ff8b70"
        : enemy.isReadySlot
          ? "#ffe37d"
          : "#b1d4c9";
      const role = enemy.hasAttackToken
        ? " [ATTACK]"
        : enemy.isReadySlot
          ? " [NEXT]"
          : "";
      context.fillText(
        `${enemy.id}:${enemy.aiState}${role}`,
        enemy.pos.x - 18,
        enemy.pos.y - enemy.radius - 12,
      );
    }

    if (snapshot.encounterGrace > 0) {
      context.globalAlpha = 0.9;
      context.fillStyle = "#f0ce65";
      context.textAlign = "center";
      context.fillText(
        `START GRACE ${snapshot.encounterGrace.toFixed(1)}s`,
        VIEW.width / 2,
        48,
      );
    }
    context.restore();
  }

  private drawActors(
    snapshot: WorldSnapshot,
    depthOverlays: readonly Drawable[] = [],
    anomalyAge?: number,
  ): void {
    const drawables: Drawable[] = [];
    const visibleParty = snapshot.partyPresence === "solo"
      ? snapshot.party.filter((member) => member.id === snapshot.activeId)
      : snapshot.party;
    for (const member of visibleParty) {
      drawables.push({
        y: member.pos.y,
        draw: () => this.drawCharacter(member, snapshot),
      });
    }
    if (snapshot.velgran && snapshot.velgran.phase !== "inactive" && snapshot.velgran.phase !== "cleared") {
      drawables.push({
        y: snapshot.velgran.pos.y,
        draw: () => drawVelgran(this.context, snapshot),
      });
    }
    for (const enemy of snapshot.enemies) {
      if (!enemy.alive) continue;
      drawables.push({
        y: enemy.pos.y,
        draw: () => {
          if (anomalyAge === undefined) { this.drawEnemy(enemy, snapshot.time); return; }
          this.context.save();
          this.context.translate(Math.sin(anomalyAge * 22 + enemy.id) * 1.5, Math.sin(anomalyAge * 15 + enemy.id) * .7);
          this.drawEnemy(enemy, snapshot.time + anomalyAge);
          this.context.restore();
        },
      });
    }
    drawables.push(...depthOverlays);
    drawables.sort((a, b) => a.y - b.y);
    for (const drawable of drawables) drawable.draw();
  }

  private drawCharacter(
    member: CharacterState,
    snapshot: WorldSnapshot,
  ): void {
    const context = this.context;
    const spriteRenderer = this.characterSprites[member.id];
    const spriteConfig =
      !member.downed &&
      spriteRenderer?.debugState.status === "ready"
        ? spriteRenderer.config
        : null;
    const bob = member.downed || spriteConfig
      ? 0
      : Math.sin(snapshot.time * 7 + member.pos.x) * 1;
    const flip = member.facing.x < -0.15 ? -1 : 1;

    context.save();
    context.translate(Math.round(member.pos.x), Math.round(member.pos.y + bob));

    this.drawCharacterShadow(member, spriteConfig, spriteRenderer?.debugState.downedStatus === "ready");

    if (
      !member.downed &&
      member.invulnerable > 0 &&
      Math.floor(member.invulnerable * 16) % 2 === 0
    ) {
      context.globalAlpha = ACCESSIBILITY.strongFlashes ? 0.32 : 0.68;
    }

    if (
      spriteRenderer?.draw(
        context,
        member,
        snapshot.time,
        snapshot.phase,
      )
    ) {
      context.restore();
      if (!member.downed && member.barrier > 0) this.drawBarrier(member, snapshot.time);
      return;
    }

    context.scale(flip, 1);
    if (member.downed) {
      this.drawDownedCharacter(member);
      context.restore();
      return;
    }

    context.fillStyle = "#402c21";
    context.fillRect(-6, 5, 4, 6);
    context.fillRect(3, 5, 4, 6);
    context.fillStyle = member.color;
    context.fillRect(-7, -7, 14, 14);
    context.fillStyle = "#e6bd84";
    context.fillRect(-5, -15, 10, 9);

    if (member.id === "kyle") {
      context.fillStyle = "#9da6a5";
      context.fillRect(-6, -19, 12, 5);
      context.fillRect(-7, -17, 4, 6);
      context.fillStyle = "#275b9b";
      context.fillRect(-8, -7, 16, 3);
      context.fillRect(-9, -5, 5, 2);
      context.fillStyle = "#e9f6f1";
      context.fillRect(8, -5, 2, 13);
      context.fillRect(7, -6, 4, 3);
    } else if (member.id === "nadi") {
      context.fillStyle = "#643738";
      context.fillRect(-6, -19, 12, 5);
      context.fillRect(-8, -17, 5, 9);
      context.fillRect(-10, -18, 4, 4);
      context.strokeStyle = "#d8f7f1";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(9, 0, 6, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "#53c8c2";
      context.fillRect(8, -1, 3, 3);
    } else {
      context.fillStyle = "#26385d";
      context.fillRect(-6, -19, 12, 6);
      context.fillRect(-7, -17, 4, 8);
      context.fillStyle = "#b9643f";
      context.fillRect(-8, -7, 16, 3);
      context.fillStyle = "#8a633c";
      context.fillRect(8, -10, 2, 21);
      context.fillStyle = "#e8bf68";
      context.fillRect(6, -12, 6, 4);
      context.fillStyle = "#77e4ce";
      context.fillRect(8, -13, 2, 2);
    }

    context.fillStyle = "#172622";
    context.fillRect(2, -12, 2, 2);
    if (member.hurtFlash > 0 && ACCESSIBILITY.strongFlashes) {
      context.globalCompositeOperation = "screen";
      context.fillStyle = "rgba(255,255,255,0.75)";
      context.fillRect(-8, -19, 19, 30);
    }
    context.restore();

    if (member.barrier > 0) this.drawBarrier(member, snapshot.time);
  }

  private drawCharacterShadow(
    member: CharacterState,
    spriteConfig: CharacterSpriteConfig | null,
    downedSpriteReady: boolean,
  ): void {
    const context = this.context;
    const shadow = spriteConfig
      ? spriteConfig.shadow
      : member.downed
        ? downedSpriteReady ? DOWNED_FRAME.shadow : CHARACTER_GROUNDING.shadow.downed
        : CHARACTER_GROUNDING.shadow.standing;

    context.save();
    context.globalAlpha = CHARACTER_GROUNDING.shadow.opacity;
    context.fillStyle = CHARACTER_GROUNDING.shadow.color;
    context.beginPath();
    context.ellipse(
      0,
      shadow.offsetY,
      shadow.radiusX,
      shadow.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  }

  private drawDownedCharacter(member: CharacterState): void {
    const context = this.context;
    context.fillStyle = "#3d3026";
    context.fillRect(-8, 3, 6, 5);
    context.fillRect(1, 6, 8, 4);
    context.fillStyle = member.color;
    context.fillRect(-5, -3, 12, 9);
    context.fillStyle = "#d6a873";
    context.fillRect(1, -9, 8, 7);
    context.fillStyle = member.id === "kyle"
      ? "#858d8b"
      : member.id === "nadi"
        ? "#593437"
        : "#243353";
    context.fillRect(-1, -12, 10, 5);
    context.fillStyle = "#6f756e";
    context.fillRect(-11, 7, 14, 2);
  }

  private drawBarrier(member: CharacterState, time: number): void {
    const context = this.context;
    context.save();
    context.translate(member.pos.x, member.pos.y - 4);
    context.globalAlpha = 0.24 + Math.sin(time * 9) * 0.06;
    context.strokeStyle = "#9cffe7";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -25);
    context.lineTo(18, -12);
    context.lineTo(17, 11);
    context.lineTo(0, 18);
    context.lineTo(-17, 11);
    context.lineTo(-18, -12);
    context.closePath();
    context.stroke();
    context.restore();
  }

  private drawEnemy(enemy: EnemyState, time: number): void {
    if (enemy.kind === "mossPlun") {
      this.drawMossPlun(enemy, time);
    } else if (enemy.kind === "garacrow") {
      this.drawGaracrow(enemy, time);
    } else if (enemy.kind === "lumibane") {
      this.drawLumibane(enemy, time);
    } else if (enemy.kind === "utsurobou") {
      this.drawUtsurobou(enemy, time);
    } else {
      this.drawIwaUroko(enemy, time);
    }
    this.drawEnemyBars(enemy);
  }

  private drawMossPlun(enemy: EnemyState, time: number): void {
    const context = this.context;
    const squash = enemy.telegraph > 0
      ? 1 + (1 - enemy.telegraph / enemy.telegraphDuration) * 0.15
      : 1 + Math.sin(time * 5 + enemy.id) * 0.035;
    const spriteRenderer = this.enemySprites.mossPlun;
    const shadow = resolveMossPlunShadow(enemy);
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.fillStyle = `rgba(0,5,3,${shadow.alpha})`;
    context.beginPath();
    context.ellipse(
      0,
      1,
      shadow.radiusX,
      shadow.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    if (spriteRenderer?.status === "ready") {
      if (spriteRenderer.draw(context, enemy, time, squash)) return;
    }

    this.drawMossPlunFallback(enemy, squash);
  }

  private drawMossPlunFallback(enemy: EnemyState, squash: number): void {
    const context = this.context;
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.scale(1 / squash, squash);
    context.fillStyle = enemy.hurtFlash > 0 ? "#d7f3a1" : "#6d9d4e";
    context.fillRect(-12, -4, 24, 13);
    context.fillRect(-9, -9, 18, 19);
    context.fillStyle = "#375a38";
    context.fillRect(-12, 4, 24, 5);
    context.fillStyle = "#4f7437";
    context.fillRect(-11, -9, 22, 5);
    context.fillRect(-8, -12, 15, 4);
    context.fillStyle = "#a4c95d";
    context.fillRect(-4, -15, 3, 5);
    context.fillRect(2, -16, 3, 6);
    context.fillStyle = "#d9d06a";
    context.fillRect(6, -11, 4, 4);
    context.fillStyle = "#13221a";
    context.fillRect(-5, -2, 2, 3);
    context.fillRect(4, -2, 2, 3);
    context.fillRect(-1, 4, 3, 1);
    context.restore();
  }

  private drawGaracrow(enemy: EnemyState, time: number): void {
    const context = this.context;
    const squash = enemy.telegraph > 0
      ? 1 + (1 - enemy.telegraph / enemy.telegraphDuration) * 0.05
      : 1;
    const spriteRenderer = this.enemySprites.garacrow;
    const shadow = resolveGaracrowShadow(enemy);
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.fillStyle = `rgba(0,5,8,${shadow.alpha})`;
    context.beginPath();
    context.ellipse(
      0,
      7,
      shadow.radiusX,
      shadow.radiusY,
      shadow.rotation,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    if (spriteRenderer?.status === "ready") {
      if (spriteRenderer.draw(context, enemy, time, squash)) return;
    }

    this.drawGaracrowFallback(enemy, squash);
  }

  private drawGaracrowFallback(
    enemy: EnemyState,
    squash: number,
  ): void {
    const context = this.context;
    const direction = resolveSpriteDirection(enemy.facing, "down");
    const bodyColor = enemy.hurtFlash > 0 ? "#728b99" : "#1b2d42";
    const wingColor = enemy.hurtFlash > 0 ? "#5f7988" : "#14263a";
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.scale(1 / squash, squash);

    context.fillStyle = wingColor;
    if (direction === "down" || direction === "up") {
      context.beginPath();
      context.moveTo(-5, -14);
      context.lineTo(-22, -27);
      context.lineTo(-18, -10);
      context.lineTo(-8, -3);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(5, -14);
      context.lineTo(22, -27);
      context.lineTo(18, -10);
      context.lineTo(8, -3);
      context.closePath();
      context.fill();
    } else {
      const forward = direction === "left" ? -1 : 1;
      context.beginPath();
      context.moveTo(-7 * forward, -15);
      context.lineTo(17 * forward, -26);
      context.lineTo(21 * forward, -15);
      context.lineTo(9 * forward, -5);
      context.lineTo(-8 * forward, -4);
      context.closePath();
      context.fill();
      context.fillStyle = "#243b4f";
      context.fillRect(-4 * forward, -22, 18 * forward, 4);
    }

    context.fillStyle = bodyColor;
    context.beginPath();
    if (direction === "left" || direction === "right") {
      context.ellipse(0, -11, 14, 10, 0, 0, Math.PI * 2);
    } else {
      context.ellipse(0, -11, 9, 14, 0, 0, Math.PI * 2);
    }
    context.fill();
    context.fillStyle = "#66723f";
    if (direction === "left" || direction === "right") {
      context.fillRect(-8, -17, 16, 3);
    } else {
      context.fillRect(-7, -17, 14, 3);
    }

    context.fillStyle = "#49d8ca";
    if (direction === "down" || direction === "up") {
      context.fillRect(-18, -18, 3, 3);
      context.fillRect(15, -18, 3, 3);
      context.fillRect(-15, -11, 2, 2);
      context.fillRect(13, -11, 2, 2);
    } else {
      const rear = direction === "left" ? 1 : -1;
      context.fillRect(10 * rear, -20, 3, 3);
      context.fillRect(14 * rear, -14, 2, 2);
    }

    if (direction !== "up") {
      context.fillStyle = "#e1a83e";
      if (direction === "down") {
        context.fillRect(-5, -16, 2, 2);
        context.fillRect(3, -16, 2, 2);
        context.fillStyle = "#9b8060";
        context.fillRect(-2, -12, 4, 4);
      } else {
        const forward = direction === "left" ? -1 : 1;
        context.fillRect(5 * forward, -16, 2, 2);
        context.fillStyle = "#9b8060";
        context.fillRect(8 * forward, -13, 5 * forward, 3);
      }
    }
    context.restore();
  }

  private drawLumibane(enemy: EnemyState, time: number): void {
    const context = this.context;
    const squash = enemy.telegraph > 0
      ? 1 + (1 - enemy.telegraph / enemy.telegraphDuration) * 0.05
      : 1;
    const spriteRenderer = this.enemySprites.lumibane;
    const shadow = resolveLumibaneShadow(enemy);
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.fillStyle = `rgba(0,5,8,${shadow.alpha})`;
    context.beginPath();
    context.ellipse(
      0,
      5,
      shadow.radiusX,
      shadow.radiusY,
      shadow.rotation,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    if (spriteRenderer?.status === "ready") {
      if (spriteRenderer.draw(context, enemy, time, squash)) return;
    }

    this.drawLumibaneFallback(enemy, squash);
  }

  private drawLumibaneFallback(
    enemy: EnemyState,
    squash: number,
  ): void {
    const context = this.context;
    const direction = resolveSpriteDirection(enemy.facing, "down");
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.scale(1 / squash, squash);

    context.fillStyle = "#8ff4e8";
    if (direction === "down" || direction === "up") {
      context.beginPath();
      context.moveTo(-4, -12);
      context.lineTo(-14, -27);
      context.lineTo(-7, -25);
      context.lineTo(-1, -13);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(4, -12);
      context.lineTo(14, -27);
      context.lineTo(7, -25);
      context.lineTo(1, -13);
      context.closePath();
      context.fill();
      context.fillStyle = "#4bc9c0";
      context.fillRect(-13, -24, 5, 2);
      context.fillRect(8, -24, 5, 2);
    } else {
      const front = direction === "left" ? -1 : 1;
      context.beginPath();
      context.moveTo(-2 * front, -12);
      context.lineTo(-9 * front, -27);
      context.lineTo(-2 * front, -24);
      context.lineTo(4 * front, -12);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(2 * front, -11);
      context.lineTo(8 * front, -22);
      context.lineTo(11 * front, -18);
      context.lineTo(6 * front, -9);
      context.closePath();
      context.fill();
    }

    context.fillStyle = enemy.hurtFlash > 0 ? "#efca78" : "#9a5620";
    context.beginPath();
    if (direction === "down" || direction === "up") {
      context.ellipse(0, -7, 8, 10, 0, 0, Math.PI * 2);
    } else {
      context.ellipse(0, -7, 11, 7, 0, 0, Math.PI * 2);
    }
    context.fill();
    context.fillStyle = "#5c371c";
    context.fillRect(-5, -3, 10, 3);
    context.fillStyle = "#7f8431";
    context.fillRect(-4, -17, 8, 4);

    if (direction !== "up") {
      context.fillStyle = "#142922";
      if (direction === "down") {
        context.fillRect(-5, -10, 2, 3);
        context.fillRect(3, -10, 2, 3);
      } else {
        const eyeX = direction === "left" ? -8 : 6;
        context.fillRect(eyeX, -10, 2, 3);
      }
    }
    context.restore();
  }

  private drawUtsurobou(enemy: EnemyState, time: number): void {
    const context = this.context;
    const squash = enemy.telegraph > 0
      ? 1 + (1 - enemy.telegraph / enemy.telegraphDuration) * 0.07
      : 1;
    const spriteRenderer = this.enemySprites.utsurobou;
    const telegraph = resolveUtsurobouTelegraph(enemy);
    if (telegraph) {
      context.save();
      context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
      context.strokeStyle = `rgba(117,221,210,${telegraph.alpha})`;
      context.lineWidth = telegraph.lineWidth;
      context.beginPath();
      context.arc(0, 0, telegraph.radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    const shadow = resolveUtsurobouShadow(enemy);
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.fillStyle = `rgba(0,5,8,${shadow.alpha})`;
    context.beginPath();
    context.ellipse(
      0,
      10,
      shadow.radiusX,
      shadow.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    if (spriteRenderer?.status === "ready") {
      if (spriteRenderer.draw(context, enemy, time, squash)) return;
    }

    this.drawUtsurobouFallback(enemy, squash);
  }

  private drawUtsurobouFallback(
    enemy: EnemyState,
    squash: number,
  ): void {
    const context = this.context;
    const direction = resolveSpriteDirection(enemy.facing, "down");
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.scale(1 / squash, squash);

    context.fillStyle = enemy.hurtFlash > 0 ? "#b8b3c7" : "#625c76";
    context.fillRect(-10, -18, 20, 8);
    context.fillRect(-13, -12, 26, 13);
    context.fillStyle = enemy.hurtFlash > 0 ? "#8f899d" : "#48445b";
    context.fillRect(-9, 1, 18, 7);
    context.fillRect(-6, 8, 5, 5);
    context.fillRect(2, 7, 5, 6);
    context.fillRect(-16, -5, 4, 8);
    context.fillRect(12, -5, 4, 8);

    if (direction === "down") {
      context.fillStyle = "#bbb79e";
      context.fillRect(-6, -15, 12, 14);
      context.fillStyle = "#182020";
      context.fillRect(-4, -10, 2, 4);
      context.fillRect(2, -10, 2, 4);
      context.fillStyle = "#50c7bd";
      context.fillRect(-1, -14, 2, 4);
      context.fillRect(0, -5, 1, 4);
    } else if (direction === "left" || direction === "right") {
      const maskX = direction === "left" ? -8 : 5;
      context.fillStyle = "#aaa991";
      context.fillRect(maskX, -14, 3, 12);
      context.fillStyle = "#3bb6ad";
      context.fillRect(
        direction === "left" ? maskX : maskX + 2,
        -12,
        1,
        7,
      );
    }
    context.restore();
  }

  private drawIwaUroko(enemy: EnemyState, time: number): void {
    const context = this.context;
    const squash = enemy.telegraph > 0
      ? 1 + (1 - enemy.telegraph / enemy.telegraphDuration) * 0.08
      : 1;
    const spriteRenderer = this.enemySprites.iwaUroko;

    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.fillStyle = "rgba(0,5,4,0.42)";
    context.beginPath();
    context.ellipse(0, 3, 19, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (
      resolveIwaUrokoRenderMode(enemy.armor, spriteRenderer?.status) ===
        "sprite" &&
      spriteRenderer?.draw(context, enemy, time, squash)
    ) {
      return;
    }

    this.drawIwaUrokoFallback(enemy);
  }

  private drawIwaUrokoFallback(enemy: EnemyState): void {
    const context = this.context;
    const flip = enemy.facing.x < 0 ? -1 : 1;
    context.save();
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.scale(flip, 1);
    context.fillStyle = enemy.hurtFlash > 0 ? "#88b9a1" : "#28685f";
    context.fillRect(-15, -3, 26, 14);
    context.fillRect(-19, 1, 9, 8);
    context.fillRect(9, 3, 15, 6);
    context.fillStyle = "#345247";
    context.fillRect(-10, 8, 6, 6);
    context.fillRect(7, 8, 6, 6);
    context.fillStyle = enemy.armor > 0 ? "#70775f" : "#496b5d";
    const plateCount = enemy.armor > 0 ? 5 : 2;
    for (let plate = 0; plate < plateCount; plate += 1) {
      context.fillRect(-13 + plate * 6, -9 + Math.abs(plate - 2), 7, 7);
      context.fillStyle = plate % 2 ? "#879078" : enemy.armor > 0 ? "#69735e" : "#496b5d";
    }
    context.fillStyle = "#d5aa45";
    context.fillRect(-16, 1, 3, 3);
    context.fillStyle = "#172018";
    context.fillRect(-15, 1, 1, 2);
    if (enemy.armor === 0) {
      context.strokeStyle = "#4ac8bb";
      context.beginPath();
      context.moveTo(-10, -7);
      context.lineTo(-5, -2);
      context.lineTo(-7, 3);
      context.stroke();
    }
    context.restore();
  }

  private drawEnemyBars(enemy: EnemyState): void {
    const context = this.context;
    const width = enemy.kind === "iwaUroko"
      ? 34
      : enemy.kind === "garacrow"
        ? 32
        : enemy.kind === "lumibane"
          ? 24
          : 26;
    const x = Math.floor(enemy.pos.x - width / 2);
    const heightOffset = enemy.kind === "iwaUroko"
      ? 38
      : enemy.kind === "garacrow"
        ? 43
        : enemy.kind === "lumibane"
          ? 38
          : enemy.kind === "utsurobou"
            ? 40
            : 36;
    const y = Math.floor(enemy.pos.y - heightOffset);
    context.fillStyle = "rgba(1,7,6,0.8)";
    context.fillRect(x - 1, y - 1, width + 2, enemy.maxArmor > 0 ? 7 : 5);
    context.fillStyle = "#4a201e";
    context.fillRect(x, y, width, 3);
    context.fillStyle = "#cf6955";
    context.fillRect(x, y, Math.floor(width * enemy.hp / enemy.maxHp), 3);
    if (enemy.maxArmor > 0 && enemy.armor > 0) {
      context.fillStyle = "#283d43";
      context.fillRect(x, y + 4, width, 2);
      context.fillStyle = "#86a9a7";
      context.fillRect(x, y + 4, Math.floor(width * enemy.armor / enemy.maxArmor), 2);
    }
  }

  private drawProjectiles(projectiles: readonly Projectile[], time: number): void {
    const context = this.context;
    for (const projectile of projectiles) {
      if (!projectile.active) continue;
      const rotation = Math.atan2(projectile.velocity.y, projectile.velocity.x);
      context.save();
      context.translate(Math.round(projectile.pos.x), Math.round(projectile.pos.y));
      context.rotate(rotation);
      if (projectile.kind === "moonBlade") {
        context.rotate(time * 13);
        context.lineCap = "butt";
        context.strokeStyle = "#163f3d";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(0, 0, 6, 0.16, 2.78);
        context.arc(0, 0, 6, 3.34, 6.02);
        context.stroke();
        context.strokeStyle = resolveNormalEffectCoreColor(
          "#d9ffff",
          "#9fc9c5",
        );
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(0, 0, 6, 0.16, 2.78);
        context.arc(0, 0, 6, 3.34, 6.02);
        context.stroke();
        context.strokeStyle = "#60cfcb";
        context.lineWidth = 1;
        context.beginPath();
        context.arc(0, 0, 4, 0.46, 2.56);
        context.arc(0, 0, 4, 3.68, 5.72);
        context.stroke();
        context.fillStyle = "#60cfcb";
        context.fillRect(5, -1, 2, 2);
        context.fillRect(-7, 0, 2, 1);
      } else if (projectile.kind === "windBlade") {
        context.globalAlpha = 0.84;
        context.fillStyle = "#69e5d5";
        context.beginPath();
        context.moveTo(13, 0);
        context.quadraticCurveTo(-2, -17, -14, -9);
        context.quadraticCurveTo(-2, 0, -14, 9);
        context.quadraticCurveTo(-2, 17, 13, 0);
        context.fill();
        context.strokeStyle = "#e3fff8";
        context.beginPath();
        context.moveTo(11, 0);
        context.quadraticCurveTo(-2, -11, -11, -8);
        context.stroke();
      } else {
        context.fillStyle = "#245c54";
        context.beginPath();
        context.moveTo(0, -4);
        context.lineTo(4, 0);
        context.lineTo(0, 4);
        context.lineTo(-4, 0);
        context.closePath();
        context.fill();
        context.fillStyle = resolveNormalEffectCoreColor(
          "#d7ffed",
          "#91c6b7",
        );
        context.beginPath();
        context.moveTo(0, -2);
        context.lineTo(2, 0);
        context.lineTo(0, 2);
        context.lineTo(-2, 0);
        context.closePath();
        context.fill();
        context.fillStyle = "#54d4b9";
        context.fillRect(-5, 1, 2, 1);
        context.fillRect(3, -3, 1, 2);
        context.fillRect(3, 2, 2, 1);
      }
      context.restore();
    }
  }

  private drawEffects(layer: Effect["layer"]): void {
    for (const effect of this.effectPool.effects) {
      if (!effect.active || effect.kind === "text" || effect.layer !== layer) continue;
      this.drawEffect(effect);
    }
  }

  private drawEffect(effect: Effect): void {
    const context = this.context;
    const progress = 1 - effect.life / effect.maxLife;
    const fade = Math.min(1, effect.life / Math.min(0.18, effect.maxLife));
    context.save();
    context.translate(Math.round(effect.pos.x), Math.round(effect.pos.y));
    context.rotate(effect.rotation);
    context.globalAlpha = effect.alpha * fade;
    context.strokeStyle = effect.color;
    context.fillStyle = effect.color;

    if (effect.kind === "spark") {
      const size = Math.max(1, effect.size * (1 - progress * 0.55));
      context.fillRect(-size / 2, -size / 2, size, size);
    } else if (effect.kind === "dust") {
      context.fillRect(-effect.size / 2, -effect.size / 2, effect.size, effect.size * 0.7);
    } else if (effect.kind === "leaf") {
      context.rotate(effect.rotation + progress * 3);
      context.beginPath();
      context.moveTo(0, -effect.size);
      context.lineTo(effect.size * 0.65, 0);
      context.lineTo(0, effect.size);
      context.lineTo(-effect.size * 0.4, 0);
      context.closePath();
      context.fill();
    } else if (effect.kind === "ring") {
      context.lineWidth = Math.max(1, 4 - progress * 3);
      context.beginPath();
      context.ellipse(
        0,
        0,
        effect.size * (0.25 + progress * 0.75),
        effect.size * (0.14 + progress * 0.46),
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    } else if (effect.kind === "slash") {
      context.lineWidth = Math.max(1, 5 - progress * 4);
      context.beginPath();
      context.arc(0, 0, effect.size * (0.78 + progress * 0.22), -1.05, 1.05);
      context.stroke();
    } else if (effect.kind === "wind") {
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-effect.size * 0.65, -effect.size * 0.25);
      context.quadraticCurveTo(0, -effect.size * 0.65, effect.size * 0.7, 0);
      context.quadraticCurveTo(0, effect.size * 0.45, -effect.size * 0.65, effect.size * 0.2);
      context.stroke();
    } else if (effect.kind === "crystal") {
      const size = effect.size * (0.45 + Math.min(1, progress * 3) * 0.55);
      context.globalAlpha *= 0.72;
      context.beginPath();
      context.moveTo(0, -size);
      context.lineTo(size * 0.34, -size * 0.15);
      context.lineTo(size * 0.22, size * 0.5);
      context.lineTo(-size * 0.24, size * 0.5);
      context.lineTo(-size * 0.36, -size * 0.15);
      context.closePath();
      context.fill();
      context.globalAlpha *= 0.9;
      context.fillStyle = "#edfff9";
      context.fillRect(-2, -size * 0.8, 3, size * 0.9);
    } else if (effect.kind === "barrier") {
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, -4, effect.size, Math.PI, Math.PI * 2);
      context.stroke();
    } else if (effect.kind === "bladeArc") {
      const outerRadius = effect.size - 2 + progress * 3;
      const innerRadius = effect.size - 6 + progress * 2;
      context.lineCap = "butt";
      context.strokeStyle = "#173f3c";
      context.lineWidth = Math.max(1.5, 4 - progress * 2.25);
      context.beginPath();
      context.arc(0, 0, outerRadius, -1.08, 1.08);
      context.stroke();
      context.strokeStyle = effect.color;
      context.lineWidth = Math.max(1, 3 - progress * 1.8);
      context.beginPath();
      context.arc(0, 0, outerRadius, -1.04, 1.04);
      context.stroke();
      context.strokeStyle = resolveNormalEffectCoreColor(
        "#effff9",
        "#bdd8d1",
      );
      context.lineWidth = Math.max(1, 1.6 - progress * 0.6);
      context.beginPath();
      context.arc(2, 0, innerRadius, -0.96, 0.96);
      context.stroke();
    } else if (effect.kind === "moonTrail") {
      const radius = Math.max(3, effect.size - progress * 1.5);
      context.lineCap = "butt";
      context.strokeStyle = "#1a504d";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, radius, 2.25, 2.92);
      context.arc(0, 0, radius, 3.22, 3.94);
      context.stroke();
      context.strokeStyle = effect.color;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(0, 0, radius, 2.25, 2.92);
      context.arc(0, 0, radius, 3.22, 3.94);
      context.stroke();
    } else if (effect.kind === "phosphorMote") {
      const size = Math.max(1, Math.round(effect.size * (1 - progress * 0.4)));
      context.fillStyle = "#245c54";
      context.fillRect(-1, 0, size + 1, size);
      context.fillStyle = effect.color;
      context.fillRect(0, -1, size, size);
    } else if (effect.kind === "impactRing") {
      const radius = Math.max(2, effect.size * (0.36 + progress * 0.64));
      context.lineCap = "butt";
      context.strokeStyle = "#214c48";
      context.lineWidth = Math.max(1, 2.5 - progress);
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = effect.color;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(0, 0, radius, 0.12, Math.PI * 2 - 0.12);
      context.stroke();

    }
    context.restore();
  }
}
