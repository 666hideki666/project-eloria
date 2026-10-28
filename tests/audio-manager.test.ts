import { describe, expect, it } from "vitest";
import { AUDIO } from "../src/config";
import { AudioManager } from "../src/audio/AudioManager";

class FakeAudio extends EventTarget {
  public src = "";
  public preload = "";
  public loop = false;
  public muted = false;
  public volume = 1;
  public paused = true;
  public readyState = 4;
  public currentTime = 0;
  public duration = 189.44;
  public playCalls = 0;
  public pauseCalls = 0;
  public loadCalls = 0;
  public rejectNextPlay = false;

  public async play(): Promise<void> {
    this.playCalls += 1;
    if (this.rejectNextPlay) {
      this.rejectNextPlay = false;
      this.paused = true;
      throw new Error("Autoplay blocked");
    }
    this.paused = false;
  }

  public pause(): void {
    this.pauseCalls += 1;
    this.paused = true;
  }

  public load(): void {
    this.loadCalls += 1;
  }

  public removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class VisibilityTarget extends EventTarget {
  public visibilityState: DocumentVisibilityState = "visible";
}

function createManager(storage: Storage = new MemoryStorage()): {
  manager: AudioManager;
  audio: FakeAudio;
  gestures: EventTarget;
  visibility: VisibilityTarget;
} {
  const audio = new FakeAudio();
  const gestures = new EventTarget();
  const visibility = new VisibilityTarget();
  const manager = new AudioManager({
    musicUrl: "/battle.mp3",
    musicTracks: { title: "/title.mp3", ancientForest: "/forest.mp3" },
    audioElement: audio as unknown as HTMLAudioElement,
    windowTarget: gestures as unknown as Window,
    documentTarget: visibility as unknown as Document,
    storage,
    requestFrame: () => 1,
    cancelFrame: () => {},
  });
  return { manager, audio, gestures, visibility };
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function createCrossfadeManager() {
  const elements = [new FakeAudio()];
  const gestures = new EventTarget();
  const visibility = new VisibilityTarget();
  let now = 0;
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const manager = new AudioManager({
    musicUrl: "/battle.mp3",
    musicTracks: { title: "/title.mp3", prologue: "/prologue.mp3", ancientForest: "/forest.mp3" },
    initialMusicTrack: "title",
    audioElement: elements[0] as unknown as HTMLAudioElement,
    audioElementFactory: () => {
      const audio = new FakeAudio(); elements.push(audio);
      return audio as unknown as HTMLAudioElement;
    },
    windowTarget: gestures as unknown as Window,
    documentTarget: visibility as unknown as Document,
    storage: null, audioContextFactory: null,
    now: () => now,
    requestFrame: cb => { frames.set(++id, cb); return id; },
    cancelFrame: handle => { frames.delete(handle); },
  });
  const step = async (seconds: number) => {
    now += seconds * 1000;
    const pending = [...frames.values()]; frames.clear();
    for (const callback of pending) callback(now);
    await flushPromises();
  };
  return { manager, elements, gestures, visibility, step };
}

describe("bounded opening music crossfades", () => {
  it("blends title to prologue, keeps six scenes continuous and crosses into forest without restarting", async () => {
    const { manager, elements, step } = createCrossfadeManager();
    manager.syncGamePhase("intro");
    await manager.tryAutoplay(); await step(2);
    const peak = elements[0]!.volume;
    manager.stopMusic({ fadeOut: 1.5, reset: true });
    manager.preloadMusicTrack("prologue", true); await flushPromises();
    expect(elements[1]!.paused).toBe(true);
    expect(elements[1]!.volume).toBe(0);
    await step(1);
    manager.crossfadeMusicTo("prologue", .5); await flushPromises(); await step(.25);
    expect(manager.state.crossfading).toBe(true);
    expect(elements.every(audio => !audio.paused && audio.volume > 0)).toBe(true);
    expect(elements.reduce((sum, audio) => sum + audio.volume, 0)).toBeLessThanOrEqual(peak);
    await step(.25);
    expect(elements[0]!.paused).toBe(true);
    expect(elements[0]!.src).toBe("");
    expect(manager.state.activeMusicPlayers).toBe(1);
    const prologue = elements[1]!;
    prologue.currentTime = 25;
    for (let scene = 0; scene < 6; scene++) manager.syncGamePhase("intro");
    expect(prologue.currentTime).toBe(25);
    expect(prologue.loop).toBe(true);
    manager.crossfadeMusicTo("ancientForest", 1); await flushPromises(); await step(.4);
    elements[0]!.currentTime = .4;
    const before = elements[0]!.volume;
    manager.syncGamePhase("playing");
    expect(elements[0]!.currentTime).toBe(.4);
    expect(elements[0]!.volume).toBe(before);
    await step(.6);
    expect(manager.state.musicTrack).toBe("ancientForest");
    expect(manager.state.crossfading).toBe(false);
    expect(elements.filter(audio => !audio.paused)).toHaveLength(1);
    expect(elements).toHaveLength(2);
    manager.destroy();
    expect(elements.every(audio => audio.paused && audio.src === "")).toBe(true);
  });

  it("reverses an in-progress blend on return without a gain jump or extra element", async () => {
    const { manager, elements, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    manager.crossfadeMusicTo("prologue", 1); await flushPromises(); await step(.3);
    const before = elements.map(audio => audio.volume);
    manager.crossfadeMusicTo("title", .6);
    expect(elements.map(audio => audio.volume)).toEqual(before);
    await flushPromises(); await step(.6);
    expect(manager.state.musicTrack).toBe("title");
    expect(elements).toHaveLength(2);
    expect(elements[1]!.paused).toBe(true);
    expect(elements[1]!.src).toBe("");
    manager.destroy();
  });

  it("bounds repeated replacement and rapid third-track requests to two slots", async () => {
    const { manager, elements, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    for (let cycle = 0; cycle < 5; cycle++) {
      manager.crossfadeMusicTo("prologue", .5); await flushPromises(); await step(.1);
      manager.crossfadeMusicTo("ancientForest", 1); await flushPromises(); await step(.1);
      expect(elements).toHaveLength(2);
      expect(elements.reduce((sum, a) => sum + a.volume, 0)).toBeLessThanOrEqual(manager.state.musicVolume + 1e-9);
      manager.crossfadeMusicTo("title", .6); await flushPromises(); await step(1);
      expect(manager.state.activeMusicPlayers).toBe(1);
    }
    manager.destroy();
  });

  it("shares mute and volume across both sides of a blend", async () => {
    const { manager, elements, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    manager.crossfadeMusicTo("prologue", 1); await flushPromises(); await step(.4);
    manager.setMuted(true);
    expect(elements.every(audio => audio.muted && audio.volume === 0)).toBe(true);
    manager.setMusicVolume(.27); manager.setMuted(false);
    expect(elements.every(audio => !audio.muted)).toBe(true);
    expect(elements.reduce((sum, a) => sum + a.volume, 0)).toBeCloseTo(.27);
    await step(.6); expect(manager.state.musicVolume).toBe(.27);
    manager.destroy();
  });

  it("stops both sides when hidden and resumes only the current target at the same position", async () => {
    const { manager, elements, visibility, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    manager.crossfadeMusicTo("prologue", 1); await flushPromises(); await step(.4);
    elements[1]!.currentTime = 12;
    visibility.visibilityState = "hidden"; visibility.dispatchEvent(new Event("visibilitychange"));
    expect(elements.every(audio => audio.paused)).toBe(true);
    expect(manager.state.crossfading).toBe(false);
    expect(elements[0]!.src).toBe("");
    visibility.visibilityState = "visible"; visibility.dispatchEvent(new Event("visibilitychange"));
    await flushPromises(); await step(1);
    expect(manager.state.musicTrack).toBe("prologue");
    expect(elements[1]!.currentTime).toBe(12);
    expect(manager.state.activeMusicPlayers).toBe(1);
    manager.destroy();
  });

  it("recovers rejected incoming playback on a gesture after the outgoing track is released", async () => {
    const { manager, elements, gestures, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    manager.preloadMusicTrack("prologue"); elements[1]!.rejectNextPlay = true;
    manager.crossfadeMusicTo("prologue", .5); await flushPromises(); await step(.5);
    expect(manager.state.playing).toBe(false);
    expect(manager.state.errorMessage).not.toBeNull();
    expect(elements[0]!.src).toBe("");
    gestures.dispatchEvent(new Event("keydown")); await flushPromises(); await step(1);
    expect(manager.state.playing).toBe(true);
    expect(manager.state.activeMusicPlayers).toBe(1);
    manager.destroy();
  });

  it("cannot leave a late incoming play alive after stop or destroy", async () => {
    for (const destroy of [false, true]) {
      const { manager, elements, step } = createCrossfadeManager();
      await manager.tryAutoplay(); await step(2);
      manager.preloadMusicTrack("prologue"); const incoming = elements[1]!;
      let finish!: () => void;
      incoming.play = () => new Promise<void>(resolve => { finish = () => { incoming.paused = false; resolve(); }; });
      manager.crossfadeMusicTo("prologue", .5);
      if (destroy) manager.destroy(); else manager.stopMusic({ fadeOut: 0 });
      finish(); await flushPromises();
      expect(elements.every(audio => audio.paused)).toBe(true);
      manager.destroy();
    }
  });

  it("pauses retired preparation and incoming slots even when late play calls reject", async () => {
    const { manager, elements, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    manager.preloadMusicTrack("prologue");
    const incoming = elements[1]!;
    const pending: (() => void)[] = [];
    incoming.play = () => new Promise<void>((_resolve, reject) => {
      pending.push(() => { incoming.paused = false; reject(new Error("Late media failure")); });
    });
    manager.preloadMusicTrack("prologue", true);
    manager.crossfadeMusicTo("prologue", .5);
    await step(.5);
    manager.crossfadeMusicTo("ancientForest", 1); await flushPromises(); await step(1);
    for (const reject of pending) reject();
    await flushPromises();
    expect(incoming.paused).toBe(true);
    expect(incoming.src).toBe("");
    expect(manager.state.musicTrack).toBe("ancientForest");
    expect(manager.state.activeMusicPlayers).toBe(1);
    manager.destroy();
  });

  it("keeps a buffering incoming source silent and fades it in after actual playback becomes ready", async () => {
    const { manager, elements, step } = createCrossfadeManager();
    await manager.tryAutoplay(); await step(2);
    manager.preloadMusicTrack("prologue");
    const incoming = elements[1]!;
    incoming.readyState = 0;
    incoming.paused = false; // HTML media can clear paused before it has decoded data.
    let finish!: () => void;
    incoming.play = () => new Promise<void>(resolve => { finish = () => { incoming.readyState = 4; resolve(); }; });
    manager.crossfadeMusicTo("prologue", .5);
    await step(.5);
    expect(incoming.volume).toBe(0);
    finish(); await flushPromises(); await step(.2);
    expect(incoming.volume).toBeGreaterThan(0);
    expect(incoming.volume).toBeLessThan(manager.state.musicVolume);
    await step(.2);
    expect(incoming.volume).toBe(manager.state.musicVolume);
    manager.destroy();
  });
});

describe("AudioManager", () => {
  it("preserves an audible fade-out when a gesture unlocks the mixer during START", async () => {
    const { manager, audio } = createManager();
    manager.playMusic();
    // Model permitted HTML media playing before the shared mixer is unlocked.
    audio.paused = false;
    audio.volume = .4;
    manager.stopMusic({ fadeOut: 1.5, reset: true });
    const pauses = audio.pauseCalls;
    await manager.enableFromGesture();
    expect(audio.paused).toBe(false);
    expect(audio.pauseCalls).toBe(pauses);
    expect(audio.volume).toBe(.4);
    manager.stopMusic({ fadeOut: 0, reset: true });
    expect(audio.paused).toBe(true);
    manager.destroy();
  });

  it("attempts title autoplay, stops for the prologue and selects forest on one player", async () => {
    const { manager, audio } = createManager();
    manager.syncGamePhase("intro");
    manager.setMusicTrack("title", { fadeOut: 0 });
    expect(await manager.tryAutoplay()).toBe(true);
    expect(audio.src).toBe("/title.mp3");
    expect(manager.state.playing).toBe(true);
    expect(manager.state.loop).toBe(true);
    manager.setMusicVolume(.4);
    manager.setMuted(true);
    manager.stopMusic({ fadeOut: 0, reset: true });
    await flushPromises();
    expect(manager.state.playing).toBe(false);
    expect(audio.currentTime).toBe(0);
    manager.setMusicTrack("ancientForest", { fadeOut: 0 });
    manager.syncGamePhase("playing");
    await flushPromises();
    expect(audio.src).toBe("/forest.mp3");
    expect(manager.state.playing).toBe(true);
    expect(manager.state.musicVolume).toBe(.4);
    expect(manager.state.muted).toBe(true);
    manager.destroy();
  });

  it("recovers rejected title autoplay with a later explicit music gesture", async () => {
    const { manager, audio } = createManager();
    audio.rejectNextPlay = true;
    manager.setMusicTrack("title", { fadeOut: 0 });
    expect(await manager.tryAutoplay()).toBe(false);
    manager.stopMusic({ fadeOut: 0 });
    expect(manager.state.awaitingGesture).toBe(true);
    expect(manager.state.playing).toBe(false);
    manager.playMusic();
    await manager.enableFromGesture();
    expect(manager.state.playing).toBe(true);
    expect(audio.playCalls).toBe(2);
    manager.destroy();
  });

  it("cannot resume a delayed title activation after START has stopped it", async () => {
    const { manager, audio } = createManager();
    let finish!: () => void;
    audio.play = () => new Promise<void>(resolve => {
      finish = () => { audio.paused = false; resolve(); };
    });
    manager.setMusicTrack("title", { fadeOut: 0 });
    const pending = manager.tryAutoplay();
    manager.stopMusic({ fadeOut: 0, reset: true });
    finish();
    await pending;
    expect(audio.paused).toBe(true);
    expect(manager.state.playing).toBe(false);
    expect(audio.currentTime).toBe(0);
    manager.destroy();
  });

  it("clears a rejected title retry when the forest track starts successfully", async () => {
    const { manager, audio } = createManager();
    manager.setMusicTrack("title", { fadeOut: 0 });
    await manager.tryAutoplay();
    manager.stopMusic({ fadeOut: 0 });
    audio.rejectNextPlay = true;
    manager.playMusic();
    await flushPromises();
    expect(manager.state.awaitingGesture).toBe(true);
    manager.stopMusic({ fadeOut: 0 });
    manager.setMusicTrack("ancientForest", { fadeOut: 0 });
    manager.playMusic();
    await flushPromises();
    expect(manager.state.playing).toBe(true);
    expect(manager.state.awaitingGesture).toBe(false);
    expect(manager.state.errorMessage).toBeNull();
    manager.destroy();
  });

  it("fades the title down before pausing and resetting the player", async () => {
    const audio = new FakeAudio();
    let time = 0;
    let frame: FrameRequestCallback | undefined;
    const manager = new AudioManager({
      musicUrl: "/title.mp3", initialMusicTrack: "title",
      musicTracks: { title: "/title.mp3" },
      audioElement: audio as unknown as HTMLAudioElement,
      windowTarget: new EventTarget() as unknown as Window,
      documentTarget: new VisibilityTarget() as unknown as Document,
      storage: null, audioContextFactory: null,
      now: () => time,
      requestFrame: cb => { frame = cb; return 1; },
      cancelFrame: () => { frame = undefined; },
    });
    await manager.tryAutoplay();
    time = 1000; frame?.(time);
    const peak = audio.volume;
    expect(peak).toBeGreaterThan(0);
    audio.currentTime = 20;
    manager.stopMusic({ fadeOut: .25, reset: true });
    time += 125; frame?.(time);
    expect(audio.volume).toBeGreaterThan(0);
    expect(audio.volume).toBeLessThan(peak);
    expect(audio.paused).toBe(false);
    time += 125; frame?.(time);
    expect(audio.volume).toBe(0);
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(0);
    manager.destroy();
  });

  it("starts once after a gesture and ignores later combat-key gestures", async () => {
    const { manager, audio, gestures } = createManager();
    manager.playMusic();
    expect(audio.playCalls).toBe(0);

    gestures.dispatchEvent(new Event("keydown"));
    await flushPromises();
    expect(audio.playCalls).toBe(1);
    expect(audio.loop).toBe(true);
    expect(manager.state.playing).toBe(true);

    for (let index = 0; index < 8; index += 1) {
      gestures.dispatchEvent(new Event("keydown"));
    }
    await flushPromises();
    expect(audio.playCalls).toBe(1);
    manager.destroy();
  });

  it("pauses and resumes at the same position, then resets on stop", async () => {
    const { manager, audio, gestures } = createManager();
    manager.playMusic();
    gestures.dispatchEvent(new Event("pointerdown"));
    await flushPromises();
    audio.currentTime = 42;

    manager.pauseMusic();
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(42);

    manager.playMusic({ fadeIn: 0 });
    await flushPromises();
    expect(audio.paused).toBe(false);
    expect(audio.currentTime).toBe(42);

    manager.stopMusic({ fadeOut: 0, reset: true });
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(0);
    manager.destroy();
  });

  it("retries a rejected start only on the next user gesture", async () => {
    const { manager, audio, gestures } = createManager();
    audio.rejectNextPlay = true;
    manager.playMusic();

    gestures.dispatchEvent(new Event("keydown"));
    await flushPromises();
    expect(audio.playCalls).toBe(1);
    expect(manager.state.unlocked).toBe(false);

    await flushPromises();
    expect(audio.playCalls).toBe(1);
    gestures.dispatchEvent(new Event("pointerdown"));
    await flushPromises();
    expect(audio.playCalls).toBe(2);
    expect(manager.state.unlocked).toBe(true);
    manager.destroy();
  });

  it("resumes after visibility returns only when it was playing before hidden", async () => {
    const { manager, audio, gestures, visibility } = createManager();
    manager.playMusic();
    gestures.dispatchEvent(new Event("keydown"));
    await flushPromises();
    audio.currentTime = 64;

    visibility.visibilityState = "hidden";
    visibility.dispatchEvent(new Event("visibilitychange"));
    expect(audio.paused).toBe(true);

    visibility.visibilityState = "visible";
    visibility.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();
    expect(audio.paused).toBe(false);
    expect(audio.currentTime).toBe(64);

    manager.pauseMusic();
    const callsBeforeHiddenPause = audio.playCalls;
    visibility.visibilityState = "hidden";
    visibility.dispatchEvent(new Event("visibilitychange"));
    visibility.visibilityState = "visible";
    visibility.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();
    expect(audio.playCalls).toBe(callsBeforeHiddenPause);
    manager.destroy();
  });

  it("persists BGM and SFX settings as independent channels", () => {
    const storage = new MemoryStorage();
    const first = createManager(storage);
    expect(first.manager.state.musicVolume).toBe(AUDIO.initialMusicVolume);
    first.manager.setMusicVolume(0.65);
    first.manager.setSfxVolume(0.25);
    first.manager.setMuted(true);
    first.manager.setSfxMuted(true);
    first.manager.destroy();

    const second = createManager(storage);
    expect(second.manager.state.musicVolume).toBe(0.65);
    expect(second.manager.state.muted).toBe(true);
    expect(second.manager.state.sfxVolume).toBe(0.25);
    expect(second.manager.state.sfxMuted).toBe(true);
    second.manager.destroy();
  });

  it("keeps BGM and SFX mute switches independent", () => {
    const { manager } = createManager();
    manager.setMuted(true);
    expect(manager.state.muted).toBe(true);
    expect(manager.state.sfxMuted).toBe(false);

    manager.setSfxMuted(true);
    manager.setMuted(false);
    expect(manager.state.muted).toBe(false);
    expect(manager.state.sfxMuted).toBe(true);
    manager.destroy();
  });

  it("changes tracks once while preserving the BGM mixer settings", () => {
    const { manager, audio } = createManager();
    manager.setMusicVolume(0.65);
    manager.setMuted(true);

    expect(manager.state.musicTrack).toBe("battle");
    expect(
      manager.setMusicTrack("exploration", {
        fadeOut: 0,
        fadeIn: 0,
        restart: true,
      }),
    ).toBe(false);

    const tracked = new AudioManager({
      musicUrl: "/battle.mp3",
      musicTracks: {
        battle: "/battle.mp3",
        exploration: "/exploration.mp3",
      },
      audioElement: audio as unknown as HTMLAudioElement,
      windowTarget: new EventTarget() as unknown as Window,
      documentTarget: new VisibilityTarget() as unknown as Document,
      storage: new MemoryStorage(),
      requestFrame: () => 1,
      cancelFrame: () => {},
    });
    tracked.setMusicVolume(0.65);
    tracked.setMuted(true);
    expect(tracked.setMusicTrack("exploration", { fadeOut: 0, fadeIn: 0 })).toBe(true);
    expect(tracked.state.musicTrack).toBe("exploration");
    expect(audio.src).toBe("/exploration.mp3");
    expect(audio.loadCalls).toBe(1);
    expect(tracked.state.musicVolume).toBe(0.65);
    expect(tracked.state.muted).toBe(true);
    expect(tracked.setMusicTrack("exploration")).toBe(false);
    expect(audio.loadCalls).toBe(1);
    tracked.destroy();
    manager.destroy();
  });
});
