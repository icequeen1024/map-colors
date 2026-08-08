import { ADJACENCY, STATE_CODES, STATE_NAMES, type StateCode } from "./map-data";

export type SolverStatus =
  | "ready"
  | "searching"
  | "contradiction"
  | "backtracking"
  | "solved"
  | "unsatisfiable"
  | "limit-reached";

export type TraversalDirection = "top-down" | "bottom-up";

export interface LearnerIntervention {
  /** Zero-based DFS variable-selection ordinal to replace. */
  readonly decisionIndex: number;
  /** State the learner wants the search to reconsider at that decision. */
  readonly state: StateCode;
}

export type SolverEventType =
  | "ready"
  | "select-variable"
  | "try-color"
  | "remove-color"
  | "forced-assignment"
  | "contradiction"
  | "backtrack"
  | "solved"
  | "unsatisfiable"
  | "limit-reached";

export interface SolverEvent {
  readonly type: SolverEventType;
  readonly title: string;
  readonly narration: string;
  /** Concise UI alias for narration. */
  readonly description: string;
  readonly formal: string;
  readonly state?: StateCode;
  readonly causeState?: StateCode;
  /** Concise UI alias for causeState. */
  readonly source?: StateCode;
  readonly colorId?: string;
  readonly previousDomain?: readonly string[];
  readonly nextDomain?: readonly string[];
  readonly selectionReason?: "direction" | "learner" | "learner-unavailable";
  readonly requestedState?: StateCode;
}

export interface SearchFrame {
  readonly state: StateCode;
  readonly colorId: string;
  /** Concise UI alias for colorId. */
  readonly color: string;
  readonly branchId: string;
  readonly depth: number;
  readonly status: "active" | "backtracked";
}

export type SearchTreeOptionStatus =
  | "pruned"
  | "available"
  | "active"
  | "rejected"
  | "solution";

export type SearchTreeRejectionReason =
  | "constraint"
  | "contradiction"
  | "exhausted";

export interface SearchTreeOption {
  readonly colorId: string;
  readonly status: SearchTreeOptionStatus;
  readonly branchId?: string;
  readonly rejectionReason?: SearchTreeRejectionReason;
}

/**
 * One explicit variable choice in the DFS tree. `parentBranchId` connects this
 * choice to the color-attempt option that led to it. Options omitted from the
 * variable's current domain are included as `pruned`, making propagation's
 * avoided branches visible rather than silently dropping them.
 */
export interface SearchTreeDecision {
  readonly id: string;
  readonly parentBranchId?: string;
  readonly state: StateCode;
  readonly depth: number;
  readonly options: readonly SearchTreeOption[];
}

export interface SolverMetrics {
  /** All attempted and forced assignments, including abandoned branches. */
  readonly assignments: number;
  /** Backwards-compatible name for colorAttempts. */
  readonly decisions: number;
  /** DFS color choices examined through this snapshot. */
  readonly colorAttempts: number;
  /** Exact DFS color choices examined in this completed generated run. */
  readonly totalColorAttempts: number;
  /** @deprecated Use `snapshot.outcomes.remaining` for teaching remaining work. */
  readonly remainingColorAttempts: number;
  readonly domainReductions: number;
  /** Concise UI alias for domainReductions. */
  readonly reductions: number;
  readonly backtracks: number;
  readonly searchDepth: number;
  /** Concise UI alias for searchDepth. */
  readonly depth: number;
  readonly maxSearchDepth: number;
  /** Concise UI alias for maxSearchDepth. */
  readonly maxDepth: number;
  /** Events omitted after the configured snapshot memory cap was reached. */
  readonly omittedEvents: number;
  /** True when the safety attempt limit ended the run before search finished. */
  readonly runTerminatedByLimit: boolean;
}

/** Exact counts of complete assignments in the original palette search space. */
export interface OutcomeSpaceMetrics {
  /** `paletteSize ^ 50`, expressed as a base-10 BigInt string. */
  readonly total: string;
  /** Original complete assignments not yet disproved at this event. */
  readonly remaining: string;
  /** Disproved original complete assignments (`total - remaining`). */
  readonly eliminated: string;
}

export interface TraceSnapshot {
  readonly index: number;
  readonly status: SolverStatus;
  readonly event: SolverEvent;
  readonly assignments: Readonly<Partial<Record<StateCode, string>>>;
  readonly domains: Readonly<Record<StateCode, readonly string[]>>;
  readonly stack: readonly SearchFrame[];
  readonly searchTree: readonly SearchTreeDecision[];
  readonly propagationEnabled: boolean;
  readonly metrics: SolverMetrics;
  readonly outcomes: OutcomeSpaceMetrics;
  readonly currentState?: StateCode;
  readonly affectedState?: StateCode;
}

export interface GenerateTraceOptions {
  /** Enable domain reduction and automatic singleton assignment. Default true. */
  readonly propagationEnabled?: boolean;
  /** Geographic direction used for explicit DFS variable choices. Default top-down. */
  readonly traversalDirection?: TraversalDirection;
  /** Deterministic one-time learner overrides keyed to DFS decision ordinals. */
  readonly learnerInterventions?: readonly LearnerIntervention[];
  /**
   * Maximum retained snapshots. Search still runs after this cap and the
   * terminal snapshot is always retained.
   */
  readonly maxSnapshots?: number;
  /**
   * Safety bound for attempted DFS colors. The default of 25,000 completes the
   * four-color lesson with propagation either on or off, while preventing an
   * exhaustive propagation-off three-color run from freezing the page.
   */
  readonly maxColorAttempts?: number;
}

/** @deprecated Outcome-space comparison uses `snapshot.outcomes` instead. */
export const REMAINING_WORK_DEFINITION =
  "Deprecated: future DFS color choices examined after this snapshot in the generated run.";

interface WorkingState {
  assignments: Partial<Record<StateCode, string>>;
  domains: Record<StateCode, string[]>;
}

interface MutableMetrics {
  assignments: number;
  decisions: number;
  domainReductions: number;
  backtracks: number;
  maxSearchDepth: number;
}

interface MutableSearchTreeOption {
  colorId: string;
  status: SearchTreeOptionStatus;
  branchId?: string;
  rejectionReason?: SearchTreeRejectionReason;
}

interface MutableSearchTreeDecision {
  id: string;
  parentBranchId?: string;
  state: StateCode;
  depth: number;
  options: MutableSearchTreeOption[];
}

type SolverEventInput = Omit<SolverEvent, "description" | "source">;

interface EventContext {
  status: SolverStatus;
  event: SolverEventInput;
  currentState?: StateCode;
  affectedState?: StateCode;
}

const DEFAULT_MAX_SNAPSHOTS = 30_000;
const DEFAULT_MAX_SNAPSHOTS_WITHOUT_PROPAGATION = 300;
const DEFAULT_MAX_COLOR_ATTEMPTS = 25_000;
const SEARCH_TREE_RECENT_WINDOW = 18;

/**
 * State-label order on the displayed map, scanning from top to bottom and
 * left to right. Alaska and Hawaii follow the same rule in their visible
 * insets. Bottom-up reverses vertical order while keeping row ties left to
 * right.
 */
export const STATE_CODES_TOP_DOWN: readonly StateCode[] = Object.freeze([
  "WA", "ME", "MT", "ND", "NH", "OR", "MN", "VT", "ID", "MA",
  "WI", "SD", "NY", "MI", "WY", "RI", "CT", "PA", "IA", "NE",
  "NJ", "OH", "NV", "IN", "IL", "DE", "UT", "WV", "MD", "CO",
  "CA", "MO", "KS", "VA", "KY", "TN", "NC", "OK", "AZ", "NM",
  "AR", "SC", "GA", "MS", "AL", "LA", "TX", "FL", "AK", "HI",
]);

export const STATE_CODES_BOTTOM_UP: readonly StateCode[] = Object.freeze([
  "HI", "AK", "FL", "TX", "LA", "MS", "AL", "GA", "SC", "AR",
  "NM", "AZ", "OK", "NC", "TN", "KY", "KS", "VA", "MO", "CA",
  "CO", "MD", "WV", "UT", "DE", "IL", "NV", "IN", "OH", "NJ",
  "NE", "IA", "PA", "CT", "WY", "RI", "MI", "NY", "SD", "WI",
  "MA", "ID", "VT", "OR", "MN", "NH", "MT", "ND", "ME", "WA",
]);

function formatDomain(domain: readonly string[]): string {
  return `{${domain.join(", ")}}`;
}

function cloneState(state: WorkingState): WorkingState {
  const domains = {} as Record<StateCode, string[]>;
  for (const code of STATE_CODES) domains[code] = [...state.domains[code]];
  return { assignments: { ...state.assignments }, domains };
}

function makeInitialState(colorIds: readonly string[]): WorkingState {
  const domains = {} as Record<StateCode, string[]>;
  for (const code of STATE_CODES) domains[code] = [...colorIds];
  return { assignments: {}, domains };
}

function activeBranchVolume(state: WorkingState): bigint {
  let volume = BigInt(1);
  for (const code of STATE_CODES) {
    if (state.assignments[code] === undefined) {
      volume *= BigInt(state.domains[code].length);
    }
  }
  return volume;
}

function freezeSnapshot(
  index: number,
  state: WorkingState,
  stack: readonly SearchFrame[],
  searchTree: readonly SearchTreeDecision[],
  propagationEnabled: boolean,
  totalOutcomeCount: bigint,
  remainingOutcomeCount: bigint,
  metrics: MutableMetrics,
  omittedEvents: number,
  context: EventContext,
): TraceSnapshot {
  const assignments = Object.freeze({ ...state.assignments });
  const domains = {} as Record<StateCode, readonly string[]>;
  for (const code of STATE_CODES) {
    domains[code] = Object.freeze([...state.domains[code]]);
  }

  const event = Object.freeze({
    ...context.event,
    description: context.event.narration,
    source: context.event.causeState,
    previousDomain: context.event.previousDomain
      ? Object.freeze([...context.event.previousDomain])
      : undefined,
    nextDomain: context.event.nextDomain
      ? Object.freeze([...context.event.nextDomain])
      : undefined,
  });
  const frozenStack = Object.freeze(
    stack.map((frame) => Object.freeze({ ...frame, color: frame.colorId })),
  );
  const searchDepth = stack.filter((frame) => frame.status === "active").length;
  const frozenMetrics = Object.freeze({
    assignments: metrics.assignments,
    decisions: metrics.decisions,
    colorAttempts: metrics.decisions,
    totalColorAttempts: 0,
    remainingColorAttempts: 0,
    domainReductions: metrics.domainReductions,
    reductions: metrics.domainReductions,
    backtracks: metrics.backtracks,
    searchDepth,
    depth: searchDepth,
    maxSearchDepth: metrics.maxSearchDepth,
    maxDepth: metrics.maxSearchDepth,
    omittedEvents,
    runTerminatedByLimit: false,
  });
  const outcomes: OutcomeSpaceMetrics = Object.freeze({
    total: totalOutcomeCount.toString(),
    remaining: remainingOutcomeCount.toString(),
    eliminated: (totalOutcomeCount - remainingOutcomeCount).toString(),
  });

  return Object.freeze({
    index,
    status: context.status,
    event,
    assignments,
    domains: Object.freeze(domains),
    stack: frozenStack,
    searchTree,
    propagationEnabled,
    metrics: frozenMetrics,
    outcomes,
    currentState: context.currentState,
    affectedState: context.affectedState,
  });
}

function validatePalette(colorIds: readonly string[]): void {
  const seen = new Set<string>();
  for (const colorId of colorIds) {
    if (typeof colorId !== "string" || colorId.trim().length === 0) {
      throw new TypeError("Every palette color id must be a non-empty string.");
    }
    if (seen.has(colorId)) {
      throw new TypeError(`Palette color ids must be unique: ${colorId}`);
    }
    seen.add(colorId);
  }
}

function freezeSearchTree(
  searchTree: readonly MutableSearchTreeDecision[],
  stack: readonly SearchFrame[],
): readonly SearchTreeDecision[] {
  const includedIndexes = new Set<number>();
  const branchOwners = new Map<string, number>();
  for (let index = 0; index < searchTree.length; index += 1) {
    for (const option of searchTree[index].options) {
      if (option.branchId) branchOwners.set(option.branchId, index);
    }
  }

  const firstRecentIndex = Math.max(
    0,
    searchTree.length - SEARCH_TREE_RECENT_WINDOW,
  );
  for (let index = firstRecentIndex; index < searchTree.length; index += 1) {
    includedIndexes.add(index);
  }
  for (const frame of stack) {
    const ownerIndex = branchOwners.get(frame.branchId);
    if (ownerIndex !== undefined) includedIndexes.add(ownerIndex);
  }

  // Keep ancestors for every recent decision so each retained branch remains
  // connected even after its active stack has been abandoned.
  const pendingIndexes = [...includedIndexes];
  for (let pendingIndex = 0; pendingIndex < pendingIndexes.length; pendingIndex += 1) {
    const decision = searchTree[pendingIndexes[pendingIndex]];
    if (!decision.parentBranchId) continue;
    const parentIndex = branchOwners.get(decision.parentBranchId);
    if (parentIndex !== undefined && !includedIndexes.has(parentIndex)) {
      includedIndexes.add(parentIndex);
      pendingIndexes.push(parentIndex);
    }
  }

  return Object.freeze(
    searchTree.filter((_, index) => includedIndexes.has(index)).map((decision) =>
      Object.freeze({
        ...decision,
        options: Object.freeze(
          decision.options.map((option) => Object.freeze({ ...option })),
        ),
      }),
    ),
  );
}

/**
 * Generate a deterministic teaching trace for a palette.
 *
 * The returned value and every nested snapshot collection are frozen. Both
 * modes use a geographic scan, palette-order values, and depth-first
 * backtracking. Learner interventions may replace individual variable choices;
 * deterministic scanning resumes immediately afterward. With propagation
 * enabled, assignment also reduces neighboring domains and forces singletons.
 * With it disabled, every color attempt is checked directly against already
 * assigned neighbors.
 */
export function generateTrace(
  colorIds: readonly string[],
  options: GenerateTraceOptions = {},
): readonly TraceSnapshot[] {
  validatePalette(colorIds);
  const propagationEnabled = options.propagationEnabled ?? true;
  const traversalDirection = options.traversalDirection ?? "top-down";
  const learnerInterventions = options.learnerInterventions ?? [];
  if (
    traversalDirection !== "top-down" &&
    traversalDirection !== "bottom-up"
  ) {
    throw new RangeError("traversalDirection must be top-down or bottom-up.");
  }
  const interventionStates = new Map<number, StateCode>();
  for (const intervention of learnerInterventions) {
    if (!Number.isInteger(intervention.decisionIndex) || intervention.decisionIndex < 0) {
      throw new RangeError("Learner intervention decision indexes must be non-negative integers.");
    }
    if (!(STATE_CODES as readonly string[]).includes(intervention.state)) {
      throw new RangeError(`Learner intervention state must be one of the 50 states: ${intervention.state}`);
    }
    if (interventionStates.has(intervention.decisionIndex)) {
      throw new RangeError(`Only one learner intervention is allowed at decision ${intervention.decisionIndex}.`);
    }
    interventionStates.set(intervention.decisionIndex, intervention.state);
  }
  const stateScanOrder = traversalDirection === "top-down"
    ? STATE_CODES_TOP_DOWN
    : STATE_CODES_BOTTOM_UP;
  const directionLabel = traversalDirection === "top-down"
    ? "top to bottom"
    : "bottom to top";
  const requestedCap =
    options.maxSnapshots ??
    (propagationEnabled
      ? DEFAULT_MAX_SNAPSHOTS
      : DEFAULT_MAX_SNAPSHOTS_WITHOUT_PROPAGATION);
  const maxColorAttempts =
    options.maxColorAttempts ?? DEFAULT_MAX_COLOR_ATTEMPTS;
  if (!Number.isInteger(requestedCap) || requestedCap < 2) {
    throw new RangeError("maxSnapshots must be an integer of at least 2.");
  }
  if (!Number.isInteger(maxColorAttempts) || maxColorAttempts < 1) {
    throw new RangeError("maxColorAttempts must be a positive integer.");
  }

  const initialState = makeInitialState(colorIds);
  const totalOutcomeCount =
    BigInt(colorIds.length) ** BigInt(STATE_CODES.length);
  let remainingOutcomeCount = totalOutcomeCount;
  const eliminatedBranches = new WeakSet<WorkingState>();
  const snapshots: TraceSnapshot[] = [];
  const metrics: MutableMetrics = {
    assignments: 0,
    decisions: 0,
    domainReductions: 0,
    backtracks: 0,
    maxSearchDepth: 0,
  };
  let eventIndex = 0;
  let omittedEvents = 0;
  let searchLimitReached = false;
  let limitState: WorkingState | undefined;
  let limitStack: readonly SearchFrame[] = [];
  const searchTree: MutableSearchTreeDecision[] = [];
  const treeDecisionIndexes = new Map<string, number>();
  let nextDecisionId = 1;
  let nextBranchId = 1;
  let variableSelectionIndex = 0;

  const eliminateOutcomes = (count: bigint): void => {
    if (count < BigInt(0) || count > remainingOutcomeCount) {
      throw new Error("Solver outcome accounting invariant failed.");
    }
    remainingOutcomeCount -= count;
  };

  const eliminateActiveBranch = (state: WorkingState): void => {
    if (eliminatedBranches.has(state)) return;
    eliminatedBranches.add(state);
    eliminateOutcomes(activeBranchVolume(state));
  };

  const addTreeDecision = (
    state: StateCode,
    domain: readonly string[],
    stack: readonly SearchFrame[],
  ): string => {
    const id = `decision-${nextDecisionId++}`;
    const domainSet = new Set(domain);
    const optionsForDecision: MutableSearchTreeOption[] = colorIds.map(
      (colorId) =>
        domainSet.has(colorId)
          ? { colorId, status: "available" }
          : {
              colorId,
              status: "pruned",
              rejectionReason: "constraint",
            },
    );
    const parentBranchId = stack.at(-1)?.branchId;
    const decision: MutableSearchTreeDecision = {
      id,
      ...(parentBranchId ? { parentBranchId } : {}),
      state,
      depth: stack.length + 1,
      options: optionsForDecision,
    };
    treeDecisionIndexes.set(id, searchTree.length);
    searchTree.push(decision);
    return id;
  };

  const updateTreeOption = (
    decisionId: string,
    colorId: string,
    update: Partial<Pick<SearchTreeOption, "status" | "branchId" | "rejectionReason">>,
  ): void => {
    const decisionIndex = treeDecisionIndexes.get(decisionId);
    if (decisionIndex === undefined) return;
    const option = searchTree[decisionIndex].options.find(
      (candidate) => candidate.colorId === colorId,
    );
    if (option) Object.assign(option, update);
  };

  const markSolutionPath = (stack: readonly SearchFrame[]): void => {
    const solutionBranches = new Set(stack.map((frame) => frame.branchId));
    for (const decision of searchTree) {
      for (const option of decision.options) {
        if (option.branchId && solutionBranches.has(option.branchId)) {
          option.status = "solution";
        }
      }
    }
  };

  const emit = (
    state: WorkingState,
    stack: readonly SearchFrame[],
    context: EventContext,
    terminal = false,
  ): void => {
    const index = eventIndex++;
    if (!terminal && snapshots.length >= requestedCap - 1) {
      omittedEvents += 1;
      return;
    }
    if (terminal && snapshots.length >= requestedCap) snapshots.pop();
    snapshots.push(
      freezeSnapshot(
        index,
        state,
        stack,
        freezeSearchTree(searchTree, stack),
        propagationEnabled,
        totalOutcomeCount,
        remainingOutcomeCount,
        metrics,
        omittedEvents,
        context,
      ),
    );
  };

  const finalizeSnapshots = (): readonly TraceSnapshot[] => {
    const totalColorAttempts = metrics.decisions;
    const finalized = snapshots.map((snapshot): TraceSnapshot => {
      const finalizedMetrics: SolverMetrics = Object.freeze({
        ...snapshot.metrics,
        totalColorAttempts,
        remainingColorAttempts: Math.max(
          0,
          totalColorAttempts - snapshot.metrics.colorAttempts,
        ),
        runTerminatedByLimit: searchLimitReached,
      });
      return Object.freeze({ ...snapshot, metrics: finalizedMetrics });
    });
    return Object.freeze(finalized);
  };

  emit(initialState, [], {
    status: "ready",
    event: {
      type: "ready",
      title: "The map is ready",
      narration: `${STATE_CODES.length} states begin with ${colorIds.length} color${colorIds.length === 1 ? "" : "s"} in each domain. Constraint propagation is ${propagationEnabled ? "on" : "off"}; explicit choices scan ${directionLabel}.`,
      formal: `All domains = ${formatDomain(colorIds)}; propagation = ${propagationEnabled ? "on" : "off"}; traversal = ${traversalDirection}`,
    },
  });

  if (colorIds.length === 0) {
    const emptyState = STATE_CODES[0];
    emit(initialState, [], {
      status: "contradiction",
      currentState: emptyState,
      affectedState: emptyState,
      event: {
        type: "contradiction",
        title: `${STATE_NAMES[emptyState]} has no available color`,
        narration: "An empty palette leaves every state with an empty domain.",
        formal: `${emptyState} domain = {}`,
        state: emptyState,
        previousDomain: [],
        nextDomain: [],
      },
    });
    emit(
      initialState,
      [],
      {
        status: "unsatisfiable",
        event: {
          type: "unsatisfiable",
          title: "No coloring is possible",
          narration: "Search exhausted the selected palette. Add a color and try again.",
          formal: "No solution exists for 0 colors.",
        },
      },
      true,
    );
    return finalizeSnapshots();
  }

  const chooseVariable = (
    state: WorkingState,
  ): {
    state: StateCode;
    reason: "direction" | "learner" | "learner-unavailable";
    requestedState?: StateCode;
  } | undefined => {
    const decisionIndex = variableSelectionIndex;
    variableSelectionIndex += 1;
    const requestedState = interventionStates.get(decisionIndex);
    if (
      requestedState !== undefined &&
      state.assignments[requestedState] === undefined
    ) {
      return { state: requestedState, reason: "learner", requestedState };
    }

    for (const code of stateScanOrder) {
      if (state.assignments[code] !== undefined) continue;
      return requestedState
        ? { state: code, reason: "learner-unavailable", requestedState }
        : { state: code, reason: "direction" };
    }
    return undefined;
  };

  const findAssignedConflict = (
    state: WorkingState,
    variable: StateCode,
    colorId: string,
  ): StateCode | undefined =>
    ADJACENCY[variable].find(
      (neighbor) => state.assignments[neighbor] === colorId,
    );

  const emitAssignmentConflict = (
    state: WorkingState,
    variable: StateCode,
    colorId: string,
    conflict: StateCode,
    stack: readonly SearchFrame[],
  ): void => {
    eliminateActiveBranch(state);
    state.domains[variable] = [];
    emit(state, stack, {
      status: "contradiction",
      currentState: variable,
      affectedState: variable,
      event: {
        type: "contradiction",
        title: `${STATE_NAMES[variable]} conflicts with ${STATE_NAMES[conflict]}`,
        narration: `${STATE_NAMES[variable]} cannot use ${colorId}, because neighboring ${STATE_NAMES[conflict]} already uses it.`,
        formal: `${variable} = ${colorId} conflicts with ${conflict} = ${colorId}`,
        state: variable,
        causeState: conflict,
        colorId,
        previousDomain: [colorId],
        nextDomain: [],
      },
    });
  };

  const propagate = (
    state: WorkingState,
    startingState: StateCode,
    stack: readonly SearchFrame[],
  ): boolean => {
    const queue: StateCode[] = [startingState];
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const causeState = queue[queueIndex];
      const colorId = state.assignments[causeState];
      if (colorId === undefined) continue;

      for (const neighbor of ADJACENCY[causeState]) {
        const neighborAssignment = state.assignments[neighbor];
        if (neighborAssignment !== undefined) {
          if (neighborAssignment === colorId) {
            eliminateActiveBranch(state);
            state.domains[neighbor] = [];
            emit(state, stack, {
              status: "contradiction",
              currentState: causeState,
              affectedState: neighbor,
              event: {
                type: "contradiction",
                title: `${STATE_NAMES[causeState]} conflicts with ${STATE_NAMES[neighbor]}`,
                narration: `Both neighboring states are assigned ${colorId}, so this branch cannot work.`,
                formal: `${causeState} = ${colorId} and ${neighbor} = ${colorId}`,
                state: neighbor,
                causeState,
                colorId,
                previousDomain: [colorId],
                nextDomain: [],
              },
            });
            return false;
          }
          continue;
        }

        const previousDomain = state.domains[neighbor];
        if (!previousDomain.includes(colorId)) continue;
        const volumeBeforeReduction = activeBranchVolume(state);
        const nextDomain = previousDomain.filter((candidate) => candidate !== colorId);
        state.domains[neighbor] = nextDomain;
        eliminateOutcomes(
          volumeBeforeReduction - activeBranchVolume(state),
        );
        metrics.domainReductions += 1;
        emit(state, stack, {
          status: "searching",
          currentState: causeState,
          affectedState: neighbor,
          event: {
            type: "remove-color",
            title: `${STATE_NAMES[neighbor]} loses ${colorId}`,
            narration: `${STATE_NAMES[causeState]} uses ${colorId}, so neighboring ${STATE_NAMES[neighbor]} can no longer use it.`,
            formal: `${neighbor} domain: ${formatDomain(previousDomain)} → ${formatDomain(nextDomain)}`,
            state: neighbor,
            causeState,
            colorId,
            previousDomain,
            nextDomain,
          },
        });

        if (nextDomain.length === 0) {
          emit(state, stack, {
            status: "contradiction",
            currentState: causeState,
            affectedState: neighbor,
            event: {
              type: "contradiction",
              title: `${STATE_NAMES[neighbor]} has no available color`,
              narration: `Removing ${colorId} emptied ${STATE_NAMES[neighbor]}'s domain, so this branch cannot work.`,
              formal: `${neighbor} domain = {}`,
              state: neighbor,
              causeState,
              colorId,
              previousDomain,
              nextDomain,
            },
          });
          return false;
        }

        if (nextDomain.length === 1) {
          const forcedColor = nextDomain[0];
          const forcedConflict = findAssignedConflict(
            state,
            neighbor,
            forcedColor,
          );
          if (forcedConflict) {
            emitAssignmentConflict(
              state,
              neighbor,
              forcedColor,
              forcedConflict,
              stack,
            );
            return false;
          }
          state.assignments[neighbor] = forcedColor;
          metrics.assignments += 1;
          emit(state, stack, {
            status: "searching",
            currentState: neighbor,
            affectedState: neighbor,
            event: {
              type: "forced-assignment",
              title: `${STATE_NAMES[neighbor]} is forced to use ${forcedColor}`,
              narration: `${STATE_NAMES[neighbor]} has only one color left, so propagation assigns it automatically.`,
              formal: `${neighbor} = ${forcedColor} because domain = ${formatDomain(nextDomain)}`,
              state: neighbor,
              causeState,
              colorId: forcedColor,
              previousDomain: nextDomain,
              nextDomain,
            },
          });
          queue.push(neighbor);
        }
      }
    }
    return true;
  };

  const search = (
    state: WorkingState,
    stack: readonly SearchFrame[],
  ): WorkingState | undefined => {
    const selection = chooseVariable(state);
    if (selection === undefined) {
      markSolutionPath(stack);
      emit(
        state,
        stack,
        {
          status: "solved",
          event: {
            type: "solved",
            title: "Every state is colored",
            narration: `The map is solved with ${colorIds.length} available color${colorIds.length === 1 ? "" : "s"}.`,
            formal: `Assigned ${STATE_CODES.length} of ${STATE_CODES.length} variables.`,
          },
        },
        true,
      );
      return state;
    }

    const variable = selection.state;

    const candidates = [...state.domains[variable]];
    const decisionId = addTreeDecision(variable, candidates, stack);
    emit(state, stack, {
      status: "searching",
      currentState: variable,
      event: {
        type: "select-variable",
        title: `${STATE_NAMES[variable]} is selected next`,
        narration: selection.reason === "learner"
          ? `Human guidance asks the search to rethink ${STATE_NAMES[variable]} now. The ${directionLabel} scan resumes after this decision.`
          : selection.reason === "learner-unavailable" && selection.requestedState
            ? `Human guidance requested ${STATE_NAMES[selection.requestedState]}, but propagation already assigned it. Search continues ${directionLabel} with ${STATE_NAMES[variable]}.`
            : `${STATE_NAMES[variable]} is the next unassigned state in the ${directionLabel} scan.`,
        formal: selection.reason === "learner"
          ? `Human guidance selects ${variable} with domain ${formatDomain(candidates)}`
          : selection.reason === "learner-unavailable" && selection.requestedState
            ? `Requested ${selection.requestedState} unavailable; ${traversalDirection} selects ${variable}`
            : `${traversalDirection} selects ${variable} with domain ${formatDomain(candidates)}`,
        state: variable,
        selectionReason: selection.reason,
        requestedState: selection.requestedState,
        previousDomain: candidates,
        nextDomain: candidates,
      },
    });

    for (const colorId of candidates) {
      if (metrics.decisions >= maxColorAttempts) {
        searchLimitReached = true;
        limitState = cloneState(state);
        limitStack = [...stack];
        return undefined;
      }

      const branch = cloneState(state);
      branch.assignments[variable] = colorId;
      branch.domains[variable] = [colorId];
      metrics.assignments += 1;
      metrics.decisions += 1;
      const branchId = `branch-${nextBranchId++}`;
      updateTreeOption(decisionId, colorId, {
        status: "active",
        branchId,
        rejectionReason: undefined,
      });
      const activeFrame: SearchFrame = Object.freeze({
        state: variable,
        colorId,
        color: colorId,
        branchId,
        depth: stack.length + 1,
        status: "active",
      });
      const branchStack = [...stack, activeFrame];
      metrics.maxSearchDepth = Math.max(metrics.maxSearchDepth, branchStack.length);

      const explicitConflict = findAssignedConflict(branch, variable, colorId);
      let branchConsistent = explicitConflict === undefined;
      if (explicitConflict) {
        emitAssignmentConflict(
          branch,
          variable,
          colorId,
          explicitConflict,
          branchStack,
        );
      } else {
        emit(branch, branchStack, {
          status: "searching",
          currentState: variable,
          event: {
            type: "try-color",
            title: `${STATE_NAMES[variable]} tries ${colorId}`,
            narration: "Depth-first search tries the first remaining color in palette order.",
            formal: `${variable} ← ${colorId}`,
            state: variable,
            colorId,
            previousDomain: candidates,
            nextDomain: [colorId],
          },
        });
        if (propagationEnabled) {
          branchConsistent = propagate(branch, variable, branchStack);
        }
      }
      let rejectionReason: SearchTreeRejectionReason = "contradiction";
      if (branchConsistent) {
        const solved = search(branch, branchStack);
        if (solved) return solved;
        if (searchLimitReached) return undefined;
        rejectionReason = "exhausted";
      }

      updateTreeOption(decisionId, colorId, {
        status: "rejected",
        rejectionReason,
      });
      metrics.backtracks += 1;
      const backtrackedStack: SearchFrame[] = [
        ...stack,
        Object.freeze({ ...activeFrame, status: "backtracked" as const }),
      ];
      emit(state, backtrackedStack, {
        status: "backtracking",
        currentState: variable,
        event: {
          type: "backtrack",
          title: `Backtrack from ${STATE_NAMES[variable]} = ${colorId}`,
          narration: "That choice failed, so search restores the earlier domains and tries the next color.",
          formal: `Undo ${variable} ← ${colorId}`,
          state: variable,
          colorId,
          previousDomain: [colorId],
          nextDomain: candidates,
        },
      });
    }
    return undefined;
  };

  const solvedState = search(initialState, []);
  if (!solvedState && searchLimitReached) {
    emit(
      limitState ?? initialState,
      limitStack,
      {
        status: "limit-reached",
        currentState: limitStack.at(-1)?.state,
        event: {
          type: "limit-reached",
          title: "Search paused at the safety limit",
          narration: `This run tried ${maxColorAttempts.toLocaleString()} colors without finishing. It is not an unsatisfiability proof.`,
          formal: `Stopped after ${maxColorAttempts} try-color events.`,
        },
      },
      true,
    );
  } else if (!solvedState) {
    if (remainingOutcomeCount !== BigInt(0)) {
      throw new Error(
        "Exhaustive unsatisfiable search left uneliminated outcomes.",
      );
    }
    emit(
      initialState,
      [],
      {
        status: "unsatisfiable",
        event: {
          type: "unsatisfiable",
          title: "No coloring is possible",
          narration: "Depth-first search exhausted every branch. Add a color and try again.",
          formal: `No solution exists for ${colorIds.length} color${colorIds.length === 1 ? "" : "s"}.`,
        },
      },
      true,
    );
  }

  return finalizeSnapshots();
}

export { ADJACENCY, STATE_CODES, STATE_NAMES, type StateCode } from "./map-data";
