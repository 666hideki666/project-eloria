import { describe, expect, it } from "vitest";
import { OpeningSequence, PROLOGUE_SCENES, shouldShowOpening } from "../src/ui/openingSequence";

describe("title and illustrated prologue", () => {
  it("keeps normal startup on the title, with arena and development direct starts bypassed", () => {
    expect(shouldShowOpening("stage", false)).toBe(true);
    expect(shouldShowOpening("stage", true)).toBe(false);
    expect(shouldShowOpening("arena", false)).toBe(false);
  });

  it("matches the approved six scenes and twelve narration sentences", () => {
    expect(PROLOGUE_SCENES.map(scene => scene.id)).toEqual([
      "anomaly", "village-roots-nadi", "conversation", "map-shard-clue", "village-farewell", "departure",
    ]);
    expect(PROLOGUE_SCENES.map(scene => scene.narration)).toEqual([
      ["それは、村の井戸に灯った青い光から始まった。", "輝きは古い根を伝い、静かな朝へ少しずつ広がっていく。"],
      ["森へ続く道にまで異変が現れ、人々は足を止めた。", "ナディは村人を守り、その源を確かめると決めた。"],
      ["井戸のほとりに集まったのは、思いの異なる三人だった。", "ナディは村を、カイルは封印石を、メルは晶石の声を追っていた。"],
      ["古い地図の印と、小さな晶片の光が示す先は同じ。", "それは、古の森の奥にある洞窟だった。"],
      ["ナディは心配する村人に、少し森の様子を見てくると伝えた。", "カイルとメルも、それぞれ気になる手がかりを確かめるつもりだった。"],
      ["村の喧騒が遠ざかるほど、森は深い静けさに包まれた。", "三人は青い光を追い、木々の奥へ足を踏み入れた。"],
    ]);
  });

  it("types continuously across the sentence break without input or automatic scene changes", () => {
    const sequence = new OpeningSequence();
    expect(sequence.start()).toBe(true);
    expect(sequence.start()).toBe(false);
    expect(sequence.text).toBe("");
    expect(sequence.fullyVisible).toBe(false);
    sequence.update(.25, false);
    expect(sequence.text).toBe(sequence.fullText.slice(0, 7));
    // Frame partitioning does not change the pace.
    const split = new OpeningSequence();
    split.start();
    for (let i = 0; i < 25; i++) split.update(.01, false);
    expect(split.text).toBe(sequence.text);
    sequence.update(1, false);
    expect(sequence.text).toContain(sequence.scene.narration[0] + "\n");
    expect(sequence.text.length).toBeLessThan(sequence.fullText.length);
    sequence.update(60, false);
    expect(sequence.text).toBe(sequence.fullText);
    expect(sequence.fullyVisible).toBe(true);
    expect(sequence.sceneIndex).toBe(0);
    expect(sequence.phase).toBe("prologue");
  });

  it("reveals both sentences first, then advances one scene, including the final handoff", () => {
    const sequence = new OpeningSequence();
    sequence.start();
    let now = 1000;
    for (const [index, scene] of PROLOGUE_SCENES.entries()) {
      expect(sequence.sceneIndex).toBe(index);
      expect(sequence.text).toBe("");
      sequence.update(.1, false);
      expect(sequence.advance(now)).toBe(true);
      expect(sequence.sceneIndex).toBe(index);
      expect(sequence.text).toBe(scene.narration.join("\n"));
      expect(sequence.advance(now + 60)).toBe(false);
      sequence.update(.1, false);
      expect(sequence.text).toBe(sequence.fullText); // Revealing never rewinds.
      expect(sequence.advance(now + 250)).toBe(true);
      expect(sequence.advance(now + 310)).toBe(false);
      now += 500;
    }
    expect(sequence.phase).toBe("leaving");
    expect(sequence.update(.2, false)).toBe(false);
    expect(sequence.update(.2, false)).toBe(true);
    expect(sequence.update(10, false)).toBe(false);
    expect(sequence.skip()).toBe(false);
    expect(sequence.advance(now)).toBe(false);
  });

  it("skips from every scene even while text is incomplete, handing off once", () => {
    for (let scene = 0; scene < PROLOGUE_SCENES.length; scene += 1) {
      const sequence = new OpeningSequence();
      expect(sequence.skip()).toBe(false);
      sequence.start();
      let now = 1000;
      while (sequence.sceneIndex < scene) {
        sequence.update(10, false);
        sequence.advance(now);
        now += 200;
      }
      expect(sequence.fullyVisible).toBe(false);
      expect(sequence.skip()).toBe(true);
      expect(sequence.skip()).toBe(false);
      expect(sequence.advance(now)).toBe(false);
      expect(sequence.update(.1, true)).toBe(true);
      expect(sequence.update(1, true)).toBe(false);
    }
  });

  it("resets text progression and debounce on return to the title", () => {
    const sequence = new OpeningSequence();
    sequence.start(true);
    for (let i = 0; i < 4; i++) sequence.advance(1000 + i * 200, true);
    sequence.skip();
    sequence.reset();
    expect(sequence.phase).toBe("title");
    expect(sequence.sceneIndex).toBe(0);
    sequence.update(10, false);
    sequence.start();
    expect(sequence.text).toBe("");
    expect(sequence.advance(100)).toBe(true);
    expect(sequence.sceneIndex).toBe(0);
    expect(sequence.text).toBe(sequence.fullText);
    sequence.update(-1, false);
    expect(sequence.text).toBe(sequence.fullText);
  });

  it("shows all text immediately with reduced motion on start and each new scene", () => {
    const sequence = new OpeningSequence();
    sequence.start(true);
    for (let i = 0; i < PROLOGUE_SCENES.length; i++) {
      expect(sequence.sceneIndex).toBe(i);
      expect(sequence.text).toBe(sequence.fullText);
      expect(sequence.fullyVisible).toBe(true);
      expect(sequence.update(60, true)).toBe(false);
      expect(sequence.sceneIndex).toBe(i);
      sequence.advance(1000 + i * 200, true);
    }
    expect(sequence.phase).toBe("leaving");
    expect(sequence.update(.08, true)).toBe(true);
    expect(sequence.update(.08, true)).toBe(false);
  });

  it("finishes the current scene when reduced motion is enabled mid-typing", () => {
    const sequence = new OpeningSequence();
    sequence.start();
    sequence.update(.1, false);
    sequence.update(0, true);
    expect(sequence.text).toBe(sequence.fullText);
    sequence.update(0, false);
    expect(sequence.text).toBe(sequence.fullText);
    sequence.advance(1000);
    expect(sequence.text).toBe("");
  });
});
