import { expect, test } from "vitest";
import { traffic } from "../../src/lib/schemas/traffic";
import {
  box,
  boxPercent,
  flowBands,
  frontierOnly,
  trafficSides,
  wildchat,
} from "../../src/lib/traffic";
import { dollars, dotPoint, percent } from "../../src/lib/traffic-shared";

test("the replay's routes add up to its totals and its saving", () => {
  const calls = wildchat.routes.reduce((sum, r) => sum + r.calls, 0);
  const cost = wildchat.routes.reduce((sum, r) => sum + r.cost, 0);
  expect(calls).toBeCloseTo(wildchat.totalCalls, 0);
  expect(cost).toBeCloseTo(wildchat.routedCost, 2);
  expect(1 - wildchat.routedCost / wildchat.frontierOnlyCost).toBeCloseTo(wildchat.savings.both, 3);
  expect(dollars(wildchat.frontierOnlyCost)).toBe("$422.50");
  expect(dollars(wildchat.routedCost)).toBe("$80.51");
});

test("the schema rejects routes that don't add up", () => {
  const broken = { ...wildchat, routedCost: wildchat.routedCost + 5 };
  expect(traffic.safeParse(broken).success).toBe(false);
});

test("bands leave the incoming block in order and arrive without overlapping", () => {
  const bands = flowBands(wildchat.routes, wildchat.totalCalls);
  expect(bands[0]?.from[0]).toBe(box.top);
  expect(bands.at(-1)?.from[1]).toBeCloseTo(box.top + box.span, 6);
  for (let i = 1; i < bands.length; i += 1) {
    const [before, after] = [bands[i - 1], bands[i]];
    if (!before || !after) throw new Error("Missing band");
    expect(after.from[0]).toBeCloseTo(before.from[1], 6);
    expect(after.to[0]).toBeGreaterThan(before.to[1]);
    expect(after.labelY - before.labelY).toBeGreaterThanOrEqual(44 + 10 - 1e-6);
  }
  for (const band of bands) {
    expect(band.to[1] - band.to[0]).toBeGreaterThanOrEqual(8);
    expect(band.labelY - 22).toBeGreaterThanOrEqual(0);
    expect(band.labelY + 22).toBeLessThanOrEqual(box.height);
  }
});

test("the frontier-only side is one full band", () => {
  const [band, ...rest] = flowBands(frontierOnly(wildchat), wildchat.totalCalls);
  expect(rest).toEqual([]);
  expect(band?.share).toBe(1);
  expect(() => flowBands([], 1)).toThrow("at least one route");
});

test("dots start at their band's source and end at its destination", () => {
  expect(dotPoint([100, 200], [300, 400], 0.5, 0)).toEqual([box.x0, 150]);
  expect(dotPoint([100, 200], [300, 400], 0.5, 1)).toEqual([box.x1, 350]);
  expect(percent(0.0502)).toBe("5%");
  expect(percent(0.809)).toBe("81%");
});

test("the two panels compare the frontier-only cost with the routed cost", () => {
  const [frontier, nouli] = trafficSides(wildchat);
  expect(frontier?.id).toBe("frontier");
  expect(frontier?.cost).toBe(wildchat.frontierOnlyCost);
  expect(frontier?.bands).toHaveLength(1);
  expect(nouli?.cost).toBe(wildchat.routedCost);
  expect(nouli?.bands).toHaveLength(wildchat.routes.length);
  expect(boxPercent(60, 600)).toBe("10.00%");
});
