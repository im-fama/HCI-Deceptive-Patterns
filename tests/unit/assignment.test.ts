import { describe, expect, it } from "vitest";
import { drawFromBlocks, emptyQueues, resolveAssignment } from "../../src/lib/assignment";
import type { Condition, OwnPlatform } from "../../src/types";

describe("stratified block assignment", () => {
  it("keeps conditions within 1 of each other in every stratum over 1,000 draws each", () => {
    let queues = emptyQueues();
    const counts: Record<OwnPlatform, Record<Condition, number>> = {
      ios: { ios: 0, md: 0 },
      android: { ios: 0, md: 0 },
      other: { ios: 0, md: 0 },
    };
    const strata: OwnPlatform[] = ["ios", "android", "other"];
    // Interleave strata randomly, as real participants would arrive.
    for (let i = 0; i < 3000; i++) {
      let stratum = strata[Math.floor(Math.random() * 3)];
      const done = strata.filter((s) => counts[s].ios + counts[s].md >= 1000);
      if (done.includes(stratum)) stratum = strata.find((s) => !done.includes(s))!;
      const r = drawFromBlocks(queues, stratum);
      queues = r.queues;
      counts[stratum][r.condition]++;
      expect(Math.abs(counts[stratum].ios - counts[stratum].md)).toBeLessThanOrEqual(1);
    }
    for (const s of strata) {
      expect(counts[s].ios + counts[s].md).toBe(1000);
      expect(Math.abs(counts[s].ios - counts[s].md)).toBeLessThanOrEqual(1);
    }
  });

  it("uses both block orders", () => {
    const first = new Set<Condition>();
    for (let i = 0; i < 50; i++) first.add(drawFromBlocks(emptyQueues(), "ios").condition);
    expect(first.size).toBe(2);
  });

  it("respects the researcher override", async () => {
    const draw = async (): Promise<Condition> => {
      throw new Error("should not draw");
    };
    expect(await resolveAssignment({ force: "ios", demoMode: false }, null, draw)).toEqual({ condition: "ios", assignment: "forced" });
    expect(await resolveAssignment({ force: "md", demoMode: false }, null, draw)).toEqual({ condition: "md", assignment: "forced" });
  });

  it("marks demo sessions demo-forced, and auto uses the block draw", async () => {
    expect(await resolveAssignment({ force: "ios", demoMode: false }, "md", async () => "ios")).toEqual({
      condition: "md",
      assignment: "demo-forced",
    });
    expect(await resolveAssignment({ force: "auto", demoMode: false }, null, async () => "md")).toEqual({
      condition: "md",
      assignment: "stratified-block",
    });
  });
});
