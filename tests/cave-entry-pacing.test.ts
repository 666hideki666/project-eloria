import { describe, expect, it } from "vitest";
import { CAVE_ENTRY_NARRATION, CaveEntryTitleSequence } from "../src/ui/caveEntryTitle";
import { CaveGuideSequence } from "../src/ui/caveGuide";
import { Layer1AnomalySequence, LAYER1_ANOMALY_PAGES } from "../src/ui/layer1Anomaly";

describe("initial cave story pacing", () => {
  it("starts directly with controls and never advances a card on a timer", () => {
    const guide = new CaveGuideSequence();
    expect(guide.phase).toBe("cards"); expect(guide.card).toBe(0);
    guide.update(60); expect(guide.phase).toBe("cards"); expect(guide.card).toBe(0);
    guide.advance(1000); expect(guide.card).toBe(1);
    guide.update(60); expect(guide.phase).toBe("cards");
  });
  it("keeps the full narration readable for 3.5 seconds with one automatic completion", () => {
    const s = new CaveEntryTitleSequence(); s.begin();
    expect(CAVE_ENTRY_NARRATION).toBe("三人は顔を見合わせ、暗い洞窟へ踏み出した。");
    expect(s.update(3.49)).toBe(false); expect(s.phase).toBe("reading");
    expect(s.update(.02)).toBe(true); expect(s.phase).toBe("done");
    expect(s.update(10)).toBe(false); s.begin(); expect(s.phase).toBe("done");
  });
  it("rejects carried early inputs and accepts a deliberate advance after 0.8 seconds", () => {
    const s = new CaveEntryTitleSequence();
    expect(s.advance()).toBe(false); s.begin(); s.update(.79);
    for (let i = 0; i < 10; i++) expect(s.advance()).toBe(false);
    s.update(.02); expect(s.ready).toBe(true); expect(s.advance()).toBe(true);
    expect(s.advance()).toBe(false); expect(s.update(10)).toBe(false);
  });
  it("supports explicit skip and keeps pulse short without changing the four narration pages", () => {
    const title = new CaveEntryTitleSequence(); title.begin(); title.skip();
    expect(title.update(10)).toBe(false); expect(title.advance()).toBe(false);
    const s = new Layer1AnomalySequence(); s.begin(); s.update(10, true, false);
    expect(s.phase).toBe("waiting-title"); s.update(0, false, false);
    s.update(.39, false, false); expect(s.phase).toBe("pulse");
    s.update(.01, false, false); expect(s.phase).toBe("story"); expect(s.pageIndex).toBe(0);
    expect(LAYER1_ANOMALY_PAGES).toHaveLength(4);
    s.update(0, false, true); expect(s.text).toBe(LAYER1_ANOMALY_PAGES[0].text);
  });
});
