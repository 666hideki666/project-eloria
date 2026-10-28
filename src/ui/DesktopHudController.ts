import { COMBAT } from "../config";
import { canMeruAutoHeal } from "../game/combatRules";
import type {
  CharacterId,
  CharacterState,
  WorldSnapshot,
} from "../game/types";
import type { GameWorld } from "../game/GameWorld";

type ActionSlotId = "normal" | "special" | "ultimate" | "switch";

interface PartyRowElements {
  root: HTMLElement;
  hpValue: HTMLElement;
  hpFill: HTMLElement;
  mpValue: HTMLElement | null;
  mpFill: HTMLElement | null;
  autoHeal: HTMLElement | null;
  techValue: HTMLElement;
  techFill: HTMLElement;
  techFeedback: HTMLElement;
}

interface ActionSlotElements {
  root: HTMLElement;
  skill: HTMLElement;
  cooldown: HTMLElement;
  cooldownFill: HTMLElement;
}

interface DesktopHudElements {
  shell: HTMLElement;
  area: HTMLElement;
  encounter: HTMLElement;
  trial: HTMLElement;
  enemies: HTMLElement;
  pause: HTMLButtonElement;
  pauseLabel: HTMLElement;
  partyRows: NodeListOf<HTMLElement>;
  actionSlots: NodeListOf<HTMLElement>;
}

const ABILITY_NAMES: Record<
  CharacterId,
  Record<Exclude<ActionSlotId, "switch">, string>
> = {
  kyle: {
    normal: "連刃剣",
    special: "破陣突き",
    ultimate: "裂空断",
  },
  nadi: {
    normal: "月輪投げ",
    special: "円月旋",
    ultimate: "月蝕乱舞",
  },
  meru: {
    normal: "燐光弾",
    special: "癒しの環",
    ultimate: "天晶崩落",
  },
};

function requireChild<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`HUD element is missing: ${selector}`);
  return element;
}

function ratio(value: number, maximum: number): number {
  if (maximum <= 0) return 0;
  return Math.min(1, Math.max(0, value / maximum));
}

export class DesktopHudController {
  private readonly partyRows = new Map<CharacterId, PartyRowElements>();
  private readonly actionSlots = new Map<ActionSlotId, ActionSlotElements>();

  public constructor(
    private readonly elements: DesktopHudElements,
    private readonly world: GameWorld,
    private readonly focusTarget: HTMLElement,
  ) {
    for (const root of elements.partyRows) {
      const id = root.dataset.partyId as CharacterId | undefined;
      if (!id) continue;
      const feedback = document.createElement("strong");
      feedback.className = "tech-feedback"; feedback.hidden = true;
      feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite");
      requireChild(root, ".tech-readout").append(feedback);
      this.partyRows.set(id, {
        root,
        hpValue: requireChild(root, "[data-hp-value]"),
        hpFill: requireChild(root, "[data-hp-fill]"),
        mpValue: root.querySelector("[data-mp-value]"),
        mpFill: root.querySelector("[data-mp-fill]"),
        autoHeal: root.querySelector("[data-auto-heal]"),
        techValue: requireChild(root, "[data-tech-value]"),
        techFill: requireChild(root, "[data-tech-fill]"),
        techFeedback: feedback,
      });
    }
    for (const root of elements.actionSlots) {
      const id = root.dataset.actionSlot as ActionSlotId | undefined;
      if (!id) continue;
      this.actionSlots.set(id, {
        root,
        skill: requireChild(root, "[data-action-skill]"),
        cooldown: requireChild(root, "[data-action-cooldown]"),
        cooldownFill: requireChild(root, "[data-action-cooldown-fill]"),
      });
    }
    elements.pause.addEventListener("click", this.handlePause);
  }

  public render(snapshot: WorldSnapshot): void {
    const alive = snapshot.enemies.filter((enemy) => enemy.alive).length;
    const stageMode = snapshot.mode === "stage";
    this.elements.area.textContent = stageMode
      ? snapshot.roomName ?? "晶界"
      : "晶界・試練の環";
    const stageCombat = stageMode && snapshot.partyPresence === "formation";
    this.elements.encounter.hidden = stageMode && !stageCombat;
    this.elements.trial.hidden = stageMode;
    this.elements.enemies.hidden = stageMode && !stageCombat;
    if (!stageMode) {
      this.elements.trial.textContent =
        `TRIAL ${String(snapshot.wave).padStart(2, "0")}`;
      this.elements.enemies.textContent =
        `ENEMY ${alive}/${snapshot.enemies.length}`;
    } else if (stageCombat) {
      if (snapshot.velgran?.phase && snapshot.velgran.phase !== "dormant" && snapshot.velgran.phase !== "cleared") {
        this.elements.enemies.textContent = "GUARDIAN";
      } else {
        this.elements.enemies.textContent = snapshot.encounterTotal > 0
          ? `ENEMY ${snapshot.encounterAlive}/${snapshot.encounterTotal}`
          : `ENEMY ${alive}/${snapshot.enemies.length}`;
      }
    }
    this.elements.shell.dataset.active = snapshot.activeId;
    this.elements.shell.dataset.phase = snapshot.phase;

    const autoHealReady = canMeruAutoHeal(snapshot.party, snapshot.activeId);
    for (const member of snapshot.party) {
      this.renderPartyRow(
        member,
        member.id === snapshot.activeId,
        autoHealReady,
        snapshot.techFeedback,
      );
    }

    const active = snapshot.party.find(
      (member) => member.id === snapshot.activeId,
    );
    if (active) this.renderActions(active, snapshot.switchCooldown);

    const pauseAvailable =
      snapshot.phase === "playing" || snapshot.phase === "paused";
    this.elements.pause.disabled = !pauseAvailable;
    this.elements.pause.dataset.paused = String(snapshot.phase === "paused");
    this.elements.pauseLabel.textContent =
      snapshot.phase === "paused" ? "再開" : "ポーズ";
    this.elements.pause.setAttribute(
      "aria-label",
      snapshot.phase === "paused" ? "戦闘を再開（Esc）" : "ポーズ（Esc）",
    );
  }

  public destroy(): void {
    this.elements.pause.removeEventListener("click", this.handlePause);
  }

  private renderPartyRow(
    member: CharacterState,
    active: boolean,
    autoHealReady: boolean,
    failure: WorldSnapshot["techFeedback"],
  ): void {
    const row = this.partyRows.get(member.id);
    if (!row) return;
    row.root.dataset.active = String(active);
    row.root.dataset.downed = String(member.downed);
    row.root.setAttribute("aria-current", active ? "true" : "false");
    row.hpValue.textContent = member.downed
      ? "DOWN"
      : active
        ? `${Math.ceil(member.hp)} / ${member.maxHp}`
        : `HP ${Math.ceil(member.hp)}`;
    row.hpFill.style.width =
      `${Math.round(ratio(member.hp, member.maxHp) * 100)}%`;
    if (row.mpValue && row.mpFill) {
      row.mpValue.textContent = `${Math.ceil(member.mp)} / ${member.maxMp}`;
      row.mpFill.style.width =
        `${Math.round(ratio(member.mp, member.maxMp) * 100)}%`;
    }
    const usable = Math.floor(member.techCharge + 1e-9);
    row.techValue.textContent = `${usable}/3`;
    row.techFill.style.width = `${(member.techCharge / 3 * 100).toFixed(2)}%`;
    row.techFill.parentElement?.parentElement?.setAttribute(
      "aria-label",
      `技ゲージ ${member.techCharge.toFixed(1)} / 3、使用可能 ${usable}段`,
    );
    row.techFeedback.hidden = !active || failure?.character !== member.id;
    const failureText = failure?.character === member.id ? `ゲージ不足：${failure.required}段必要` : "";
    if (row.techFeedback.textContent !== failureText) row.techFeedback.textContent = failureText;
    row.root.dataset.techReady = String(member.techCharge >= 3);
    row.root.dataset.hpLow = String(!member.downed && member.hp / member.maxHp <= 0.3);
    row.root.dataset.mpLow = String(member.id === "meru" && member.mp / Math.max(1, member.maxMp) <= 0.25);
    if (row.autoHeal) {
      row.autoHeal.hidden = !autoHealReady;
    }
  }

  private renderActions(
    active: CharacterState,
    switchCooldown: number,
  ): void {
    this.renderActionSlot(
      "normal",
      ABILITY_NAMES[active.id].normal,
      active.cooldowns.normal,
      COMBAT.normalCooldown[active.id],
    );
    this.renderActionSlot(
      "special",
      ABILITY_NAMES[active.id].special,
      active.cooldowns.special,
      COMBAT.specialCooldown[active.id],
    );
    this.renderActionSlot(
      "ultimate",
      ABILITY_NAMES[active.id].ultimate,
      active.cooldowns.ultimate,
      COMBAT.ultimateCooldown[active.id],
    );
    this.renderActionSlot(
      "switch",
      "キャラクター交代",
      switchCooldown,
      COMBAT.switchCooldown,
    );
  }

  private renderActionSlot(
    id: ActionSlotId,
    skill: string,
    cooldown: number,
    maximum: number,
  ): void {
    const slot = this.actionSlots.get(id);
    if (!slot) return;
    const ready = cooldown <= 0;
    slot.root.dataset.ready = String(ready);
    slot.skill.textContent = skill;
    slot.cooldown.textContent = ready ? "READY" : cooldown.toFixed(1);
    slot.cooldownFill.style.height =
      `${Math.round(ratio(cooldown, maximum) * 100)}%`;
    slot.root.setAttribute(
      "aria-label",
      ready ? `${skill} 使用可能` : `${skill} あと${cooldown.toFixed(1)}秒`,
    );
  }

  private readonly handlePause = (): void => {
    if (!this.world.togglePause()) return;
    this.focusTarget.focus();
    this.render(this.world.snapshot);
  };
}
