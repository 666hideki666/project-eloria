import type { GameWorld } from "../game/GameWorld";
import type { CharacterId, WorldSnapshot } from "../game/types";

interface StatusPanelElements {
  root: HTMLElement;
  name: HTMLElement;
  health: HTMLElement;
  mana: HTMLElement;
  tech: HTMLElement;
  techFill: HTMLElement;
  abilities: HTMLElement;
  close: HTMLButtonElement;
  faces: NodeListOf<HTMLElement>;
}

const ABILITIES: Record<CharacterId, readonly [string, string, string]> = {
  kyle: ["連刃剣｜前方への二連斬撃", "破陣突き｜前進して岩装甲を砕く", "裂空断｜風刃を放つ"],
  nadi: ["月輪投げ｜往復する月輪刃", "円月旋｜周囲を払う", "月蝕乱舞｜広がる四段の演舞"],
  meru: ["燐光弾｜敵を緩く追う魔法弾", "癒しの環｜周囲の仲間を回復", "天晶崩落｜敵へ晶石を落とす"],
};

export class StatusPanelController {
  private selectedId: CharacterId | null = null;

  public constructor(
    private readonly elements: StatusPanelElements,
    private readonly world: GameWorld,
    private readonly focusTarget: HTMLElement,
    private readonly onToggle: () => void,
  ) {
    elements.close.addEventListener("click", () => this.close());
    for (const face of elements.faces) {
      face.addEventListener("click", () => this.toggle(face.dataset.partyId as CharacterId));
      face.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        this.toggle(face.dataset.partyId as CharacterId);
      });
    }
  }

  public get isOpen(): boolean {
    return this.selectedId !== null;
  }

  public toggle(id: CharacterId): void {
    if (this.world.phase !== "playing" || this.world.inputLocked) return;
    if (this.selectedId === id) {
      this.close();
      return;
    }
    this.selectedId = id;
    this.elements.root.hidden = false;
    this.render(this.world.snapshot);
    this.elements.close.focus();
    this.onToggle();
  }

  public close(): void {
    if (!this.selectedId) return;
    this.selectedId = null;
    this.elements.root.hidden = true;
    this.focusTarget.focus();
    this.onToggle();
  }

  public render(snapshot: WorldSnapshot): void {
    if (!this.selectedId) return;
    const member = snapshot.party.find((item) => item.id === this.selectedId);
    if (!member) return;
    this.elements.name.textContent = member.name;
    this.elements.health.textContent = member.downed
      ? `HP ${Math.ceil(member.hp)} / ${member.maxHp}　戦闘不能`
      : `HP ${Math.ceil(member.hp)} / ${member.maxHp}`;
    this.elements.mana.hidden = member.id !== "meru";
    if (member.id === "meru") this.elements.mana.textContent = `MP ${Math.ceil(member.mp)} / ${member.maxMp}`;
    const usable = Math.floor(member.techCharge + 1e-9);
    this.elements.tech.textContent = member.techCharge >= 3
      ? "技ゲージ 3.0 / 3　満タン｜L 発動可能"
      : `技ゲージ ${member.techCharge.toFixed(1)} / 3　5秒で1段｜使用可能 ${usable}段`;
    this.elements.techFill.style.width = `${(member.techCharge / 3 * 100).toFixed(2)}%`;
    const [normal, special, ultimate] = ABILITIES[member.id];
    this.elements.abilities.replaceChildren();
    for (const [key, title, cooldown] of [
      ["J｜0段", normal, member.cooldowns.normal],
      ["K｜1段", special, member.cooldowns.special],
      ["L｜3段", ultimate, member.cooldowns.ultimate],
    ] as const) {
      const row = document.createElement("p");
      const label = document.createElement("strong");
      label.textContent = key;
      const body = document.createElement("span");
      body.textContent = title;
      row.append(label, body);
      if (cooldown > 0) {
        const lock = document.createElement("small");
        lock.textContent = `あと${cooldown.toFixed(1)}秒`;
        row.append(lock);
      }
      this.elements.abilities.append(row);
    }
    this.elements.root.setAttribute("aria-label", `${member.name}の状態`);
  }
}
