import type { GamePhase } from "../game/types";
import { AudioManager, type AudioMixerGraph } from "./AudioManager";
import {
  SFX_LIBRARY,
  type FilterTuning,
  type NoiseLayerTuning,
  type SfxCue,
  type ToneLayerTuning,
} from "./sfxConfig";

export interface PlaySfxOptions {
  pan?: number;
  variant?: number;
}

interface ActiveVoice {
  cue: SfxCue;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  remainingSources: number;
  cleanupTimer: number | null;
}

function clampPan(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

export class SfxSynthesizer {
  private readonly active = new Set<ActiveVoice>();
  private readonly activeByCue = new Map<SfxCue, Set<ActiveVoice>>();
  private readonly lastStarted = new Map<SfxCue, number>();
  private noiseBuffer: AudioBuffer | null = null;
  private phase: GamePhase | null = null;
  private destroyed = false;
  private pendingUnlock = false;
  private lastPlayedCue: SfxCue | null = null;

  public constructor(
    private readonly audio: AudioManager,
    private readonly documentTarget: Document = document,
  ) {
    documentTarget.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  public get debugState(): {
    activeVoices: number;
    activeSources: number;
    lastCue: SfxCue | null;
  } {
    let activeSources = 0;
    for (const voice of this.active) activeSources += voice.remainingSources;
    return {
      activeVoices: this.active.size,
      activeSources,
      lastCue: this.lastPlayedCue,
    };
  }

  public play(cue: SfxCue, options: PlaySfxOptions = {}): boolean {
    if (this.destroyed || this.phase === "paused" || this.phase === "gameover") {
      return false;
    }
    const graph = this.audio.sfxGraph;
    if (!graph) {
      if (!this.pendingUnlock) {
        this.pendingUnlock = true;
        void this.audio.enableFromGesture().then((ready) => {
          this.pendingUnlock = false;
          if (ready && !this.destroyed) this.play(cue, options);
        });
      }
      return false;
    }
    if (graph.context.state === "closed") return false;
    return this.startVoice(graph, cue, options);
  }

  public syncGamePhase(nextPhase: GamePhase): void {
    if (nextPhase === this.phase) return;
    this.phase = nextPhase;
    if (
      nextPhase === "paused" ||
      nextPhase === "gameover" ||
      nextPhase === "intro"
    ) {
      this.stopAll();
    }
  }

  public stopAll(): void {
    for (const voice of [...this.active]) {
      for (const source of voice.sources) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          // A source may already have ended between collection and stop().
        }
      }
      this.cleanupVoice(voice);
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopAll();
    this.documentTarget.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.noiseBuffer = null;
    this.lastStarted.clear();
    this.activeByCue.clear();
  }

  private startVoice(
    graph: AudioMixerGraph,
    cue: SfxCue,
    options: PlaySfxOptions,
  ): boolean {
    const definition = SFX_LIBRARY[cue];
    const now = graph.context.currentTime;
    const last = this.lastStarted.get(cue) ?? -Infinity;
    if (now - last < definition.minInterval) return false;
    const cueVoices = this.activeByCue.get(cue);
    if ((cueVoices?.size ?? 0) >= definition.maxVoices) return false;

    const pitchJitter =
      definition.pitchJitter === 0
        ? 1
        : 1 + (Math.random() * 2 - 1) * definition.pitchJitter;
    const variant = options.variant ?? 0;
    const variantPitch = variant === 0 ? 1 : 1 + Math.min(variant, 4) * 0.018;
    const variantPan = variant % 2 === 1 ? 0.1 : -0.05;
    const worldPan = clampPan(options.pan ?? 0);
    const voice: ActiveVoice = {
      cue,
      sources: [],
      nodes: [],
      remainingSources: definition.tones.length + definition.noises.length,
      cleanupTimer: null,
    };
    if (voice.remainingSources === 0) return false;

    const destination = graph[definition.bus];
    const voiceGain = graph.context.createGain();
    voiceGain.gain.value = definition.gain;
    voiceGain.connect(destination);
    voice.nodes.push(voiceGain);

    for (const layer of definition.tones) {
      this.scheduleTone(
        graph.context,
        voice,
        voiceGain,
        layer,
        pitchJitter * variantPitch,
        clampPan(worldPan + variantPan),
      );
    }
    for (const layer of definition.noises) {
      this.scheduleNoise(
        graph.context,
        voice,
        voiceGain,
        layer,
        clampPan(worldPan + variantPan),
      );
    }

    this.active.add(voice);
    const voices = cueVoices ?? new Set<ActiveVoice>();
    voices.add(voice);
    this.activeByCue.set(cue, voices);
    this.lastStarted.set(cue, now);
    this.lastPlayedCue = cue;
    const lifetime = Math.max(
      ...definition.tones.map(
        (layer) =>
          layer.delay +
          layer.duration +
          (layer.echo ? layer.echo * 2 + 0.02 : 0.01),
      ),
      ...definition.noises.map(
        (layer) =>
          layer.delay +
          layer.duration +
          (layer.echo ? layer.echo * 2 + 0.02 : 0.01),
      ),
    );
    voice.cleanupTimer = globalThis.setTimeout(() => {
      for (const source of voice.sources) {
        try {
          source.stop();
        } catch {
          // Already-ended sources are expected here.
        }
      }
      this.cleanupVoice(voice);
    }, (lifetime + 0.12) * 1000);
    return true;
  }

  private scheduleTone(
    context: AudioContext,
    voice: ActiveVoice,
    destination: AudioNode,
    tuning: ToneLayerTuning,
    pitch: number,
    panOffset: number,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = tuning.wave;
    const start = context.currentTime + tuning.delay;
    const end = start + tuning.duration;
    oscillator.frequency.setValueAtTime(tuning.startHz * pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, (tuning.endHz ?? tuning.startHz) * pitch),
      end,
    );
    const tail = this.connectEnvelope(
      context,
      voice,
      oscillator,
      destination,
      tuning.gain,
      start,
      end,
      tuning.attack ?? 0.008,
      clampPan((tuning.pan ?? 0) + panOffset),
      tuning.filter,
      tuning.echo,
    );
    this.trackSource(voice, oscillator);
    oscillator.start(start);
    oscillator.stop(end + tail);
  }

  private scheduleNoise(
    context: AudioContext,
    voice: ActiveVoice,
    destination: AudioNode,
    tuning: NoiseLayerTuning,
    panOffset: number,
  ): void {
    const source = context.createBufferSource();
    source.buffer = this.getNoiseBuffer(context);
    const start = context.currentTime + tuning.delay;
    const end = start + tuning.duration;
    const tail = this.connectEnvelope(
      context,
      voice,
      source,
      destination,
      tuning.gain,
      start,
      end,
      tuning.attack ?? 0.006,
      clampPan((tuning.pan ?? 0) + panOffset),
      tuning.filter,
      tuning.echo,
    );
    this.trackSource(voice, source);
    source.start(start);
    source.stop(end + tail);
  }

  private connectEnvelope(
    context: AudioContext,
    voice: ActiveVoice,
    source: AudioNode,
    destination: AudioNode,
    level: number,
    start: number,
    end: number,
    attack: number,
    pan: number,
    filterTuning?: FilterTuning,
    echoSeconds?: number,
  ): number {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, level),
      Math.min(end, start + attack),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    voice.nodes.push(envelope);
    source.connect(envelope);

    let current: AudioNode = envelope;
    if (filterTuning) {
      const filter = context.createBiquadFilter();
      filter.type = filterTuning.type;
      filter.Q.value = filterTuning.q ?? 0.7;
      filter.frequency.setValueAtTime(filterTuning.startHz, start);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, filterTuning.endHz ?? filterTuning.startHz),
        end,
      );
      current.connect(filter);
      current = filter;
      voice.nodes.push(filter);
    }

    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    current.connect(panner);
    panner.connect(destination);
    voice.nodes.push(panner);

    if (echoSeconds && echoSeconds > 0) {
      const delay = context.createDelay(0.25);
      const echoGain = context.createGain();
      delay.delayTime.value = echoSeconds;
      echoGain.gain.value = 0.22;
      current.connect(delay);
      delay.connect(echoGain);
      echoGain.connect(destination);
      voice.nodes.push(delay, echoGain);
      return echoSeconds * 2 + 0.02;
    }
    return 0.01;
  }

  private trackSource(
    voice: ActiveVoice,
    source: AudioScheduledSourceNode,
  ): void {
    voice.sources.push(source);
    source.onended = () => {
      voice.remainingSources -= 1;
      if (voice.remainingSources <= 0) this.cleanupVoice(voice);
    };
  }

  private cleanupVoice(voice: ActiveVoice): void {
    if (!this.active.delete(voice)) return;
    if (voice.cleanupTimer !== null) {
      globalThis.clearTimeout(voice.cleanupTimer);
      voice.cleanupTimer = null;
    }
    const cueVoices = this.activeByCue.get(voice.cue);
    cueVoices?.delete(voice);
    if (cueVoices?.size === 0) this.activeByCue.delete(voice.cue);
    for (const source of voice.sources) {
      source.onended = null;
      try {
        source.disconnect();
      } catch {
        // Already disconnected nodes are harmless.
      }
    }
    for (const node of voice.nodes) {
      try {
        node.disconnect();
      } catch {
        // Already disconnected nodes are harmless.
      }
    }
    voice.sources.length = 0;
    voice.nodes.length = 0;
    voice.remainingSources = 0;
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.32 + white * 0.68;
      samples[index] = previous;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.documentTarget.visibilityState === "hidden") this.stopAll();
  };
}
