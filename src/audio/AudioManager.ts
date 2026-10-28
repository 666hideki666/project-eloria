import { AUDIO } from "../config";
import type { GamePhase } from "../game/types";
import type { MusicTrackId } from "./musicTracks";

const MUSIC_VOLUME_KEY = "project-eloria.audio.music-volume";
const MUSIC_MUTED_KEY = "project-eloria.audio.music-muted";
const SFX_VOLUME_KEY = "project-eloria.audio.sfx-volume";
const SFX_MUTED_KEY = "project-eloria.audio.sfx-muted";

type AnimationFrameRequest = (callback: FrameRequestCallback) => number;
type AnimationFrameCancel = (handle: number) => void;

export type SfxBusName = "character" | "impact" | "ui";

export interface AudioMixerGraph {
  context: AudioContext;
  character: GainNode;
  impact: GainNode;
  ui: GainNode;
}

export interface AudioManagerState {
  musicTrack: MusicTrackId;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  sfxMuted: boolean;
  unlocked: boolean;
  awaitingGesture: boolean;
  playing: boolean;
  crossfading: boolean;
  activeMusicPlayers: number;
  loop: boolean;
  musicDuckGain: number;
  currentTime: number;
  duration: number;
  audioContextState: AudioContextState | "unavailable";
  errorMessage: string | null;
}

export interface AudioManagerOptions {
  musicUrl: string;
  musicTracks?: Partial<Record<MusicTrackId, string>>;
  initialMusicTrack?: MusicTrackId;
  audioElement?: HTMLAudioElement;
  audioElementFactory?: () => HTMLAudioElement;
  windowTarget?: Window;
  documentTarget?: Document;
  storage?: Storage | null;
  requestFrame?: AnimationFrameRequest;
  cancelFrame?: AnimationFrameCancel;
  now?: () => number;
  audioContextFactory?: (() => AudioContext) | null;
}

interface PlayMusicOptions {
  fadeIn?: number;
  restart?: boolean;
}

interface StopMusicOptions {
  fadeOut?: number;
  reset?: boolean;
}

export interface SetMusicTrackOptions {
  fadeOut?: number;
  fadeIn?: number;
  restart?: boolean;
}

export interface MusicDuckOptions {
  target?: number;
  delay?: number;
  attack?: number;
  hold?: number;
  release?: number;
}

interface MusicDeck {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  track: MusicTrackId | null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function defaultRequestFrame(callback: FrameRequestCallback): number {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(
    () => callback(performance.now()),
    16,
  ) as unknown as number;
}

function defaultCancelFrame(handle: number): void {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(handle);
    return;
  }
  globalThis.clearTimeout(handle);
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function defaultAudioContextFactory(): AudioContext | null {
  if (typeof globalThis.AudioContext !== "function") return null;
  return new globalThis.AudioContext();
}

/**
 * Owns the project's single audio context and mixer. BGM playback, synthesized
 * SFX and browser-unlock handling all pass through this one lifetime.
 */
export class AudioManager {
  private audio: HTMLAudioElement;
  private readonly audioElementFactory: () => HTMLAudioElement;
  private standby: MusicDeck | null = null;
  private outgoing: { deck: MusicDeck; gain: number } | null = null;
  private crossfadeFrame: number | null = null;
  private crossfadeVersion = 0;
  private crossfadeReady = false;
  private readonly windowTarget: Window;
  private readonly documentTarget: Document;
  private readonly storage: Storage | null;
  private readonly requestFrame: AnimationFrameRequest;
  private readonly cancelFrame: AnimationFrameCancel;
  private readonly now: () => number;
  private readonly audioContextFactory: (() => AudioContext) | null;
  private readonly musicTracks: Partial<Record<MusicTrackId, string>>;
  private readonly listeners = new Set<(state: AudioManagerState) => void>();
  private musicVolume: number = AUDIO.initialMusicVolume;
  private sfxVolume: number = AUDIO.initialSfxVolume;
  private muted = false;
  private sfxMuted = false;
  private unlocked = false;
  private musicNeedsGestureRetry = false;
  private currentMusicTrack: MusicTrackId;
  private desiredPlaying = false;
  private pausedByGame = false;
  private wasPlayingBeforeHidden = false;
  private playbackInFlight = false;
  private activationPromise: Promise<boolean> | null = null;
  private fadeGain = 0;
  private fallbackDuckGain = 1;
  private duckDisplayGain = 1;
  private duckResetTimer: number | null = null;
  private fadeFrame: number | null = null;
  private phase: GamePhase | null = null;
  private errorMessage: string | null = null;
  private context: AudioContext | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private bgmGainNode: GainNode | null = null;
  private bgmDuckNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private characterGainNode: GainNode | null = null;
  private impactGainNode: GainNode | null = null;
  private uiGainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private destroyed = false;

  public constructor(options: AudioManagerOptions) {
    this.windowTarget = options.windowTarget ?? window;
    this.documentTarget = options.documentTarget ?? document;
    this.storage = options.storage === undefined ? safeStorage() : options.storage;
    this.requestFrame = options.requestFrame ?? defaultRequestFrame;
    this.cancelFrame = options.cancelFrame ?? defaultCancelFrame;
    this.now = options.now ?? (() => performance.now());
    this.audioContextFactory =
      options.audioContextFactory === undefined
        ? () => {
            const context = defaultAudioContextFactory();
            if (!context) throw new Error("Web Audio API is unavailable");
            return context;
          }
        : options.audioContextFactory;
    this.audio = options.audioElement ?? new Audio();
    this.audioElementFactory = options.audioElementFactory ?? (() => new Audio());
    this.musicTracks = {
      battle: options.musicUrl,
      ...options.musicTracks,
    };
    this.currentMusicTrack = options.initialMusicTrack ?? "battle";
    this.audio.src =
      this.musicTracks[this.currentMusicTrack] ?? options.musicUrl;
    this.audio.preload = "auto";
    this.audio.loop = true;
    this.restoreSettings();
    this.audio.muted = this.muted;
    this.applyMixerVolumes();

    this.windowTarget.addEventListener("keydown", this.handleUserGesture, true);
    this.windowTarget.addEventListener("pointerdown", this.handleUserGesture, true);
    this.documentTarget.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.audio.addEventListener("error", this.handleMediaError);
  }

  public get state(): AudioManagerState {
    return {
      musicTrack: this.currentMusicTrack,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
      sfxMuted: this.sfxMuted,
      unlocked: this.unlocked,
      awaitingGesture: !this.unlocked || this.musicNeedsGestureRetry,
      playing:
        this.desiredPlaying &&
        !this.audio.paused &&
        !this.pausedByGame &&
        this.documentTarget.visibilityState !== "hidden",
      crossfading: this.outgoing !== null,
      activeMusicPlayers: Number(!this.audio.paused) + Number(Boolean(this.outgoing && !this.outgoing.deck.audio.paused)),
      loop: this.audio.loop,
      musicDuckGain: this.duckDisplayGain,
      currentTime: Number.isFinite(this.audio.currentTime)
        ? this.audio.currentTime
        : 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      audioContextState: this.context?.state ?? "unavailable",
      errorMessage: this.errorMessage,
    };
  }

  public get sfxGraph(): AudioMixerGraph | null {
    if (
      !this.context ||
      !this.characterGainNode ||
      !this.impactGainNode ||
      !this.uiGainNode
    ) {
      return null;
    }
    return {
      context: this.context,
      character: this.characterGainNode,
      impact: this.impactGainNode,
      ui: this.uiGainNode,
    };
  }

  public subscribe(listener: (state: AudioManagerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public syncGamePhase(nextPhase: GamePhase): void {
    if (nextPhase === this.phase) return;
    const previousPhase = this.phase;
    this.phase = nextPhase;

    if (nextPhase === "intro") {
      this.cancelMusicDuck();
      this.stopMusic({ fadeOut: 0, reset: true });
      return;
    }
    if (nextPhase === "paused") {
      this.cancelMusicDuck();
      this.pauseMusic();
      return;
    }
    if (nextPhase === "gameover") {
      this.cancelMusicDuck();
      this.stopMusic({
        fadeOut: AUDIO.gameOverFadeOut,
        reset: true,
      });
      return;
    }
    if (nextPhase === "cleared") {
      return;
    }

    this.playMusic({
      fadeIn:
        previousPhase === "paused"
          ? AUDIO.pauseResumeFadeIn
          : AUDIO.battleFadeIn,
      restart: (previousPhase === "intro" || previousPhase === "gameover") && !this.desiredPlaying,
    });
  }

  /**
   * Reuses the current slot for ordinary in-game track changes. Opening music
   * uses crossfadeMusicTo; both paths share mute, volume, pause, tab visibility
   * and the same Web Audio mixer.
   */
  public setMusicTrack(
    track: MusicTrackId,
    options: SetMusicTrackOptions = {},
  ): boolean {
    const nextUrl = this.musicTracks[track];
    if (this.destroyed || !nextUrl || track === this.currentMusicTrack) {
      return false;
    }
    this.cancelCrossfade();
    this.currentMusicTrack = track;
    this.cancelMusicDuck();

    const applyTrack = (): void => {
      if (this.destroyed) return;
      this.cancelFade();
      this.audio.pause();
      this.audio.src = nextUrl;
      this.audio.load();
      if (options.restart ?? true) this.setCurrentTimeSafely(0);
      this.fadeGain = 0;
      this.applyMixerVolumes();
      if (
        this.desiredPlaying &&
        !this.pausedByGame &&
        this.unlocked &&
        this.documentTarget.visibilityState !== "hidden"
      ) {
        this.resumePlayback(options.fadeIn ?? AUDIO.battleFadeIn);
      }
      this.emit();
    };

    const fadeOut = Math.max(0, options.fadeOut ?? 0.35);
    if (this.audio.paused || fadeOut <= 0) {
      applyTrack();
    } else {
      this.startFade(0, fadeOut, applyTrack);
    }
    this.emit();
    return true;
  }

  public playMusic(options: PlayMusicOptions = {}): void {
    if (this.destroyed) return;
    this.desiredPlaying = true;
    this.pausedByGame = false;
    if (this.outgoing) { this.emit(); return; }
    if (options.restart) this.setCurrentTimeSafely(0);
    if (
      !this.unlocked ||
      this.documentTarget.visibilityState === "hidden" ||
      this.activationPromise
    ) {
      this.emit();
      return;
    }
    this.resumePlayback(options.fadeIn ?? 0);
  }

  public stopMusic(options: StopMusicOptions = {}): void {
    if (this.destroyed) return;
    this.cancelCrossfade();
    this.desiredPlaying = false;
    this.pausedByGame = false;
    const reset = options.reset ?? false;
    const fadeOut = options.fadeOut ?? 0;
    if (this.audio.paused || fadeOut <= 0) {
      this.cancelFade();
      this.fadeGain = 0;
      this.applyMixerVolumes();
      this.audio.pause();
      if (reset) this.setCurrentTimeSafely(0);
      this.emit();
      return;
    }
    this.startFade(0, fadeOut, () => {
      this.audio.pause();
      if (reset) this.setCurrentTimeSafely(0);
      this.emit();
    });
  }

  public pauseMusic(): void {
    if (this.destroyed) return;
    this.cancelCrossfade();
    this.pausedByGame = true;
    this.cancelFade();
    this.audio.pause();
    this.emit();
  }

  public setMusicVolume(value: number): void {
    this.musicVolume = clamp01(Number.isFinite(value) ? value : 0);
    this.persist(MUSIC_VOLUME_KEY, String(this.musicVolume));
    this.applyMixerVolumes();
    this.emit();
  }

  public setSfxVolume(value: number): void {
    this.sfxVolume = clamp01(Number.isFinite(value) ? value : 0);
    this.persist(SFX_VOLUME_KEY, String(this.sfxVolume));
    this.applyMixerVolumes();
    this.emit();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.audio.muted = muted;
    this.persist(MUSIC_MUTED_KEY, String(muted));
    this.applyMixerVolumes();
    this.emit();
  }

  public toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  public setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.persist(SFX_MUTED_KEY, String(muted));
    this.applyMixerVolumes();
    this.emit();
  }

  public toggleSfxMuted(): void {
    this.setSfxMuted(!this.sfxMuted);
  }

  /**
   * Called by the one shared gesture listener and by the debug soundboard.
   * Repeated calls after unlock are no-ops and never restart the BGM.
   */
  public enableFromGesture(): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false);
    if (this.unlocked && !this.musicNeedsGestureRetry) {
      return Promise.resolve(true);
    }
    if (this.activationPromise) return this.activationPromise;

    this.activationPromise = this.activateFromGesture().finally(() => {
      this.activationPromise = null;
      this.emit();
    });
    return this.activationPromise;
  }

  /** Attempts the same single-player activation; browser policy may require a later gesture. */
  public tryAutoplay(): Promise<boolean> {
    this.playMusic({ fadeIn: 0.6 });
    return this.enableFromGesture();
  }

  /** Prepares the second reusable slot; START can prime it silently in its gesture. */
  public preloadMusicTrack(track: MusicTrackId, primeFromGesture = false): void {
    if (this.destroyed || this.outgoing || track === this.currentMusicTrack || !this.musicTracks[track]) return;
    const deck = this.getStandby();
    this.loadDeck(deck, track);
    if (!primeFromGesture) return;
    deck.audio.volume = 0;
    if (deck.gain) deck.gain.gain.value = 0;
    try {
      void Promise.resolve(deck.audio.play()).then(() => {
        this.pauseUnusedAudio(deck.audio);
      }).catch(() => { this.pauseUnusedAudio(deck.audio); });
    } catch { this.pauseUnusedAudio(deck.audio); }
  }

  /** Bounded two-slot crossfade. Repeated requests reuse, reverse or replace these slots. */
  public crossfadeMusicTo(track: MusicTrackId, duration = 1): boolean {
    if (this.destroyed || !this.musicTracks[track] || track === this.currentMusicTrack) return false;
    this.cancelFade();
    if (this.crossfadeFrame !== null) this.cancelFrame(this.crossfadeFrame);
    this.crossfadeFrame = null;
    const version = ++this.crossfadeVersion;
    const current: MusicDeck = { audio: this.audio, source: this.mediaSource, gain: this.bgmGainNode, track: this.currentMusicTrack };
    const previous = this.outgoing;
    let incoming: MusicDeck;
    let incomingGain = 0;
    if (previous?.deck.track === track) {
      incoming = previous.deck;
      incomingGain = previous.gain;
      this.outgoing = { deck: current, gain: this.fadeGain };
    } else if (previous && previous.gain > this.fadeGain) {
      incoming = current;
      this.outgoing = previous;
    } else {
      incoming = previous?.deck ?? this.getStandby();
      this.outgoing = { deck: current, gain: this.fadeGain };
    }
    this.standby = null;
    this.audio.removeEventListener("error", this.handleMediaError);
    this.loadDeck(incoming, track);
    this.audio = incoming.audio;
    this.mediaSource = incoming.source;
    this.bgmGainNode = incoming.gain;
    this.currentMusicTrack = track;
    this.audio.addEventListener("error", this.handleMediaError);
    this.fadeGain = incomingGain;
    this.crossfadeReady = !this.audio.paused && this.audio.readyState >= 3;
    this.desiredPlaying = true;
    this.pausedByGame = false;
    this.playbackInFlight = false;
    this.errorMessage = null;
    this.cancelMusicDuck();
    this.attachMusicToMixer();
    this.applyMixerVolumes();
    const oldGain = this.outgoing.gain;
    const startedAt = this.now();
    const seconds = Math.max(0, duration);
    const tick = (time: number): void => {
      if (version !== this.crossfadeVersion || !this.outgoing) return;
      const progress = seconds === 0 ? 1 : clamp01((time - startedAt) / (seconds * 1000));
      this.fadeGain = this.crossfadeReady ? incomingGain + (1 - incomingGain) * progress : 0;
      this.outgoing.gain = oldGain * (1 - progress);
      this.applyMixerVolumes();
      if (progress >= 1) {
        this.crossfadeFrame = null;
        this.releaseOutgoing();
        this.emit();
      } else this.crossfadeFrame = this.requestFrame(tick);
    };
    this.crossfadeFrame = this.requestFrame(tick);
    if (this.documentTarget.visibilityState !== "hidden") {
      try {
        void Promise.resolve(this.audio.play()).then(() => {
          if (version !== this.crossfadeVersion || this.destroyed) {
            this.pauseUnusedAudio(incoming.audio);
            return;
          }
          if (!this.desiredPlaying || this.documentTarget.visibilityState === "hidden") { incoming.audio.pause(); return; }
          this.crossfadeReady = true;
          this.musicNeedsGestureRetry = false;
          this.errorMessage = null;
          this.attachMusicToMixer();
          if (!this.outgoing) this.startFade(1, .35);
          this.emit();
        }).catch(() => {
          if (version !== this.crossfadeVersion || this.destroyed) {
            this.pauseUnusedAudio(incoming.audio);
            return;
          }
          incoming.audio.pause();
          this.crossfadeReady = false;
          this.fadeGain = 0;
          this.applyMixerVolumes();
          this.musicNeedsGestureRetry = true;
          this.errorMessage = "BGMを開始できませんでした。もう一度操作すると再試行します。";
          this.emit();
        });
      } catch {
        incoming.audio.pause();
        this.crossfadeReady = false;
        this.fadeGain = 0;
        this.applyMixerVolumes();
        this.musicNeedsGestureRetry = true;
        this.emit();
      }
    }
    this.emit();
    return true;
  }

  private getStandby(): MusicDeck {
    if (!this.standby) {
      const audio = this.audioElementFactory();
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0;
      this.standby = { audio, source: null, gain: null, track: null };
    }
    return this.standby;
  }

  private pauseUnusedAudio(audio: HTMLAudioElement): void {
    if (this.destroyed || (this.audio !== audio && this.outgoing?.deck.audio !== audio) ||
        (this.audio === audio && (!this.desiredPlaying || this.pausedByGame || this.documentTarget.visibilityState === "hidden"))) {
      audio.pause();
    }
  }

  private loadDeck(deck: MusicDeck, track: MusicTrackId): void {
    if (deck.track === track) return;
    deck.audio.pause();
    deck.audio.volume = 0;
    if (deck.gain) deck.gain.gain.value = 0;
    deck.audio.src = this.musicTracks[track]!;
    deck.audio.load();
    deck.track = track;
  }

  private releaseOutgoing(): void {
    if (!this.outgoing) return;
    const deck = this.outgoing.deck;
    deck.audio.pause();
    deck.audio.volume = 0;
    if (deck.gain) deck.gain.gain.value = 0;
    deck.audio.removeAttribute("src");
    deck.audio.load();
    deck.track = null;
    this.standby = deck;
    this.outgoing = null;
  }

  private cancelCrossfade(): void {
    this.crossfadeVersion += 1;
    if (this.crossfadeFrame !== null) this.cancelFrame(this.crossfadeFrame);
    this.crossfadeFrame = null;
    this.releaseOutgoing();
  }

  /**
   * Temporarily lowers only the BGM bus. New requests replace the previous
   * automation from its current value, so overlapping ultimates always recover.
   */
  public duckMusic(options: MusicDuckOptions = {}): void {
    const target = clamp01(options.target ?? 0.8);
    const delay = Math.max(0, options.delay ?? 0.08);
    const attack = Math.max(0.01, options.attack ?? 0.14);
    const hold = Math.max(0, options.hold ?? 0.18);
    const release = Math.max(0.05, options.release ?? 0.8);
    if (this.duckResetTimer !== null) {
      globalThis.clearTimeout(this.duckResetTimer);
    }
    this.duckDisplayGain = target;
    this.duckResetTimer = globalThis.setTimeout(() => {
      this.duckResetTimer = null;
      this.duckDisplayGain = 1;
      this.fallbackDuckGain = 1;
      this.applyMixerVolumes();
      if (!this.destroyed) this.emit();
    }, (delay + attack + hold + release) * 1000);
    if (!this.bgmDuckNode || !this.context) {
      this.fallbackDuckGain = target;
      this.applyMixerVolumes();
      this.emit();
      return;
    }

    const parameter = this.bgmDuckNode.gain;
    const now = this.context.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === "function") {
      parameter.cancelAndHoldAtTime(now);
    } else {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
    }
    parameter.linearRampToValueAtTime(target, now + delay + attack);
    parameter.setValueAtTime(target, now + delay + attack + hold);
    parameter.linearRampToValueAtTime(
      1,
      now + delay + attack + hold + release,
    );
    this.emit();
  }

  public cancelMusicDuck(): void {
    if (this.duckResetTimer !== null) {
      globalThis.clearTimeout(this.duckResetTimer);
      this.duckResetTimer = null;
    }
    this.duckDisplayGain = 1;
    this.fallbackDuckGain = 1;
    if (this.bgmDuckNode && this.context) {
      const now = this.context.currentTime;
      this.bgmDuckNode.gain.cancelScheduledValues(now);
      this.bgmDuckNode.gain.setValueAtTime(1, now);
    }
    this.applyMixerVolumes();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelCrossfade();
    if (this.standby) {
      this.standby.audio.pause();
      this.standby.audio.removeAttribute("src");
      this.standby.audio.load();
      this.standby.source?.disconnect();
      this.standby.gain?.disconnect();
    }
    this.cancelFade();
    this.cancelMusicDuck();
    this.windowTarget.removeEventListener("keydown", this.handleUserGesture, true);
    this.windowTarget.removeEventListener(
      "pointerdown",
      this.handleUserGesture,
      true,
    );
    this.documentTarget.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.audio.removeEventListener("error", this.handleMediaError);
    this.audio.pause();
    this.mediaSource?.disconnect();
    this.bgmGainNode?.disconnect();
    this.bgmDuckNode?.disconnect();
    this.characterGainNode?.disconnect();
    this.impactGainNode?.disconnect();
    this.uiGainNode?.disconnect();
    this.sfxGainNode?.disconnect();
    this.compressor?.disconnect();
    if (this.context && this.context.state !== "closed") {
      void this.context.close().catch(() => {});
    }
    this.audio.removeAttribute("src");
    this.audio.load();
    this.listeners.clear();
  }

  private readonly handleUserGesture = (): void => {
    if (
      this.destroyed ||
      (this.unlocked && !this.musicNeedsGestureRetry) ||
      this.activationPromise
    ) {
      return;
    }
    void this.enableFromGesture();
  };

  private async activateFromGesture(): Promise<boolean> {
    const activationAudio = this.audio;
    const alreadyPlaying = !this.audio.paused && (this.desiredPlaying || this.fadeFrame !== null);
    if (!alreadyPlaying) {
      this.cancelFade();
      this.fadeGain = 0;
      this.applyMixerVolumes();
    }

    const context = this.ensureMixer();
    // Both calls must begin synchronously inside the gesture handler. Waiting
    // for resume() before play() can consume Safari/Chromium's activation token.
    const resumeResult =
      context?.state === "suspended"
        ? context.resume().then(() => true).catch(() => false)
        : Promise.resolve(context?.state === "running");
    void resumeResult.then((ready) => {
      if (!ready || this.destroyed) return;
      this.unlocked = true;
      this.emit();
    });
    let playResult: Promise<boolean>;
    try {
      playResult = Promise.resolve(this.audio.play())
        .then(() => true)
        .catch(() => false);
    } catch {
      playResult = Promise.resolve(false);
    }

    // HTML media can settle even on an output device that leaves resume()
    // pending; the next gesture can safely retry the context in that case.
    const musicReady = await playResult;
    if (this.destroyed) return false;
    const contextReady = context?.state === "running";
    if (this.audio !== activationAudio) {
      this.unlocked = this.context ? Boolean(contextReady) : musicReady;
      if (this.outgoing?.deck.audio !== activationAudio) activationAudio.pause();
      return this.unlocked;
    }
    if (contextReady) this.attachMusicToMixer();
    this.unlocked = this.context ? Boolean(contextReady) : musicReady;
    this.musicNeedsGestureRetry = !musicReady;

    if (musicReady) {
      this.errorMessage = null;
      if (this.outgoing && this.desiredPlaying) {
        this.crossfadeReady = true;
      } else if (alreadyPlaying && !this.audio.paused && !this.pausedByGame &&
          this.documentTarget.visibilityState !== "hidden") {
        // A gesture can unlock Web Audio while permitted HTML media is already
        // audible. Preserve that gain and any START fade scheduled meanwhile.
      } else if (
        this.desiredPlaying &&
        !this.pausedByGame &&
        this.documentTarget.visibilityState !== "hidden"
      ) {
        this.startFade(1, AUDIO.battleFadeIn);
      } else {
        this.audio.pause();
        this.setCurrentTimeSafely(0);
      }
    } else {
      this.errorMessage =
        "BGMを開始できませんでした。もう一度クリックまたはキー操作をしてください。";
      this.audio.pause();
    }
    return this.unlocked;
  }

  private ensureMixer(): AudioContext | null {
    if (this.context) return this.context;
    if (!this.audioContextFactory) return null;

    let context: AudioContext;
    try {
      context = this.audioContextFactory();
    } catch {
      return null;
    }
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.18;
    compressor.connect(context.destination);

    const bgmGain = context.createGain();
    const bgmDuck = context.createGain();
    const sfxGain = context.createGain();
    const character = context.createGain();
    const impact = context.createGain();
    const ui = context.createGain();
    bgmGain.connect(bgmDuck);
    bgmDuck.connect(compressor);
    character.connect(sfxGain);
    impact.connect(sfxGain);
    ui.connect(sfxGain);
    sfxGain.connect(compressor);

    this.context = context;
    this.compressor = compressor;
    this.bgmGainNode = bgmGain;
    this.bgmDuckNode = bgmDuck;
    this.sfxGainNode = sfxGain;
    this.characterGainNode = character;
    this.impactGainNode = impact;
    this.uiGainNode = ui;
    this.applyMixerVolumes();
    return context;
  }

  private attachMusicToMixer(): void {
    if (
      this.mediaSource ||
      !this.context ||
      this.context.state !== "running"
    ) {
      return;
    }
    if (!this.bgmGainNode) {
      this.bgmGainNode = this.context.createGain();
      this.bgmGainNode.connect(this.bgmDuckNode!);
    }
    try {
      const mediaSource = this.context.createMediaElementSource(this.audio);
      mediaSource.connect(this.bgmGainNode);
      this.mediaSource = mediaSource;
      this.audio.volume = 1;
      this.audio.muted = false;
      this.applyMixerVolumes();
    } catch {
      // If a browser has already associated this element with another context,
      // keep HTMLAudioElement playback as the safe BGM fallback.
    }
  }

  private resumePlayback(fadeIn: number): void {
    if (this.playbackInFlight) return;
    const requestedAudio = this.audio;
    const requestedTrack = this.currentMusicTrack;
    const version = this.crossfadeVersion;
    const afterPlay = (): void => {
      if (this.audio !== requestedAudio || this.currentMusicTrack !== requestedTrack || version !== this.crossfadeVersion) return;
      if (!this.desiredPlaying || this.pausedByGame) {
        this.audio.pause();
        this.emit();
        return;
      }
      this.errorMessage = null;
      this.musicNeedsGestureRetry = false;
      this.startFade(1, fadeIn);
      this.emit();
    };

    if (!this.audio.paused) {
      afterPlay();
      return;
    }

    this.playbackInFlight = true;
    try {
      const playResult = this.audio.play();
      void Promise.resolve(playResult)
        .then(() => {
          if (!this.destroyed) afterPlay();
        })
        .catch(() => {
          if (this.destroyed || this.audio !== requestedAudio || version !== this.crossfadeVersion) return;
          this.musicNeedsGestureRetry = true;
          this.errorMessage =
            "BGMの再開が拒否されました。もう一度操作すると再試行します。";
          this.emit();
        })
        .finally(() => {
          this.playbackInFlight = false;
        });
    } catch {
      this.playbackInFlight = false;
      this.musicNeedsGestureRetry = true;
      this.errorMessage =
        "BGMの再開が拒否されました。もう一度操作すると再試行します。";
      this.emit();
    }
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.documentTarget.visibilityState === "hidden") {
      this.wasPlayingBeforeHidden =
        this.desiredPlaying && (!this.audio.paused || Boolean(this.outgoing && !this.outgoing.deck.audio.paused)) && !this.pausedByGame;
      if (this.outgoing) {
        this.cancelCrossfade();
        this.fadeGain = 0;
        this.applyMixerVolumes();
      }
      this.cancelFade();
      this.audio.pause();
      if (this.context?.state === "running") {
        void this.context.suspend().catch(() => {});
      }
      this.emit();
      return;
    }

    const shouldResume =
      this.wasPlayingBeforeHidden &&
      this.desiredPlaying &&
      !this.pausedByGame;
    this.wasPlayingBeforeHidden = false;
    if (this.context?.state === "suspended" && this.unlocked) {
      void this.context.resume().catch(() => {});
    }
    if (shouldResume && this.unlocked) {
      this.resumePlayback(AUDIO.pauseResumeFadeIn);
    } else {
      this.emit();
    }
  };

  private readonly handleMediaError = (): void => {
    this.errorMessage =
      "BGMを読み込めませんでした。音源ファイルとログを確認してください。";
    this.emit();
  };

  private startFade(
    target: number,
    durationSeconds: number,
    onComplete?: () => void,
  ): void {
    this.cancelFade();
    const destination = clamp01(target);
    if (durationSeconds <= 0) {
      this.fadeGain = destination;
      this.applyMixerVolumes();
      onComplete?.();
      return;
    }

    const source = this.fadeGain;
    const startedAt = this.now();
    const durationMs = durationSeconds * 1000;
    const tick = (time: number): void => {
      const progress = clamp01((time - startedAt) / durationMs);
      this.fadeGain = source + (destination - source) * progress;
      this.applyMixerVolumes();
      if (progress >= 1) {
        this.fadeFrame = null;
        onComplete?.();
        return;
      }
      this.fadeFrame = this.requestFrame(tick);
    };
    this.fadeFrame = this.requestFrame(tick);
  }

  private cancelFade(): void {
    if (this.fadeFrame === null) return;
    this.cancelFrame(this.fadeFrame);
    this.fadeFrame = null;
  }

  private applyMixerVolumes(): void {
    const musicGain = this.muted ? 0 : this.musicVolume * this.fadeGain;
    const sfxGain = this.sfxMuted ? 0 : this.sfxVolume;
    this.audio.muted = this.muted;
    if (this.bgmGainNode && this.mediaSource) {
      this.audio.volume = 1;
      this.bgmGainNode.gain.value = clamp01(musicGain);
    } else {
      this.audio.volume = clamp01(musicGain * this.fallbackDuckGain);
      this.audio.muted = this.muted;
    }
    if (this.outgoing) {
      const gain = this.muted ? 0 : this.musicVolume * this.outgoing.gain;
      const deck = this.outgoing.deck;
      deck.audio.muted = this.muted;
      if (deck.source && deck.gain) {
        deck.audio.volume = 1;
        deck.gain.gain.value = clamp01(gain);
      }
      else {
        deck.audio.volume = clamp01(gain * this.fallbackDuckGain);
        deck.audio.muted = this.muted;
      }
    }
    if (this.sfxGainNode) this.sfxGainNode.gain.value = clamp01(sfxGain);
  }

  private restoreSettings(): void {
    if (!this.storage) return;
    try {
      const storedMusicVolume = this.storage.getItem(MUSIC_VOLUME_KEY);
      if (storedMusicVolume !== null) {
        const savedVolume = Number(storedMusicVolume);
        if (
          Number.isFinite(savedVolume) &&
          savedVolume >= 0 &&
          savedVolume <= 1
        ) {
          this.musicVolume = savedVolume;
        }
      }
      const storedSfxVolume = this.storage.getItem(SFX_VOLUME_KEY);
      if (storedSfxVolume !== null) {
        const savedVolume = Number(storedSfxVolume);
        if (
          Number.isFinite(savedVolume) &&
          savedVolume >= 0 &&
          savedVolume <= 1
        ) {
          this.sfxVolume = savedVolume;
        }
      }
      this.muted = this.storage.getItem(MUSIC_MUTED_KEY) === "true";
      this.sfxMuted = this.storage.getItem(SFX_MUTED_KEY) === "true";
    } catch {
      // Storage is optional; private browsing and security settings may reject it.
    }
  }

  private persist(key: string, value: string): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, value);
    } catch {
      // Audio must remain usable even when persistence is unavailable.
    }
  }

  private setCurrentTimeSafely(value: number): void {
    try {
      this.audio.currentTime = value;
    } catch {
      // Some browsers reject seeking before metadata is available.
    }
  }

  private emit(): void {
    const state = this.state;
    for (const listener of this.listeners) listener(state);
  }
}
