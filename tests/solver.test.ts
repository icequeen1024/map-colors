import assert from "node:assert/strict";
import test from "node:test";

import {
  ADJACENCY,
  STATE_CODES,
  STATE_CODES_BOTTOM_UP,
  STATE_CODES_TOP_DOWN,
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

test("trace generation is deterministic and follows the selected map direction", () => {
  const first = generateTrace(FOUR_COLORS);
  const second = generateTrace(FOUR_COLORS);

  assert.deepEqual(first, second);
  const firstSelection = first.find(
    (snapshot) => snapshot.event.type === "select-variable",
  );
  assert.equal(firstSelection?.event.state, "WA");
  assert.equal(firstSelection?.event.previousDomain?.join(","), FOUR_COLORS.join(","));
  assert.match(firstSelection?.event.narration ?? "", /top to bottom/i);

  const bottomUp = generateTrace(FOUR_COLORS, {
    traversalDirection: "bottom-up",
  });
  assert.equal(
    bottomUp.find((snapshot) => snapshot.event.type === "select-variable")?.event.state,
    "HI",
  );

  for (const order of [STATE_CODES_TOP_DOWN, STATE_CODES_BOTTOM_UP]) {
    assert.equal(order.length, 50);
    assert.equal(new Set(order).size, 50);
    assert.deepEqual(new Set(order), new Set(STATE_CODES));
  }
});

test("learner guidance replaces one decision and deterministic scanning resumes", () => {
  const trace = generateTrace(FOUR_COLORS, {
    propagationEnabled: false,
    learnerInterventions: [{ decisionIndex: 1, state: "TX" }],
  });
  const selections = trace.filter(
    (snapshot) => snapshot.event.type === "select-variable",
  );

  assert.deepEqual(
    selections.slice(0, 3).map((snapshot) => snapshot.event.state),
    ["WA", "TX", "ME"],
  );
  assert.equal(selections[1].event.selectionReason, "learner");
  assert.equal(selections[1].event.requestedState, "TX");
  assert.match(selections[1].event.narration, /human guidance/i);
  assert.equal(selections[2].event.selectionReason, "direction");

  const unavailable = generateTrace(FOUR_COLORS, {
    learnerInterventions: [{ decisionIndex: 1, state: "WA" }],
  }).filter((snapshot) => snapshot.event.type === "select-variable")[1];
  assert.equal(unavailable.event.state, "ME");
  assert.equal(unavailable.event.selectionReason, "learner-unavailable");
  assert.equal(unavailable.event.requestedState, "WA");
  assert.match(unavailable.event.narration, /already assigned/i);
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

test("non-contradiction snapshots never contain equal-colored neighbors", () => {
  for (const propagationEnabled of [true, false]) {
    const trace = generateTrace(FOUR_COLORS, { propagationEnabled });
    for (const snapshot of trace) {
      if (snapshot.event.type === "contradiction") continue;
      for (const state of STATE_CODES) {
        const color = snapshot.assignments[state];
        if (color === undefined) continue;
        for (const neighbor of ADJACENCY[state]) {
          assert.notEqual(
            color,
            snapshot.assignments[neighbor],
            `${state}/${neighbor} conflict leaked into ${snapshot.event.type}`,
          );
        }
      }
    }
  }
});

test("a forced singleton that conflicts is rejected immediately", () => {
  const trace = generateTrace(["red", "blue", "gold"]);
  const contradictionIndex = trace.findIndex(
    (snapshot, index) =>
      index > 0 &&
      snapshot.event.type === "contradiction" &&
      trace[index - 1].event.type === "remove-color" &&
      trace[index - 1].event.state === snapshot.event.state &&
      trace[index - 1].event.nextDomain?.length === 1,
  );

  assert.ok(contradictionIndex > 0, "expected a forced-color neighbor conflict");
  const before = trace[contradictionIndex - 1];
  const contradiction = trace[contradictionIndex];
  assert.equal(before.event.type, "remove-color");
  assert.equal(contradiction.event.type, "contradiction");
  const conflictedState = contradiction.event.state as StateCode;
  const causeState = contradiction.event.causeState as StateCode;
  assert.equal(contradiction.assignments[conflictedState], undefined);
  assert.equal(
    contradiction.assignments[causeState],
    contradiction.event.colorId,
  );
  assert.ok(
    BigInt(contradiction.outcomes.remaining) <
      BigInt(before.outcomes.remaining),
    "the rejected active branch must be eliminated exactly when detected",
  );
});

test("search-tree decisions expose pruned, rejected, and solution color branches", () => {
  const solvedTrace = generateTrace(FOUR_COLORS);
  const prunedSnapshot = solvedTrace.find((snapshot) =>
    snapshot.searchTree.some((decision) =>
      decision.options.some((option) => option.status === "pruned"),
    ),
  );
  const solvedOptions = solvedTrace
    .at(-1)!
    .searchTree.flatMap((decision) => decision.options)
    .filter((option) => option.status === "solution");

  assert.ok(prunedSnapshot, "propagated colors should appear as pruned tree options");
  assert.ok(
    prunedSnapshot.searchTree.every(
      (decision) => decision.options.length === FOUR_COLORS.length,
    ),
    "each tree decision keeps the complete palette visible",
  );
  assert.ok(solvedOptions.length > 0);
  assert.ok(solvedOptions.every((option) => option.branchId));

  const failedTrace = generateTrace(["red", "blue", "gold"]);
  const backtrack = failedTrace.find(
    (snapshot) => snapshot.event.type === "backtrack",
  );
  const rejectedBranchId = backtrack?.stack.at(-1)?.branchId;
  const rejectedOption = backtrack?.searchTree
    .flatMap((decision) => decision.options)
    .find((option) => option.branchId === rejectedBranchId);

  assert.ok(rejectedBranchId);
  assert.equal(rejectedOption?.status, "rejected");
  assert.ok(
    rejectedOption?.rejectionReason === "contradiction" ||
      rejectedOption?.rejectionReason === "exhausted",
  );
});

test("outcome space starts at 4^50 and only shrinks as outcomes are disproved", () => {
  const trace = generateTrace(FOUR_COLORS);
  const expectedTotal = BigInt(4) ** BigInt(50);
  const expectedFirstReduction = BigInt(4) ** BigInt(48);
  const firstReduction = trace.find(
    (snapshot) => snapshot.event.type === "remove-color",
  )!;

  assert.deepEqual(trace[0].outcomes, {
    total: expectedTotal.toString(),
    remaining: expectedTotal.toString(),
    eliminated: "0",
  });
  assert.equal(
    firstReduction.outcomes.eliminated,
    expectedFirstReduction.toString(),
  );

  let previousRemaining = expectedTotal;
  for (let index = 0; index < trace.length; index += 1) {
    const snapshot = trace[index];
    const total = BigInt(snapshot.outcomes.total);
    const remaining = BigInt(snapshot.outcomes.remaining);
    const eliminated = BigInt(snapshot.outcomes.eliminated);

    assert.equal(total, expectedTotal);
    assert.ok(remaining <= previousRemaining, `outcomes increased at event ${index}`);
    assert.equal(eliminated, total - remaining);
    if (snapshot.event.type === "try-color") {
      assert.equal(
        remaining,
        BigInt(trace[index - 1].outcomes.remaining),
        "trying a branch must not eliminate its unvisited siblings",
      );
    }
    previousRemaining = remaining;
  }

  assert.ok(
    BigInt(trace.at(-1)!.outcomes.remaining) > BigInt(0),
    "stopping at the first solution leaves other outcomes not yet disproved",
  );
});

test("propagation eliminates outcome volume earlier than direct checking", () => {
  const withPropagation = generateTrace(FOUR_COLORS);
  const withoutPropagation = generateTrace(FOUR_COLORS, {
    propagationEnabled: false,
  });
  const firstShrinkWithPropagation = withPropagation.findIndex(
    (snapshot) => snapshot.outcomes.eliminated !== "0",
  );
  const firstShrinkWithoutPropagation = withoutPropagation.findIndex(
    (snapshot) => snapshot.outcomes.eliminated !== "0",
  );

  assert.ok(firstShrinkWithPropagation >= 0);
  assert.ok(firstShrinkWithoutPropagation >= 0);
  assert.ok(firstShrinkWithPropagation < firstShrinkWithoutPropagation);
  assert.equal(
    withPropagation[firstShrinkWithPropagation].event.type,
    "remove-color",
  );
  assert.equal(
    withoutPropagation[firstShrinkWithoutPropagation].event.type,
    "contradiction",
  );
  assert.ok(
    BigInt(withPropagation[firstShrinkWithPropagation].outcomes.eliminated) >
      BigInt(0),
  );
});

test("deprecated attempt counters remain internally consistent", () => {
  const trace = generateTrace(FOUR_COLORS);
  const total = trace.at(-1)!.metrics.totalColorAttempts;

  for (const snapshot of trace) {
    assert.equal(
      snapshot.metrics.remainingColorAttempts,
      total - snapshot.metrics.colorAttempts,
    );
  }
});

test("propagation-off uses the same DFS but directly rejects neighbor conflicts", () => {
  const withPropagation = generateTrace(FOUR_COLORS);
  const withoutPropagation = generateTrace(FOUR_COLORS, {
    propagationEnabled: false,
  });
  const final = withoutPropagation.at(-1)!;

  assert.equal(withoutPropagation[0].propagationEnabled, false);
  assert.equal(final.status, "solved");
  assert.equal(final.metrics.domainReductions, 0);
  assert.ok(
    !withoutPropagation.some(
      (snapshot) => snapshot.event.type === "forced-assignment",
    ),
  );
  assert.ok(
    final.metrics.totalColorAttempts >
      withPropagation.at(-1)!.metrics.totalColorAttempts,
  );
  assert.ok(
    withoutPropagation.some(
      (snapshot) =>
        snapshot.event.type === "contradiction" &&
        snapshot.event.causeState !== undefined,
    ),
    "colors conflicting with assigned neighbors must be rejected",
  );
  for (const state of STATE_CODES) {
    for (const neighbor of ADJACENCY[state]) {
      assert.notEqual(final.assignments[state], final.assignments[neighbor]);
    }
  }
});

test("pathological propagation-off search ends honestly at its attempt limit", () => {
  const trace = generateTrace(["red", "blue", "gold"], {
    propagationEnabled: false,
    maxColorAttempts: 20,
  });
  const final = trace.at(-1)!;

  assert.equal(final.status, "limit-reached");
  assert.equal(final.event.type, "limit-reached");
  assert.match(final.event.narration, /not an unsatisfiability proof/i);
  assert.equal(final.metrics.totalColorAttempts, 20);
  assert.equal(final.metrics.colorAttempts, 20);
  assert.equal(final.metrics.remainingColorAttempts, 0);
  assert.equal(final.metrics.runTerminatedByLimit, true);
  assert.equal(trace[0].metrics.remainingColorAttempts, 20);
  assert.ok(BigInt(final.outcomes.remaining) > BigInt(0));
  assert.equal(
    BigInt(final.outcomes.eliminated),
    BigInt(final.outcomes.total) - BigInt(final.outcomes.remaining),
  );
  assert.ok(
    Object.keys(final.assignments).length > 0,
    "the capped terminal snapshot should preserve the branch being inspected",
  );
  assert.ok(final.stack.length > 0);
});

test("small palettes record contradictions, backtracking, and unsatisfiability", () => {
  for (const palette of [["red"], ["red", "blue"], ["red", "blue", "gold"]]) {
    const trace = generateTrace(palette);
    assert.equal(trace.at(-1)?.status, "unsatisfiable");
    assert.equal(trace.at(-1)?.event.type, "unsatisfiable");
    assert.equal(trace.at(-1)?.outcomes.remaining, "0");
    assert.equal(
      trace.at(-1)?.outcomes.eliminated,
      trace.at(-1)?.outcomes.total,
    );
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
  assert.ok(Object.isFrozen(snapshot.searchTree));
  assert.ok(Object.isFrozen(snapshot.searchTree[0]));
  assert.ok(Object.isFrozen(snapshot.searchTree[0].options));
  assert.ok(Object.isFrozen(snapshot.metrics));
  assert.ok(Object.isFrozen(snapshot.outcomes));
  assert.throws(() => generateTrace(["red", "red"]), /unique/i);
  assert.throws(() => generateTrace([""]), /non-empty/i);
  assert.throws(() => generateTrace(["red"], { maxSnapshots: 1 }), /at least 2/i);
  assert.throws(
    () => generateTrace(["red"], { maxColorAttempts: 0 }),
    /positive integer/i,
  );
  assert.throws(
    () => generateTrace(["red"], {
      traversalDirection: "sideways" as "top-down",
    }),
    /top-down or bottom-up/i,
  );
  assert.throws(
    () => generateTrace(["red"], {
      learnerInterventions: [{ decisionIndex: -1, state: "WA" }],
    }),
    /non-negative integers/i,
  );
  assert.throws(
    () => generateTrace(["red"], {
      learnerInterventions: [
        { decisionIndex: 0, state: "WA" },
        { decisionIndex: 0, state: "OR" },
      ],
    }),
    /only one learner intervention/i,
  );
});
