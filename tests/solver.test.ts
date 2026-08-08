import assert from "node:assert/strict";
import test from "node:test";

import {
  ADJACENCY,
  STATE_CODES,
  STATE_NAMES,
  generateTrace,
  type StateCode,
} from "../lib/solver";

const FOUR_COLORS = ["coral", "blue", "gold", "green"] as const;

test("the graph contains exactly 50 named states and valid symmetric borders", () => {
  assert.equal(STATE_CODES.length, 50);
  assert.equal(new Set(STATE_CODES).size, 50);

  const states = new Set<string>(STATE_CODES);
  let directedEdges = 0;
  for (const state of STATE_CODES) {
    assert.ok(STATE_NAMES[state].length > 0, `${state} needs a full name`);
    assert.deepEqual(
      ADJACENCY[state],
      [...ADJACENCY[state]].sort(),
      `${state} neighbors must use deterministic abbreviation order`,
    );
    assert.equal(new Set(ADJACENCY[state]).size, ADJACENCY[state].length);

    for (const neighbor of ADJACENCY[state]) {
      directedEdges += 1;
      assert.ok(states.has(neighbor), `${state} references unknown ${neighbor}`);
      assert.notEqual(neighbor, state, `${state} cannot border itself`);
      assert.ok(
        ADJACENCY[neighbor].includes(state),
        `${state}–${neighbor} must be symmetric`,
      );
    }
  }

  assert.equal(directedEdges % 2, 0);
  assert.deepEqual(ADJACENCY.AK, []);
  assert.deepEqual(ADJACENCY.HI, []);
  assert.ok(ADJACENCY.DE.includes("NJ"));
  assert.ok(!ADJACENCY.AZ.includes("CO"), "Four Corners is not an edge");
  assert.ok(!ADJACENCY.UT.includes("NM"), "Four Corners is not an edge");
  assert.ok(!ADJACENCY.MI.includes("MN"), "Lake Superior is not a land edge");
  assert.ok(!ADJACENCY.NY.includes("RI"), "Long Island Sound is not a land edge");
});

test("trace generation is deterministic and MRV ties use abbreviation order", () => {
  const first = generateTrace(FOUR_COLORS);
  const second = generateTrace(FOUR_COLORS);

  assert.deepEqual(first, second);
  const firstSelection = first.find(
    (snapshot) => snapshot.event.type === "select-variable",
  );
  assert.equal(firstSelection?.event.state, "AK");
  assert.equal(firstSelection?.event.previousDomain?.join(","), FOUR_COLORS.join(","));
  assert.match(firstSelection?.event.narration ?? "", /fewest remaining colors/i);
});

test("four colors produce a complete coloring with no adjacent conflicts", () => {
  const trace = generateTrace(FOUR_COLORS);
  const final = trace.at(-1);

  assert.equal(final?.status, "solved");
  assert.equal(final?.event.type, "solved");
  assert.equal(Object.keys(final?.assignments ?? {}).length, 50);
  for (const state of STATE_CODES) {
    const color = final?.assignments[state];
    assert.ok(color && FOUR_COLORS.includes(color as (typeof FOUR_COLORS)[number]));
    for (const neighbor of ADJACENCY[state]) {
      assert.notEqual(color, final?.assignments[neighbor], `${state} conflicts with ${neighbor}`);
    }
  }
});

test("trace exposes domain reductions and singleton propagation as separate events", () => {
  const trace = generateTrace(FOUR_COLORS);
  const reduction = trace.find(
    (snapshot) => snapshot.event.type === "remove-color",
  );
  const forced = trace.find(
    (snapshot) => snapshot.event.type === "forced-assignment",
  );

  assert.ok(reduction);
  assert.ok(reduction.event.state);
  assert.ok(reduction.event.causeState);
  assert.ok(reduction.event.colorId);
  assert.equal(reduction.event.source, reduction.event.causeState);
  assert.equal(reduction.event.description, reduction.event.narration);
  assert.deepEqual(
    reduction.domains[reduction.event.state as StateCode],
    reduction.event.nextDomain,
  );
  assert.equal(
    reduction.event.previousDomain!.length - 1,
    reduction.event.nextDomain!.length,
  );

  assert.ok(forced, "the ordinary four-color trace should demonstrate propagation");
  assert.equal(forced.domains[forced.event.state as StateCode].length, 1);
  assert.equal(forced.assignments[forced.event.state as StateCode], forced.event.colorId);
});

test("small palettes record contradictions, backtracking, and unsatisfiability", () => {
  for (const palette of [["red"], ["red", "blue"], ["red", "blue", "gold"]]) {
    const trace = generateTrace(palette);
    assert.equal(trace.at(-1)?.status, "unsatisfiable");
    assert.equal(trace.at(-1)?.event.type, "unsatisfiable");
    const contradiction = trace.find(
      (snapshot) => snapshot.event.type === "contradiction",
    );
    assert.ok(contradiction);
    assert.equal(
      contradiction.domains[contradiction.event.state as StateCode].length,
      0,
    );
    assert.ok(trace.some((snapshot) => snapshot.event.type === "backtrack"));
    assert.ok((trace.at(-1)?.metrics.backtracks ?? 0) > 0);
  }
});

test("the trace cap bounds retained memory without hiding the terminal result", () => {
  const trace = generateTrace(["red", "blue", "gold"], { maxSnapshots: 50 });
  const final = trace.at(-1);

  assert.equal(trace.length, 50);
  assert.equal(final?.status, "unsatisfiable");
  assert.ok((final?.metrics.omittedEvents ?? 0) > 0);
  assert.ok((final?.index ?? 0) > trace.length);
});

test("snapshots are immutable and palette validation rejects ambiguous ids", () => {
  const trace = generateTrace(FOUR_COLORS);
  const snapshot = trace[1];

  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.event));
  assert.ok(Object.isFrozen(snapshot.domains));
  assert.ok(Object.isFrozen(snapshot.domains.AL));
  assert.ok(Object.isFrozen(snapshot.assignments));
  assert.ok(Object.isFrozen(snapshot.stack));
  assert.ok(Object.isFrozen(snapshot.metrics));
  assert.throws(() => generateTrace(["red", "red"]), /unique/i);
  assert.throws(() => generateTrace([""]), /non-empty/i);
  assert.throws(() => generateTrace(["red"], { maxSnapshots: 1 }), /at least 2/i);
});
