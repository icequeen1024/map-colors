import { ADJACENCY, STATE_CODES, STATE_NAMES, type StateCode } from "./map-data";

export type SolverStatus =
  | "ready"
  | "searching"
  | "contradiction"
  | "backtracking"
  | "solved"
  | "unsatisfiable";

export type SolverEventType =
  | "ready"
  | "select-variable"
  | "try-color"
  | "remove-color"
  | "forced-assignment"
  | "contradiction"
  | "backtrack"
  | "solved"
  | "unsatisfiable";

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
}

export interface SearchFrame {
  readonly state: StateCode;
  readonly colorId: string;
  /** Concise UI alias for colorId. */
  readonly color: string;
  readonly depth: number;
  readonly status: "active" | "backtracked";
}

export interface SolverMetrics {
  /** All attempted and forced assignments, including abandoned branches. */
  readonly assignments: number;
  readonly decisions: number;
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
}

export interface TraceSnapshot {
  readonly index: number;
  readonly status: SolverStatus;
  readonly event: SolverEvent;
  readonly assignments: Readonly<Partial<Record<StateCode, string>>>;
  readonly domains: Readonly<Record<StateCode, readonly string[]>>;
  readonly stack: readonly SearchFrame[];
  readonly metrics: SolverMetrics;
  readonly currentState?: StateCode;
  readonly affectedState?: StateCode;
}

export interface GenerateTraceOptions {
  /**
   * Maximum retained snapshots. Search still completes after the cap and the
   * terminal snapshot is always retained. This bounds memory for small,
   * unsatisfiable palettes without changing solver semantics.
   */
  readonly maxSnapshots?: number;
}

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

type SolverEventInput = Omit<SolverEvent, "description" | "source">;

interface EventContext {
  status: SolverStatus;
  event: SolverEventInput;
  currentState?: StateCode;
  affectedState?: StateCode;
}

const DEFAULT_MAX_SNAPSHOTS = 30_000;
const STATE_CODES_BY_ABBREVIATION = Object.freeze(
  [...STATE_CODES].sort((left, right) => left.localeCompare(right)),
);

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

function freezeSnapshot(
  index: number,
  state: WorkingState,
  stack: readonly SearchFrame[],
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
    stack.map((frame) =>
      Object.freeze({ ...frame, color: frame.colorId }),
    ),
  );
  const searchDepth = stack.filter((frame) => frame.status === "active").length;
  const frozenMetrics = Object.freeze({
    assignments: metrics.assignments,
    decisions: metrics.decisions,
    domainReductions: metrics.domainReductions,
    reductions: metrics.domainReductions,
    backtracks: metrics.backtracks,
    searchDepth,
    depth: searchDepth,
    maxSearchDepth: metrics.maxSearchDepth,
    maxDepth: metrics.maxSearchDepth,
    omittedEvents,
  });

  return Object.freeze({
    index,
    status: context.status,
    event,
    assignments,
    domains: Object.freeze(domains),
    stack: frozenStack,
    metrics: frozenMetrics,
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

/**
 * Generate the complete deterministic teaching trace for a palette.
 *
 * The returned value and every nested snapshot collection are frozen. The
 * algorithm uses MRV, state-code tie-breaking, palette-order values, forward
 * propagation, singleton forcing, and depth-first backtracking.
 */
export function generateTrace(
  colorIds: readonly string[],
  options: GenerateTraceOptions = {},
): readonly TraceSnapshot[] {
  validatePalette(colorIds);
  const requestedCap = options.maxSnapshots ?? DEFAULT_MAX_SNAPSHOTS;
  if (!Number.isInteger(requestedCap) || requestedCap < 2) {
    throw new RangeError("maxSnapshots must be an integer of at least 2.");
  }

  const initialState = makeInitialState(colorIds);
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
      freezeSnapshot(index, state, stack, metrics, omittedEvents, context),
    );
  };

  emit(initialState, [], {
    status: "ready",
    event: {
      type: "ready",
      title: "The map is ready",
      narration: `${STATE_CODES.length} states begin with ${colorIds.length} color${colorIds.length === 1 ? "" : "s"} in each domain.`,
      formal: `All domains = ${formatDomain(colorIds)}`,
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
    return Object.freeze(snapshots);
  }

  const chooseVariable = (state: WorkingState): StateCode | undefined => {
    let selected: StateCode | undefined;
    let smallestDomain = Number.POSITIVE_INFINITY;
    for (const code of STATE_CODES_BY_ABBREVIATION) {
      if (state.assignments[code] !== undefined) continue;
      const domainSize = state.domains[code].length;
      if (domainSize < smallestDomain) {
        selected = code;
        smallestDomain = domainSize;
      }
    }
    return selected;
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
            // This branch is already inconsistent. Empty the displayed domain
            // in its final snapshot so the contradiction is visually explicit.
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
        const nextDomain = previousDomain.filter((candidate) => candidate !== colorId);
        state.domains[neighbor] = nextDomain;
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
    const variable = chooseVariable(state);
    if (variable === undefined) {
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

    const candidates = [...state.domains[variable]];
    emit(state, stack, {
      status: "searching",
      currentState: variable,
      event: {
        type: "select-variable",
        title: `${STATE_NAMES[variable]} is selected next`,
        narration: `${STATE_NAMES[variable]} has the fewest remaining colors; abbreviation breaks any tie.`,
        formal: `MRV selects ${variable} with domain ${formatDomain(candidates)}`,
        state: variable,
        previousDomain: candidates,
        nextDomain: candidates,
      },
    });

    for (const colorId of candidates) {
      const branch = cloneState(state);
      branch.assignments[variable] = colorId;
      branch.domains[variable] = [colorId];
      metrics.assignments += 1;
      metrics.decisions += 1;
      const activeFrame: SearchFrame = Object.freeze({
        state: variable,
        colorId,
        color: colorId,
        depth: stack.length + 1,
        status: "active",
      });
      const branchStack = [...stack, activeFrame];
      metrics.maxSearchDepth = Math.max(metrics.maxSearchDepth, branchStack.length);

      emit(branch, branchStack, {
        status: "searching",
        currentState: variable,
        event: {
          type: "try-color",
          title: `${STATE_NAMES[variable]} tries ${colorId}`,
          narration: `Depth-first search tries the first remaining color in palette order.`,
          formal: `${variable} ← ${colorId}`,
          state: variable,
          colorId,
          previousDomain: candidates,
          nextDomain: [colorId],
        },
      });

      if (propagate(branch, variable, branchStack)) {
        const solved = search(branch, branchStack);
        if (solved) return solved;
      }

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
          narration: `That choice led to a contradiction, so search restores the earlier domains and tries the next color.`,
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
  if (!solvedState) {
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

  return Object.freeze(snapshots);
}

export { ADJACENCY, STATE_CODES, STATE_NAMES, type StateCode } from "./map-data";
