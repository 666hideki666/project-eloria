import {
  AudioManager,
  type AudioManagerState,
} from "../audio/AudioManager";
import { SfxSynthesizer } from "../audio/SfxSynthesizer";
import {
  SFX_CUE,
  SFX_CUE_ORDER,
  SFX_LIBRARY,
  type SfxCue,
} from "../audio/sfxConfig";

interface SoundboardElements {
  root: HTMLElement;
  controls: HTMLElement;
  buttons: HTMLElement;
  status: HTMLElement;
  collapse: HTMLButtonElement;
}

export class SfxSoundboard {
  private readonly unsubscribe: () => void;
  private readonly timers = new Set<number>();
  private readonly statusTimer: number;
  private collapsed = false;

  public constructor(
    private readonly elements: SoundboardElements,
    private readonly audio: AudioManager,
    private readonly synth: SfxSynthesizer,
  ) {
    this.buildControls();
    this.buildCueButtons();
    elements.root.hidden = false;
    elements.root.addEventListener("click", this.handleClick);
    elements.root.addEventListener("input", this.handleInput);
    elements.collapse.addEventListener("click", this.handleCollapse);
    this.unsubscribe = audio.subscribe(this.renderAudioState);
    this.statusTimer = window.setInterval(this.renderStatus, 150);
  }

  public destroy(): void {
    this.elements.root.removeEventListener("click", this.handleClick);
    this.elements.root.removeEventListener("input", this.handleInput);
    this.elements.collapse.removeEventListener("click", this.handleCollapse);
    this.unsubscribe();
    window.clearInterval(this.statusTimer);
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
  }

  private buildControls(): void {
    this.elements.controls.innerHTML = `
      <label>BGM <output data-value="music"></output>
        <input data-volume="music" type="range" min="0" max="1" step="0.05">
      </label>
      <button type="button" data-mute="music"></button>
      <label>SFX <output data-value="sfx"></output>
        <input data-volume="sfx" type="range" min="0" max="1" step="0.05">
      </label>
      <button type="button" data-mute="sfx"></button>
    `;
  }

  private buildCueButtons(): void {
    const sections = ["カイル", "ナディ", "メル", "共通"] as const;
    for (const section of sections) {
      const group = document.createElement("section");
      const heading = document.createElement("h3");
      heading.textContent = section;
      group.append(heading);
      for (const cue of SFX_CUE_ORDER) {
        const definition = SFX_LIBRARY[cue];
        if (definition.section !== section) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.sfxCue = cue;
        button.textContent = definition.label;
        group.append(button);
      }
      this.elements.buttons.append(group);
    }

    const checks = document.createElement("section");
    checks.innerHTML = "<h3>負荷・揺らぎ確認</h3>";
    const impactBurst = document.createElement("button");
    impactBurst.type = "button";
    impactBurst.dataset.sfxCheck = "impact";
    impactBurst.textContent = "通常命中 6同時";
    const normalRepeat = document.createElement("button");
    normalRepeat.type = "button";
    normalRepeat.dataset.sfxCheck = "jitter";
    normalRepeat.textContent = "連刃剣 4連打";
    checks.append(impactBurst, normalRepeat);
    this.elements.buttons.append(checks);
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const cueButton = target.closest<HTMLButtonElement>("[data-sfx-cue]");
    if (cueButton?.dataset.sfxCue) {
      this.playAfterUnlock(cueButton.dataset.sfxCue as SfxCue);
      return;
    }
    const muteButton = target.closest<HTMLButtonElement>("[data-mute]");
    if (muteButton?.dataset.mute === "music") {
      this.audio.toggleMuted();
      return;
    }
    if (muteButton?.dataset.mute === "sfx") {
      this.audio.toggleSfxMuted();
      return;
    }
    const checkButton = target.closest<HTMLButtonElement>("[data-sfx-check]");
    if (checkButton?.dataset.sfxCheck === "impact") {
      void this.audio.enableFromGesture();
      for (let index = 0; index < 6; index += 1) {
        this.synth.play(SFX_CUE.hitNormal, {
          pan: -0.5 + index * 0.2,
        });
      }
      return;
    }
    if (checkButton?.dataset.sfxCheck === "jitter") {
      void this.audio.enableFromGesture();
      for (let index = 0; index < 4; index += 1) {
        const timer = window.setTimeout(() => {
          this.timers.delete(timer);
          this.synth.play(SFX_CUE.kyleNormal, { variant: index });
        }, index * 170);
        this.timers.add(timer);
      }
    }
  };

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.volume === "music") {
      this.audio.setMusicVolume(Number(target.value));
    } else if (target.dataset.volume === "sfx") {
      this.audio.setSfxVolume(Number(target.value));
    }
  };

  private readonly handleCollapse = (): void => {
    this.collapsed = !this.collapsed;
    this.elements.root.dataset.collapsed = String(this.collapsed);
    this.elements.collapse.textContent = this.collapsed ? "開く" : "閉じる";
  };

  private playAfterUnlock(cue: SfxCue): void {
    void this.audio.enableFromGesture();
    this.synth.play(cue);
  }

  private readonly renderAudioState = (state: AudioManagerState): void => {
    const musicInput =
      this.elements.controls.querySelector<HTMLInputElement>(
        '[data-volume="music"]',
      );
    const sfxInput =
      this.elements.controls.querySelector<HTMLInputElement>(
        '[data-volume="sfx"]',
      );
    const musicValue =
      this.elements.controls.querySelector<HTMLOutputElement>(
        '[data-value="music"]',
      );
    const sfxValue =
      this.elements.controls.querySelector<HTMLOutputElement>(
        '[data-value="sfx"]',
      );
    const musicMute =
      this.elements.controls.querySelector<HTMLButtonElement>(
        '[data-mute="music"]',
      );
    const sfxMute =
      this.elements.controls.querySelector<HTMLButtonElement>(
        '[data-mute="sfx"]',
      );
    if (musicInput) musicInput.value = String(state.musicVolume);
    if (sfxInput) sfxInput.value = String(state.sfxVolume);
    if (musicValue) musicValue.value = `${Math.round(state.musicVolume * 100)}%`;
    if (sfxValue) sfxValue.value = `${Math.round(state.sfxVolume * 100)}%`;
    if (musicMute) musicMute.textContent = state.muted ? "BGM 解除" : "BGM ミュート";
    if (sfxMute) sfxMute.textContent = state.sfxMuted ? "SFX 解除" : "SFX ミュート";
  };

  private readonly renderStatus = (): void => {
    const state = this.audio.state;
    const synth = this.synth.debugState;
    this.elements.status.textContent =
      `Context: ${state.audioContextState} / ` +
      `Voices: ${synth.activeVoices} / ` +
      `Sources: ${synth.activeSources} / ` +
      `Last: ${synth.lastCue ?? "—"}`;
  };
}
