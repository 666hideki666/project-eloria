import titleArt from "../../assets/concepts/title/project-eloria-title-key-art-v2.png?url";
import titleLogo from "../../assets/concepts/title/eloria-title-logo-transparent-v4.png?url";
import anomalyArt from "../../assets/concepts/prologue/eloria-prologue-village-anomaly-v1.png?url";
import conversationArt from "../../assets/concepts/prologue/eloria-prologue-village-conversation-v1.png?url";
import departureArt from "../../assets/concepts/prologue/eloria-prologue-forest-departure-v1.png?url";
import villageRootsArt from "../../assets/concepts/prologue/eloria-prologue-village-roots-nadi-v1.png?url";
import mapShardArt from "../../assets/concepts/prologue/eloria-prologue-map-shard-clue-v1.png?url";
import villageFarewellArt from "../../assets/concepts/prologue/eloria-prologue-village-farewell-v1.png?url";
import { OpeningSequence, PROLOGUE_SCENES } from "./openingSequence";
import { OpeningTransition, OPENING_TRANSITION } from "./openingTransition";
import "./opening.css";
import type { AudioManager, AudioManagerState } from "../audio/AudioManager";

const SCENE_ART: Record<(typeof PROLOGUE_SCENES)[number]["id"], string> = {
  anomaly: anomalyArt,
  "village-roots-nadi": villageRootsArt,
  conversation: conversationArt,
  "map-shard-clue": mapShardArt,
  "village-farewell": villageFarewellArt,
  departure: departureArt,
};
const ADVANCE_KEYS = new Set(["Enter", "Space", "KeyE"]);

interface OpeningOptions {
  root: HTMLElement;
  game: HTMLElement;
  audio: AudioManager;
  onComplete: () => void;
  onDevWarp?: (onSelected: () => void, onCancel: () => void) => void;
}

export class OpeningController {
  private readonly sequence = new OpeningSequence();
  private readonly transition = new OpeningTransition();
  private readonly motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly heldCodes = new Set<string>();
  private readonly title: HTMLElement;
  private readonly prologue: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly musicButton: HTMLButtonElement;
  private readonly advanceButton: HTMLButtonElement;
  private readonly skipButton: HTMLButtonElement;
  private readonly backButton: HTMLButtonElement;
  private readonly fullscreenButton: HTMLButtonElement;
  private readonly fullscreenHint: HTMLElement;
  private readonly text: HTMLElement;
  private readonly textSize: HTMLElement;
  private readonly advanceLabel: HTMLElement;
  private readonly liveText: HTMLElement;
  private readonly sceneLabel: HTMLElement;
  private readonly fade: HTMLElement;
  private readonly images: HTMLImageElement[];
  private scene = -1;
  private announcedScene = -1;
  private devOpen = false;
  private destroyed = false;
  private lastActionAt = -Infinity;
  private readonly standalone = window.matchMedia("(display-mode: standalone)");
  private homeScreenHintOpen = true;
  private prologueMusicStarted = false;
  private readonly removers: (() => void)[] = [];

  public constructor(private readonly options: OpeningOptions) {
    const { root } = options;
    root.innerHTML = `
      <div class="opening-title">
        <img class="title-art" alt="" src="${titleArt}" fetchpriority="high">
        <h1 class="sr-only">ELORIA</h1>
        <img class="title-logo" alt="" src="${titleLogo}" fetchpriority="high">
        <button class="title-start" type="button"><strong>START</strong><span>冒険を始める</span></button>
        <button class="title-music opening-small" type="button" aria-pressed="true">♪ 音楽ON・操作で再生</button>
      </div>
      <div class="opening-prologue" hidden>
        <div class="prologue-artwork" aria-hidden="true"></div>
        <div class="prologue-atmosphere" aria-hidden="true"></div>
        <span class="prologue-scene-label"></span>
        <button class="prologue-back opening-small" type="button">タイトルへ戻る</button>
        <button class="prologue-skip opening-small" type="button">スキップ</button>
        <div class="prologue-caption">
          <div class="prologue-copy" aria-hidden="true">
            <p class="prologue-size"></p>
            <p class="prologue-text"></p>
          </div>
          <p class="prologue-live sr-only" aria-live="polite" aria-atomic="true"></p>
          <button class="prologue-advance" type="button"><span>次へ</span><b aria-hidden="true">▸</b></button>
          <small>タップ / Enter / E / Space</small>
        </div>
      </div>
      <button class="title-fullscreen opening-small" type="button">⛶ 全画面</button>
      <span id="title-fullscreen-hint" class="title-fullscreen-hint" role="status"></span>
      <div class="opening-fade" aria-hidden="true"></div>`;
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    this.title = get(".opening-title");
    this.prologue = get(".opening-prologue");
    this.startButton = get(".title-start");
    this.musicButton = get(".title-music");
    this.advanceButton = get(".prologue-advance");
    this.skipButton = get(".prologue-skip");
    this.backButton = get(".prologue-back");
    this.fullscreenButton = get(".title-fullscreen");
    this.fullscreenHint = get(".title-fullscreen-hint");
    this.text = get(".prologue-text");
    this.textSize = get(".prologue-size");
    this.advanceLabel = get(".prologue-advance span");
    this.liveText = get(".prologue-live");
    this.sceneLabel = get(".prologue-scene-label");
    this.fade = get(".opening-fade");
    this.images = PROLOGUE_SCENES.map((scene, index) => {
      const image = new Image();
      image.className = "prologue-art";
      image.alt = "";
      image.src = SCENE_ART[scene.id];
      image.dataset.scene = scene.id;
      image.addEventListener("load", () => {
        if (this.scene === index) this.showSceneImage(index);
      });
      image.addEventListener("error", () => { image.hidden = true; });
      get(".prologue-artwork").append(image);
      return image;
    });
    get(".prologue-artwork").style.backgroundImage = `url("${titleArt}")`;
    if (options.onDevWarp) {
      const dev = document.createElement("button");
      dev.type = "button";
      dev.className = "title-dev opening-small";
      dev.textContent = "DEV WARP";
      this.title.append(dev);
      dev.addEventListener("click", () => {
        if (this.sequence.phase !== "title" || this.devOpen) return;
        if (this.transition.active) return;
        this.stopTitleMusic();
        this.devOpen = true;
        options.onDevWarp?.(() => this.closeForDevelopment(), () => {
          this.devOpen = false;
          this.playTitleMusic();
          dev.focus();
        });
      });
    }
    this.listen(this.startButton, "click", () => this.start());
    this.listen(this.musicButton, "click", () => this.toggleTitleMusic());
    this.listen(this.skipButton, "click", () => {
      if (this.sequence.phase !== "prologue") return;
      this.transition.reset();
      this.sequence.skip();
      this.options.audio.crossfadeMusicTo("ancientForest", 1);
      this.render();
    });
    this.listen(this.backButton, "click", () => this.reset());
    this.listen(this.advanceButton, "click", (event) => {
      if ((event as MouseEvent).detail < 2) this.advance();
    });
    this.listen(this.prologue, "click", (event) => {
      if (!(event.target as Element).closest("button") && (event as MouseEvent).detail < 2) this.advance();
    });
    this.listen(this.fullscreenButton, "click", () => { void this.toggleFullscreen(); });
    this.listen(document, "fullscreenchange", () => this.syncFullscreen());
    this.listen(this.standalone, "change", () => this.syncFullscreen());
    this.listen(window, "pageshow", () => this.syncFullscreen());
    this.listen(document, "fullscreenerror", () => this.fullscreenError());
    this.listen(document, "visibilitychange", () => {
      root.classList.toggle("is-suspended", document.hidden);
    });
    this.listen(document.body, "animationend", (event) => {
      if ((event as AnimationEvent).animationName === "opening-reveal") {
        document.body.classList.remove("opening-reveal");
      }
    });
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("blur", this.onBlur);
    this.options.game.inert = true;
    this.options.game.setAttribute("aria-hidden", "true");
    root.hidden = false;
    this.removers.push(options.audio.subscribe(this.syncTitleMusic));
    this.syncFullscreen();
    this.render();
    this.startButton.focus();
    this.playTitleMusic();
  }

  public get blocking(): boolean { return this.sequence.phase !== "done" && !this.destroyed; }

  public update(delta: number): void {
    if (!this.blocking || document.hidden) return;
    if (this.transition.active) {
      this.transition.update(delta, this.motion.matches);
      if (this.transition.musicBlendReady && !this.prologueMusicStarted) {
        this.prologueMusicStarted = true;
        this.options.audio.crossfadeMusicTo("prologue", OPENING_TRANSITION.musicFade - OPENING_TRANSITION.titleDarken);
      }
      if (this.transition.sceneVisible && this.sequence.phase === "title") {
        this.sequence.start(this.transition.complete && this.motion.matches);
      }
      if (this.transition.complete) {
        this.sequence.update(0, this.motion.matches);
        this.lastActionAt = performance.now();
      }
      this.render();
      if (this.transition.complete) this.advanceButton.focus();
      return;
    }
    if (this.sequence.update(delta, this.motion.matches)) {
      document.body.classList.add("opening-reveal");
      this.close();
      this.options.onComplete();
      return;
    }
    this.render();
  }

  public destroy(): void {
    this.stopTitleMusic();
    this.destroyed = true;
    document.body.classList.remove("opening-reveal");
    for (const remove of this.removers) remove();
    window.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("keyup", this.onKeyUp, true);
    window.removeEventListener("blur", this.onBlur);
    this.close();
    this.options.root.replaceChildren();
  }

  private start(): void {
    if (this.devOpen || this.sequence.phase !== "title" || !this.transition.start(this.motion.matches)) return;
    this.prologueMusicStarted = false;
    this.options.audio.stopMusic({ fadeOut: OPENING_TRANSITION.musicFade, reset: true });
    this.options.audio.preloadMusicTrack("prologue", true);
    this.lastActionAt = performance.now();
    this.render();
  }

  private advance(): void {
    if (this.transition.active) return;
    const now = performance.now();
    if (now - this.lastActionAt < 180) return;
    this.lastActionAt = now;
    this.sequence.advance(now, this.motion.matches);
    if (this.sequence.phase === "leaving") this.options.audio.crossfadeMusicTo("ancientForest", 1);
    this.render();
  }

  private reset(): void {
    this.transition.reset();
    this.prologueMusicStarted = false;
    this.sequence.reset();
    this.scene = -1;
    this.announcedScene = -1;
    this.liveText.textContent = "";
    this.render();
    this.startButton.focus();
    this.playTitleMusic();
  }

  private closeForDevelopment(): void {
    this.stopTitleMusic();
    this.devOpen = false;
    this.sequence.phase = "done";
    this.close();
  }

  private close(): void {
    this.options.root.hidden = true;
    this.options.game.inert = false;
    this.options.game.removeAttribute("aria-hidden");
    delete document.body.dataset.opening;
  }

  private render(): void {
    const s = this.sequence;
    this.options.root.dataset.phase = s.phase;
    this.options.root.dataset.transition = this.transition.phase;
    if (this.transition.active) {
      this.fade.style.transition = "none";
      this.fade.style.opacity = String(this.transition.opacity);
    } else if (s.phase === "title") {
      this.fade.style.transition = "none";
      this.fade.style.opacity = "0";
    } else {
      this.fade.style.removeProperty("opacity");
      this.fade.style.removeProperty("transition");
    }
    document.body.dataset.opening = s.phase;
    this.title.hidden = s.phase !== "title";
    this.prologue.hidden = s.phase === "title";
    this.startButton.disabled = this.transition.active;
    this.musicButton.disabled = this.transition.active || this.devOpen;
    // Keep skip/back available if artwork fails; a text-first scene still works.
    this.skipButton.disabled = s.phase === "leaving";
    this.backButton.disabled = s.phase === "leaving";
    this.advanceButton.disabled = this.transition.active || s.phase === "leaving";
    if (s.phase === "title") return;
    if (this.scene !== s.sceneIndex) {
      this.scene = s.sceneIndex;
      this.showSceneImage(this.scene);
      this.options.root.dataset.scene = PROLOGUE_SCENES[this.scene]!.id;
      this.sceneLabel.textContent = `序章  ${String(this.scene + 1).padStart(2, "0")} / ${String(PROLOGUE_SCENES.length).padStart(2, "0")}`;
      this.textSize.textContent = s.fullText;
    }
    if (!this.transition.active && s.phase === "prologue" && this.announcedScene !== s.sceneIndex) {
      this.announcedScene = s.sceneIndex;
      this.liveText.textContent = s.scene.narration.join(" ");
    }
    this.options.root.dataset.fullyVisible = String(s.fullyVisible);
    if (this.text.textContent !== s.text) this.text.textContent = s.text;
    const label = s.fullyVisible ? "次へ" : "全文を表示";
    if (this.advanceLabel.textContent !== label) this.advanceLabel.textContent = label;
  }

  private playTitleMusic(): void {
    const audio = this.options.audio;
    if (audio.state.playing && audio.state.musicTrack !== "title") audio.crossfadeMusicTo("title", .6);
    else audio.setMusicTrack("title", { fadeOut: 0, fadeIn: 0.6 });
    // Browser rejection is temporary; keep the request for the shared gesture
    // listener. Only an explicit user mute changes the persisted preference.
    void audio.tryAutoplay();
  }

  private stopTitleMusic(): void {
    this.options.audio.stopMusic({ fadeOut: 0, reset: true });
  }

  private toggleTitleMusic(): void {
    if (this.sequence.phase !== "title" || this.transition.active || this.devOpen) return;
    const audio = this.options.audio;
    // The pointerdown capture listener may already have started playback. Toggle
    // the user's preference, never that transient playback state.
    audio.setMuted(!audio.state.muted);
    if (!audio.state.muted) {
      audio.playMusic({ fadeIn: .6 });
      void audio.enableFromGesture();
    }
  }

  private readonly syncTitleMusic = (state: AudioManagerState): void => {
    this.musicButton.textContent = state.muted ? "♪ 音楽OFF" :
      state.playing ? "♪ 音楽ON・止める" : "♪ 音楽ON・操作で再生";
    this.musicButton.setAttribute("aria-pressed", String(!state.muted));
    this.musicButton.dataset.playback = state.muted ? "off" : state.playing ? "playing" : "waiting";
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.blocking) {
      if (this.heldCodes.has(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); }
      return;
    }
    if (this.devOpen) return;
    if (event.code === "Tab") return; // Native focus navigation among opening controls.
    this.heldCodes.add(event.code);
    // M keeps the existing global mute control usable, without world input.
    if (event.code === "KeyM") return;
    event.stopImmediatePropagation();
    const button = (event.target as Element | null)?.closest("button");
    if (button && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      if (!event.repeat) (button as HTMLButtonElement).click();
      return;
    }
    event.preventDefault();
    if (event.repeat || !ADVANCE_KEYS.has(event.code)) return;
    if (this.sequence.phase === "title") this.start();
    else this.advance();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.devOpen) return;
    const held = this.heldCodes.delete(event.code);
    if (!this.blocking && !held) return;
    if (event.code === "Tab" || event.code === "KeyM") return;
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  private readonly onBlur = (): void => { this.heldCodes.clear(); };

  private showSceneImage(index: number): void {
    const target = this.images[index];
    if (!target?.complete || !target.naturalWidth) return;
    this.images.forEach((image, imageIndex) => {
      image.classList.toggle("is-current", imageIndex === index);
      if (imageIndex === index) {
        image.style.animation = "none";
        void image.offsetWidth;
        image.style.animation = "";
      }
    });
  }

  private isStandalone(): boolean {
    return this.standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  private fullscreenAvailable(): boolean {
    return typeof document.documentElement.requestFullscreen === "function" &&
      typeof document.exitFullscreen === "function" && document.fullscreenEnabled !== false;
  }

  private needsHomeScreenHelp(): boolean {
    return /iPhone|iPod/i.test(navigator.userAgent) && !this.fullscreenAvailable() && !this.isStandalone();
  }

  private syncFullscreen(): void {
    const standalone = this.isStandalone();
    const available = this.fullscreenAvailable();
    const homeScreenHelp = this.needsHomeScreenHelp();
    this.fullscreenButton.hidden = standalone;
    this.fullscreenButton.disabled = !available && !homeScreenHelp;
    this.fullscreenButton.textContent = homeScreenHelp ? "ホーム画面で遊ぶ" :
      !available ? "全画面は非対応" : document.fullscreenElement ? "⛶ 全画面を終了" : "⛶ 全画面";
    this.fullscreenButton.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
    this.fullscreenButton.setAttribute("aria-describedby", "title-fullscreen-hint");
    if (homeScreenHelp) this.fullscreenButton.setAttribute("aria-expanded", String(this.homeScreenHintOpen));
    else this.fullscreenButton.removeAttribute("aria-expanded");
    this.fullscreenHint.textContent = standalone ? "" : homeScreenHelp ? this.homeScreenHintOpen ?
      "共有 → ホーム画面に追加 → 追加したアイコンから起動。タブ内では全画面にできません。" : "" :
      available ? "" : "通常表示で遊べます";
  }

  private fullscreenError(): void {
    this.syncFullscreen();
    if (!this.needsHomeScreenHelp() && !this.isStandalone()) {
      this.fullscreenHint.textContent = "全画面に切り替えられませんでした。通常表示で遊べます。";
    }
  }

  private async toggleFullscreen(): Promise<void> {
    if (this.isStandalone()) return;
    if (this.needsHomeScreenHelp()) {
      this.homeScreenHintOpen = !this.homeScreenHintOpen;
      this.syncFullscreen();
      return;
    }
    if (!this.fullscreenAvailable()) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      this.syncFullscreen();
    } catch { this.fullscreenError(); }
  }

  private listen(target: EventTarget, type: string, callback: EventListener): void {
    target.addEventListener(type, callback);
    this.removers.push(() => target.removeEventListener(type, callback));
  }
}
