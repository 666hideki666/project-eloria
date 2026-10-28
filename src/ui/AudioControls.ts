import {
  AudioManager,
  type AudioManagerState,
} from "../audio/AudioManager";
import { MUSIC_TRACKS } from "../audio/musicTracks";

interface AudioControlElements {
  toggle: HTMLButtonElement;
  pauseSettings: HTMLElement;
  track: HTMLElement;
  pauseMusicMute: HTMLButtonElement;
  musicVolume: HTMLInputElement;
  musicVolumeValue: HTMLOutputElement;
  pauseSfxMute: HTMLButtonElement;
  sfxVolume: HTMLInputElement;
  sfxVolumeValue: HTMLOutputElement;
  unlockHint: HTMLElement;
}

export class AudioControls {
  private readonly unsubscribe: () => void;

  public constructor(
    private readonly elements: AudioControlElements,
    private readonly audio: AudioManager,
    private readonly keyboardTarget: Window,
  ) {
    elements.toggle.addEventListener("click", this.handleMusicToggle);
    elements.pauseMusicMute.addEventListener("click", this.handleMusicToggle);
    elements.musicVolume.addEventListener("input", this.handleMusicVolume);
    elements.pauseSfxMute.addEventListener("click", this.handleSfxToggle);
    elements.sfxVolume.addEventListener("input", this.handleSfxVolume);
    keyboardTarget.addEventListener("keydown", this.handleKeyDown);
    this.unsubscribe = audio.subscribe(this.render);
  }

  public setPauseSettingsVisible(visible: boolean): void {
    this.elements.pauseSettings.hidden = !visible;
  }

  public destroy(): void {
    this.elements.toggle.removeEventListener("click", this.handleMusicToggle);
    this.elements.pauseMusicMute.removeEventListener(
      "click",
      this.handleMusicToggle,
    );
    this.elements.musicVolume.removeEventListener(
      "input",
      this.handleMusicVolume,
    );
    this.elements.pauseSfxMute.removeEventListener(
      "click",
      this.handleSfxToggle,
    );
    this.elements.sfxVolume.removeEventListener("input", this.handleSfxVolume);
    this.keyboardTarget.removeEventListener("keydown", this.handleKeyDown);
    this.unsubscribe();
  }

  private readonly handleMusicToggle = (): void => {
    this.audio.toggleMuted();
  };

  private readonly handleMusicVolume = (): void => {
    this.audio.setMusicVolume(Number(this.elements.musicVolume.value));
  };

  private readonly handleSfxToggle = (): void => {
    this.audio.toggleSfxMuted();
  };

  private readonly handleSfxVolume = (): void => {
    this.audio.setSfxVolume(Number(this.elements.sfxVolume.value));
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "KeyM" || event.repeat) return;
    event.preventDefault();
    this.audio.toggleMuted();
  };

  private readonly render = (state: AudioManagerState): void => {
    const label = state.muted ? "BGMのミュートを解除" : "BGMをミュート";
    this.elements.toggle.dataset.muted = String(state.muted);
    this.elements.toggle.dataset.playing = String(state.playing);
    this.elements.toggle.setAttribute("aria-label", `${label}（M）`);
    this.elements.toggle.setAttribute("aria-pressed", String(state.muted));
    this.elements.pauseMusicMute.setAttribute(
      "aria-pressed",
      String(state.muted),
    );
    this.elements.pauseMusicMute.textContent = state.muted
      ? "🔇 BGMミュート解除"
      : "🔊 BGMミュート";
    this.elements.musicVolume.value = String(state.musicVolume);
    this.elements.musicVolumeValue.value =
      `${Math.round(state.musicVolume * 100)}%`;
    this.elements.track.textContent =
      `BGM「${MUSIC_TRACKS[state.musicTrack].name}」`;

    this.elements.pauseSfxMute.setAttribute(
      "aria-pressed",
      String(state.sfxMuted),
    );
    this.elements.pauseSfxMute.textContent = state.sfxMuted
      ? "🔇 SFXミュート解除"
      : "🔊 SFXミュート";
    this.elements.sfxVolume.value = String(state.sfxVolume);
    this.elements.sfxVolumeValue.value =
      `${Math.round(state.sfxVolume * 100)}%`;

    if (!state.awaitingGesture) {
      this.elements.unlockHint.hidden = true;
      return;
    }
    this.elements.unlockHint.hidden = false;
    this.elements.unlockHint.textContent =
      state.errorMessage ??
      "最初のクリックまたはキー操作でBGM・効果音が有効になります";
  };
}
