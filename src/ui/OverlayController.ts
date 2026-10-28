import type { GameWorld } from "../game/GameWorld";
import type { CharacterId, GamePhase } from "../game/types";

const PAUSE_ABILITY_HELP: Record<CharacterId, string> = {
  kyle: "J 連刃剣（前方二連斬撃）｜K 破陣突き（装甲を砕く・1段）｜L 裂空断（風刃・3段）",
  nadi: "J 月輪投げ（往復する刃）｜K 円月旋（周囲を払う・1段）｜L 月蝕乱舞（四段の演舞・3段）",
  meru: "J 燐光弾（追尾する魔法）｜K 癒しの環（仲間を回復・1段）｜L 天晶崩落（晶石の攻撃・3段）",
};

interface OverlayElements {
  root: HTMLElement;
  kicker: HTMLElement;
  title: HTMLElement;
  copy: HTMLElement;
  action: HTMLButtonElement;
  hint: HTMLElement;
}

interface OverlayContent {
  kicker: string;
  title: string;
  copy: string;
  action: string;
  key: string;
  hint: string;
}

export class OverlayController {
  private renderedPhase: GamePhase | null = null;

  public constructor(
    private readonly elements: OverlayElements,
    private readonly world: GameWorld,
    private readonly focusTarget: HTMLElement,
    private readonly onPhaseRendered: (phase: GamePhase) => void = () => {},
  ) {
    elements.action.addEventListener("click", () => {
      world.confirm();
      this.focusTarget.focus();
      this.sync(true);
    });
  }

  public sync(force = false): void {
    if (!force && this.renderedPhase === this.world.phase) return;
    this.renderedPhase = this.world.phase;
    this.onPhaseRendered(this.world.phase);
    const { root } = this.elements;

    if (this.world.phase === "playing") {
      root.classList.remove("is-visible");
      root.setAttribute("aria-hidden", "true");
      return;
    }

    const content = this.getContent(this.world.phase);
    if (!content) { root.classList.remove("is-visible"); root.setAttribute("aria-hidden", "true"); return; }
    this.elements.kicker.textContent = content.kicker;
    this.elements.title.textContent = content.title;
    this.elements.copy.textContent = content.copy;
    this.elements.action.replaceChildren(
      document.createTextNode(`${content.action} `),
      this.createKey(content.key),
    );
    this.elements.hint.textContent = content.hint;
    root.classList.add("is-visible");
    root.setAttribute("aria-hidden", "false");
  }

  private createKey(label: string): HTMLElement {
    const key = document.createElement("kbd");
    key.textContent = label;
    return key;
  }

  private getContent(phase: GamePhase): OverlayContent | null {
    if (phase === "intro") {
      if (this.world.mode === "stage") {
        return {
          kicker: "PROJECT ELORIA",
          title: "晶界・苔根の遺構",
          copy: "森の封印石を求め、カイルたちはクリスタルの記憶空間へ降り立った。",
          action: "探索開始",
          key: "E",
          hint: "WASD 移動 ・ Space 交代 ・ E 調べる",
        };
      }
      return {
        kicker: "FIRST COMBAT TEST",
        title: "晶界・試練の環",
        copy: "3人の役割を切り替え、遺跡に巣食う魔物を退けよう。",
        action: "戦闘開始",
        key: "E",
        hint: "WASD 移動 ・ J 通常 ・ K 特殊 ・ L 大技 ・ Space 交代",
      };
    }
    if (phase === "paused") {
      return {
        kicker: "PAUSED",
        title: "一時停止",
        copy: this.world.mode === "stage"
          ? `現在地 ${this.world.roomName ?? "晶界"}`
          : `獲得経験値 ${this.world.exp} EXP　｜　試練 ${this.world.wave}`,
        action: "戦闘へ戻る",
        key: "ESC",
        hint: this.world.mode === "stage"
          ? `${PAUSE_ABILITY_HELP[this.world.activeId]}｜Space 交代｜I 状態｜E 調べる`
          : `${PAUSE_ABILITY_HELP[this.world.activeId]}｜Space 交代｜I 状態`,
      };
    }
    if (phase === "cleared") {
      if (this.world.mode === "stage") return null;
      return {
        kicker: "ARENA CLEAR",
        title: "試練突破",
        copy: `獲得経験値 ${this.world.exp} EXP　戦闘不能の仲間はHP30%で復帰した。`,
        action: "次の模擬戦",
        key: "E",
        hint: "経験値と現在のHP・MPを引き継いで繰り返し試せます。",
      };
    }
    if (phase === "gameover") {
      return {
        kicker: "PARTY DEFEATED",
        title: "ゲームオーバー",
        copy: `獲得経験値 ${this.world.exp} EXP は失われません。`,
        action: "この部屋から再挑戦",
        key: "E",
        hint: "再挑戦時は3人のHPとメルのMPが全回復します。",
      };
    }
    return null;
  }
}
