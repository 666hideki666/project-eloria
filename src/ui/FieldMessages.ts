import type { Effect } from "../effects/EffectPool";
import type { WorldSnapshot } from "../game/types";

interface Rect { left: number; top: number; right: number; bottom: number; width: number; height: number; }
export function isBossGaugeVisible(snapshot: Pick<WorldSnapshot, "velgran">): boolean {
  return Boolean(snapshot.velgran && ["active", "coreExposed", "recovering"].includes(snapshot.velgran.phase));
}
export function bossGaugeValues(boss: NonNullable<WorldSnapshot["velgran"]>) {
  const ratio = (value: number, max: number) => max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return { hp: ratio(boss.hp, boss.maxHp), armor: ratio(boss.armor, boss.maxArmor), core: boss.armor <= 0 && boss.phase === "coreExposed" };
}
export function fieldMessageLayout(field: Rect, party: Rect, controls: Rect, boss: boolean, bossBottom?: number) {
  let top = boss ? (bossBottom ?? 38 / 360 * field.height) + 10 : 12;
  let left = party.bottom > field.top + top ? Math.max(14, party.right - field.left + 12) : 14;
  let right = controls.bottom > field.top + top ? Math.max(14, field.right - controls.left + 12) : 14;
  if (field.width - left - right < 240) {
    top = Math.max(top, party.bottom - field.top + 10, controls.bottom - field.top + 10);
    left = right = 14;
  }
  const width = Math.min(640, field.width - left - right);
  return { top, left: left + (field.width - left - right - width) / 2, width };
}

type MessageSnapshot = Pick<WorldSnapshot, "mode" | "phase" | "dialogue" | "banner" | "bannerTimer" | "roomTransitionOpacity">;
export function fieldBannerText(snapshot: MessageSnapshot, blocked: boolean): string {
  return !blocked && snapshot.phase === "playing" && !snapshot.dialogue && snapshot.bannerTimer > 0 && snapshot.roomTransitionOpacity === 0
    ? snapshot.banner : "";
}
export function fieldPromptText(snapshot: MessageSnapshot & Pick<WorldSnapshot, "interactionPrompt">, blocked: boolean): string {
  return !blocked && snapshot.phase === "playing" && !snapshot.dialogue && snapshot.bannerTimer <= 0 && snapshot.roomTransitionOpacity === 0
    ? snapshot.interactionPrompt ?? "" : "";
}
export function projectEffectText(effect: Effect, snapshot: Pick<WorldSnapshot, "mode" | "stageLayer" | "camera">, width: number, height: number) {
  const scrolling = snapshot.mode === "stage" && snapshot.stageLayer !== null;
  return {
    x: (Math.round(effect.pos.x) - (scrolling ? snapshot.camera.x : 0)) * width / 640,
    y: (Math.round(effect.pos.y) - (scrolling ? snapshot.camera.y : 0)) * height / 360,
    opacity: effect.alpha * Math.min(1, effect.life / Math.min(.18, effect.maxLife)),
    fontSize: Math.max(16, effect.size * height / 360),
  };
}

/** All reading text uses display-resolution DOM; game logic remains in the world. */
export class FieldMessages {
  private boss = false;
  private readonly resize: ResizeObserver;
  private readonly prompt: HTMLElement;
  private readonly dialogue: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly copy: HTMLElement;
  private readonly advance: HTMLElement;
  private readonly live: HTMLElement;
  private readonly gauge: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly armor: HTMLElement;
  private readonly core: HTMLElement;
  private readonly floating: HTMLElement;
  private readonly nodes = new Map<Effect, HTMLElement>();
  private page = "";
  private announcement = "";
  private width = 640;
  private height = 360;

  public constructor(private readonly root: HTMLElement, private readonly field: HTMLElement,
    private readonly party: HTMLElement, private readonly controls: HTMLElement,
    private readonly effects: readonly Effect[], private readonly interact: () => void) {
    this.prompt = field.querySelector("#field-prompt")!;
    this.dialogue = field.querySelector("#field-dialogue")!;
    this.heading = this.dialogue.querySelector(".field-dialogue-heading")!;
    this.copy = this.dialogue.querySelector(".field-dialogue-copy")!;
    this.advance = this.dialogue.querySelector(".field-dialogue-advance")!;
    this.live = this.dialogue.querySelector(".field-dialogue-live")!;
    this.gauge = field.querySelector("#field-boss")!;
    this.hp = this.gauge.querySelector(".field-boss-hp")!;
    this.armor = this.gauge.querySelector(".field-boss-armor")!;
    this.core = this.gauge.querySelector(".field-boss-core")!;
    this.floating = field.querySelector("#field-floating")!;
    this.dialogue.addEventListener("click", this.onDialogueClick);
    this.resize = new ResizeObserver(() => this.layout());
    [field, party, controls, this.gauge].forEach(node => this.resize.observe(node));
    this.layout();
  }
  private readonly onDialogueClick = (event: MouseEvent): void => {
    if (!this.dialogue.hidden && !window.getSelection()?.toString()) {
      this.interact(); // Use the same input buffer and locks as a canvas tap.
      if (["touch", "pen"].includes((event as PointerEvent).pointerType)) document.body.dataset.input = "touch";
    }
  };
  private layout(): void {
    const field = this.field.getBoundingClientRect(), party = this.party.getBoundingClientRect(), controls = this.controls.getBoundingClientRect();
    this.width = field.width; this.height = field.height;
    const gauge = fieldMessageLayout(field, party, controls, false);
    Object.assign(this.gauge.style, { top: `${gauge.top}px`, left: `${gauge.left}px`, width: `${gauge.width}px` });
    const p = fieldMessageLayout(field, party, controls, this.boss, this.gauge.getBoundingClientRect().bottom - field.top);
    Object.assign(this.root.style, { top: `${p.top}px`, left: `${p.left}px`, width: `${p.width}px` });
    this.prompt.style.bottom = "16px";
    const reserved = Math.max(party.bottom - field.top, controls.bottom - field.top,
      this.boss ? this.gauge.getBoundingClientRect().bottom - field.top : 0);
    this.dialogue.style.maxHeight = `${Math.max(80, field.height - reserved - 24)}px`;
  }
  public render(snapshot: WorldSnapshot, blocked: boolean): void {
    const available = !blocked && snapshot.phase === "playing" && snapshot.roomTransitionOpacity === 0;
    const boss = !blocked && snapshot.roomTransitionOpacity === 0 && isBossGaugeVisible(snapshot);
    this.gauge.hidden = !boss;
    if (boss) {
      const value = bossGaugeValues(snapshot.velgran!);
      this.hp.style.width = `${value.hp * 100}%`;
      this.armor.style.width = `${value.armor * 100}%`;
      this.core.hidden = !value.core;
      this.gauge.setAttribute("aria-valuenow", String(Math.round(snapshot.velgran!.hp)));
      this.gauge.setAttribute("aria-valuemax", String(snapshot.velgran!.maxHp));
      this.gauge.setAttribute("aria-valuetext", `HP ${Math.round(snapshot.velgran!.hp)} / ${snapshot.velgran!.maxHp}、装甲 ${Math.round(snapshot.velgran!.armor)} / ${snapshot.velgran!.maxArmor}${value.core ? "、晶核露出" : ""}`);
    }
    if (boss !== this.boss) { this.boss = boss; this.layout(); }
    const text = fieldBannerText(snapshot, blocked);
    this.root.hidden = !text;
    if (text && this.root.textContent !== text) this.root.textContent = text;
    this.root.style.opacity = String(Math.min(1, snapshot.bannerTimer * 6));
    const prompt = fieldPromptText(snapshot, blocked);
    this.prompt.hidden = !prompt;
    if (prompt && this.prompt.textContent !== prompt) this.prompt.textContent = prompt;
    const d = available ? snapshot.dialogue : null;
    this.dialogue.hidden = !d;
    if (d) {
      const page = `${d.sourceId}:${d.pageIndex}`;
      if (page !== this.page) {
        this.page = page; this.announcement = ""; this.live.textContent = "";
        this.heading.textContent = `${d.sourceId.startsWith("dev") ? "DEV SYSTEM" : "晶界の記録"}　${d.pageIndex + 1} / ${d.pageCount}`;
        this.dialogue.scrollTop = 0;
      }
      if (this.copy.textContent !== d.text) this.copy.textContent = d.text;
      this.advance.hidden = !d.fullyVisible;
      if (d.fullyVisible && this.announcement !== page) { this.announcement = page; this.live.textContent = d.text; }
    } else { this.page = ""; this.announcement = ""; this.live.textContent = ""; }
    // No CSS animation: movement and fading read the same frozen EffectPool on pause.
    this.floating.hidden = blocked || snapshot.phase === "intro" || snapshot.phase === "gameover" || snapshot.roomTransitionOpacity > 0;
    const active = new Set<Effect>();
    for (const effect of this.effects) {
      if (!effect.active || effect.kind !== "text") continue;
      active.add(effect);
      let node = this.nodes.get(effect);
      if (!node) { node = document.createElement("span"); this.nodes.set(effect, node); this.floating.append(node); }
      const p = projectEffectText(effect, snapshot, this.width, this.height);
      if (node.textContent !== effect.text) node.textContent = effect.text;
      Object.assign(node.style, { left: `${p.x}px`, top: `${p.y}px`, opacity: String(p.opacity), color: effect.color,
        fontSize: `${p.fontSize}px`, transform: `translate(-50%, -50%) rotate(${effect.rotation}rad)` });
    }
    for (const [effect, node] of this.nodes) if (!active.has(effect)) { node.remove(); this.nodes.delete(effect); }
  }
  public destroy(): void {
    this.resize.disconnect(); this.dialogue.removeEventListener("click", this.onDialogueClick);
    [this.root, this.prompt, this.dialogue, this.gauge, this.floating].forEach(node => { node.hidden = true; });
    for (const node of this.nodes.values()) node.remove(); this.nodes.clear();
  }
}
