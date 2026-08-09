# Map Colors — Product Specification

## 1. Product statement

Map Colors is an interactive teaching page for learning constraint propagation through the classic United States map-coloring problem. It should make the invisible parts of a constraint-satisfaction solver visible: every state's remaining color domain, each constraint-driven elimination, the depth-first search stack, contradictions, and backtracking.

The page is a deterministic, self-contained lesson rather than a general-purpose graph editor. It uses the 50 U.S. states, with Alaska and Hawaii shown as insets and treated as having no land-border neighbors. The District of Columbia is not included.

## 2. Learning outcomes

After using the page, a learner should be able to explain:

1. A state is a variable, colors are its domain, and shared borders create “not equal” constraints.
2. Assigning one state removes that color from each unassigned neighbor's domain.
3. Propagation can force assignments or reveal a contradiction before the entire map is colored.
4. Depth-first search explores one branch at a time and backtracks when a domain becomes empty.
5. The number of available colors changes whether a valid coloring exists and how much search is required.
6. Constraint propagation can eliminate entire families of complete assignments before depth-first search visits them.
7. Variable order changes the shape of a depth-first search, and a human can deliberately redirect one decision without making the solver random.
8. A learner-supplied state color is a fixed constraint: it immediately removes incompatible complete outcomes and, with propagation enabled, removes that color from neighboring domains.

## 3. Audience and tone

- Primary audience: students, teachers, and curious programmers with no prior constraint-programming experience.
- Tone: visual, direct, and encouraging. Prefer plain-language narration (“Virginia can no longer use blue”) with the formal term nearby (“domain reduced”).
- The experience must remain understandable without reading source code or opening developer tools.

## 4. Core model

- **Variables:** the 50 U.S. states.
- **Domains:** an array of user-configurable colors. The solver must be driven by the palette array, not by hardcoded cases for three or four colors.
- **Constraints:** states that share a land boundary must have different assigned colors. Corner-only contact does not count. Alaska and Hawaii have no graph edges.
- **Search:** deterministic depth-first backtracking search.
- **Propagation:** after a tentative assignment, remove that color from every unassigned neighbor. Continue through the resulting forced assignments until stable or until a domain is empty.
- **Immediate conflict invariant:** before emitting any later assignment event, validate every explicit or forced assignment against all already assigned neighbors. An equal-colored adjacent pair must produce the contradiction immediately; it may never remain visible while unrelated states are assigned.
- **Comparison mode:** the learner can turn constraint propagation on or off. Both modes use the same variable ordering, value ordering, palette, and validity checks so the visible difference in search work is attributable to propagation. Changing modes resets to the deterministic start of the corresponding trace.
- **Variable ordering:** explicit DFS choices follow a learner-selected geographic scan of the displayed map: top-to-bottom or bottom-to-top, with stable horizontal ordering inside each row. Propagation may assign states ahead of the scan. The optional details sidebar must name the active rule.
- **Human guidance:** selecting a state remains inspection-only. A separate “Rethink this state next” action may replace exactly one upcoming explicit DFS variable choice if that state is still unassigned. The intervention is recorded in the trace, deterministic replay preserves it, and the geographic scan resumes immediately afterward. If propagation assigns the requested state before that decision, the trace explains why the request was skipped.
- **Human-fixed assignments:** after selecting a state, the learner may explicitly fix it to any palette color that does not conflict with an already fixed neighbor. Fixed assignments are visible as locks, remain unchanged across every DFS branch, and are replayed as educational events before ordinary search resumes. A learner may recolor or clear an individual fixed state, or clear all fixed states. Changing a fixed assignment pauses and restarts the trace so the map, DFS tree, and exact outcome count remain synchronized.
- **Value ordering:** palette order, left to right, so a reset followed by Run always produces the same trace.
- **Remaining search space:** the exact number of complete assignments of colors to all 50 states that have not yet been eliminated by constraints or search evidence. With `k` available colors, a fresh run starts at `k^50`; this is an outcome-space measure, not a count of future solver events or an estimate of runtime.
- **Completion states:** solved, unsatisfiable for the selected palette, paused, or ready.

The solver should be implemented as a pure step generator/state machine. Each educationally meaningful action is its own event, such as `select-variable`, `try-color`, `remove-color`, `forced-assignment`, `contradiction`, `backtrack`, and `solved`. Separating solver events from animation timing makes Run, Pause, Step, speed changes, tests, and reduced motion reliable.

## 5. Page structure

### 5.1 Header and framing

- Product name: **Map Colors**.
- Short promise: “Watch constraints travel across the map.”
- A compact three-part concept key: **State = variable**, **dots = available colors**, **border = constraint**.
- A brief “How to read this” affordance that points to the map, domain dots, and search stack without blocking the page.

### 5.2 Main teaching canvas

The primary viewport should prioritize the map, not generic dashboard chrome.

- A recognizable contiguous U.S. map with Alaska and Hawaii insets.
- State shapes are visibly separated and have accessible names.
- Every state demonstrates its current domain directly on or immediately adjacent to its shape:
  - unassigned states show small color dots for colors still available;
  - removed colors disappear or become crossed/faded during the removal animation;
  - assigned states use a solid fill and a clear check/lock treatment;
  - if the palette is too large to fit, the map shows the first dots plus a `+N` indicator while the state inspector shows the complete domain.
- The currently selected state has a high-contrast focus ring.
- The state being tried, affected neighbors, forced states, and contradicted state use distinct, redundant treatments (color plus outline/icon/label), not color alone.
- Clicking, tapping, or keyboard-focusing a state opens its details without changing the solver. An adjacent, explicit guidance action is required to alter the next choice.
- Hover/focus reveals the state name, assigned value, full domain, and land-border neighbors.
- An actual branching depth-first-search tree sits directly below the map at every viewport width. Decision nodes connect to separate color-option branches and then to their descendant decisions, so the structure cannot collapse into a flat path ledger. The tree lives in a limited-height pane that scrolls in both directions and automatically follows the deepest active branch as the trace advances. The map and tree advance from the same snapshot so the current state, attempted color, contradiction, and backtrack are always synchronized.
- Every displayed solver event must produce a visible change inside the tree area, including events that do not create a DFS node. A compact current-step strip names the action; the complete root-to-current route is bold and colored by its chosen branches; the exact decision or color endpoint for the current event is outlined and tagged. Propagation reductions and forced assignments remain attached to the active DFS endpoint, contradictions mark the failing endpoint, and backtracking both crosses out the rejected choice and marks its endpoint with the distinct retreat color. Human-fixed assignments and other pre-search events use a visible “before DFS” node until the first decision exists.
- Each tree decision shows its color candidates in palette order. Tried candidates retain their outcome; rejected or pruned candidates are visibly crossed out with a text/icon cue, and the active candidate is highlighted without relying on color alone.
- The tree may window older abandoned branches to control memory, but it must preserve every level of the active root-to-leaf path, clearly indicate its current depth out of 50, retain the most recent abandoned branch, and keep parent/child connectors visible.

### 5.3 Control bar

The controls remain close to the map and are usable on touch screens.

- **Run / Pause**: starts and pauses automatic playback without resetting progress.
- **Step**: advances exactly one solver event while paused.
- **Back one step**: returns to the preceding recorded event for explanation and inspection; resuming from there continues deterministically.
- **Reset**: returns to the start of the deterministic trace with all domains full, then replays any learner-fixed assignments before ordinary DFS choices.
- **Speed slider**: labeled from “Explain” to “Fast,” with the current interval expressed accessibly. Speed changes take effect during a run.
- **Constraint propagation switch**: toggles propagation on/off, clearly labels the active mode, and regenerates the deterministic trace from the start for an honest comparison.
- **State-order switch**: chooses a top-to-bottom or bottom-to-top geographic scan. Changing direction pauses and resets the trace so the new ordering is unambiguous.
- **Human guidance**: after selecting an unassigned state, “Rethink [state] next” pauses playback and deterministically replaces the next explicit variable choice. A queued request can be canceled before it is applied; selection alone never changes search behavior.
- **Assign a color**: after selecting a state, a compact palette lets the learner fix, recolor, or clear that state. A color already fixed on a land-border neighbor is disabled with an explanation, and a “Clear all” action removes every learner-fixed color.
- **Palette control**: add or remove colors dynamically. Start with four visually distinct, color-vision-friendly colors. The engine accepts any palette length; the interface warns that very large palettes are visually compressed rather than changing solver semantics.
- **Preset buttons**: “Try 3 colors,” “Classic 4,” and “Show a backtrack” provide quick teaching entry points. A preset may set palette and deterministic starting conditions, but must use the same solver rather than a prerecorded fake animation.
- **Sticky monitor strip**: a compact strip remains visible while the learner uses the map or scrolls. It always shows the remaining search space, solver status, active propagation mode, and current playback speed. The speed value remains visible even when its slider is not.

Controls must disable only when their action is impossible and must expose an explanation through accessible text or a tooltip.

### 5.4 Optional details sidebar

Rich explanation and inspection tools live in a sidebar that is collapsed by default. Opening it must not cover the active map or DFS path, and collapsing it expands the main map-and-tree area to use the reclaimed width. The sticky monitor strip keeps essential status and speed visible when the sidebar is closed.

- Event heading, for example “Colorado tries coral.”
- One-sentence cause and effect, for example “Colorado borders Utah, so coral is removed from Utah’s options.”
- Formal annotation underneath, for example `UT domain: {coral, blue, gold} → {blue, gold}`.
- A compact legend explaining assigned, current, affected, forced, and contradiction states.
- A “Why this state?” disclosure explaining the active geographic direction, propagation assignments that occur ahead of the scan, and any one-decision human override.
- A selected-state inspector with the state name, assignment, complete domain, neighbor list, and which neighbors removed which colors.

### 5.5 Search and progress panel

- The visible DFS tree is the primary search view. Its current-step strip, bold colored route, outlined endpoint, and text tag must update on every Step event rather than only when the tree gains a node.
- Backtracked branches and rejected color candidates remain visible as struck-through or dimmed entries so the learner sees exactly what was abandoned.
- Counters for assignments, domain reductions, backtracks, and search depth.
- A prominent **remaining search space** number reports the exact count of complete 50-state color assignments that have not yet been eliminated. A fresh run with `k` palette colors starts at exactly `k^50`, including assignments that will later prove invalid.
- The metric is monotonic within a run: it may stay the same or decrease, but never increase. Removing a color from a state's domain eliminates the complete assignments that require that state/color pairing in the current search context; proving a branch contradictory eliminates that branch's full remaining outcome volume. The count must avoid double-counting outcomes already eliminated by an earlier reduction.
- Entering or trying a DFS branch does not by itself eliminate any outcome, and it must not make the number fall merely because that branch is being visited. Untried siblings remain in the count until constraints, contradiction, or exhaustive search actually rule them out. Consequently, stopping after finding one valid coloring may leave a nonzero remaining search space.
- This number is not a runtime forecast, completion percentage, future-event count, or count of solutions. The same definition is used with propagation on and off so learners can compare when each mode proves outcome volume impossible.
- Large values use a readable scientific-notation summary while preserving the exact integer. The exact value must be available visually on demand and in the control's accessible name or description, with grouped digits and a copyable representation where practical.
- Beside the remaining-space count, show an illustrative **human check time** for enumerating the same number of outcomes at one complete assignment per second, continuously. Express the duration in years using a 365.25-day year, keep the assumption visible, and update it from the exact remaining count. This human-scale comparison is not a prediction of solver or computer runtime.
- A fixed solver-attempt safety cap prevents intentionally difficult propagation-off runs from freezing the browser. It is only an execution safeguard and is never used to calculate or label remaining search space. If the cap is reached, the status must say that search stopped early and the displayed space reflects only eliminations proven so far; reaching the cap alone proves neither satisfiability nor unsatisfiability.
- The active propagation mode, solver status, and playback speed appear beside the remaining-space number in the sticky monitor strip so screenshots or classroom A/B demonstrations cannot be misread.
- Progress text that describes algorithm status; do not imply that percentage of colored states predicts remaining runtime.
- A scrollable event history with short entries lives in the optional details sidebar. Clicking a history entry inspects that snapshot without mutating the run until the user deliberately resumes from it.

### 5.6 Completion and contradiction states

- **Solved:** celebrate lightly, state the number of colors and search statistics, and keep the completed map inspectable.
- **Contradiction:** clearly show the empty domain, the assignments that caused it, and the next backtrack.
- **Unsatisfiable:** explain that search exhausted every branch for this palette and invite the learner to add a color.
- These messages appear inline; avoid blocking modals.

## 6. Visual direction

- Feel like an excellent classroom whiteboard refined into a modern interactive: warm paper background, ink-like text, crisp dark state boundaries, and vivid domain tokens.
- Use a responsive main canvas with the map dominant and the branching DFS tree in a bounded scroll pane directly beneath it. A default-collapsed details sidebar supplies explanation, history, and inspection without permanently shrinking the teaching canvas; the main area expands when it is closed.
- Use restrained motion: a short pulse travels from the assigned state to the neighbor, then the eliminated dot exits. Backtracking reverses/dims the abandoned decision. Motion communicates causality rather than decoration.
- Honor `prefers-reduced-motion` by removing travel and exit animation while preserving immediate state changes and narration.
- Do not rely on gradients, stock dashboard styling, or decorative imagery.

## 7. Accessibility

- Meet WCAG 2.2 AA contrast for text and controls.
- All controls and state shapes are keyboard reachable with visible focus.
- Each state exposes an accessible label containing its name, assignment status, and remaining color count.
- Domain colors have text names and stable symbols/numbers; meaning is never encoded by hue alone.
- Solver narration is announced through a polite live region while rapid playback avoids overwhelming screen readers (summarize batches at the fastest setting).
- The speed control, palette controls, counters, history, and remaining-search-space display expose programmatic labels. Scientific notation must not replace the exact remaining-space value for assistive technology.
- Touch targets are at least 44 by 44 CSS pixels where layout permits; map states may use an expanded invisible hit target or inspector list equivalent.

## 8. Responsive behavior

- **Wide (≥ 1100 px):** the map uses the expanded main canvas; the bounded DFS tree pane spans the same width immediately below it. The optional details sidebar opens alongside the canvas and is collapsed by default.
- **Medium (700–1099 px):** the map remains full width with the bounded DFS tree immediately below it; details open as an inline disclosure that does not obscure either view.
- **Small (< 700 px):** one column; the compact monitor and playback controls remain sticky; the map is horizontally contained without page-level horizontal scrolling; the tree pane becomes shorter but remains independently scrollable and follows the active branch; a searchable state list provides an accessible alternative for tiny shapes; optional details expand inline.

## 9. State and persistence

- No account, server database, or external API is required.
- Reset state is deterministic.
- The selected speed and palette may be saved in local storage as device-local preferences; solver progress need not persist across reloads.
- The page must work after its static assets load and must not require network access at runtime.

## 10. Technical shape

- React/TypeScript in the existing vinext project.
- Keep solver logic, U.S. adjacency data, and visual components separated.
- Calculate remaining search space with exact arbitrary-precision integer arithmetic. Scientific notation is a presentation derived from the exact value, never the stored source of truth.
- Use a vetted static U.S. map asset/data source with a compatible license, checked into the project or bundled as a dependency; do not call a map service at runtime.
- Keep map adjacency data explicit and testable. Add a validation test that every referenced state exists and every adjacency is symmetric.
- Solver tests must cover propagation, forced assignments, contradictions, deterministic stepping, backtracking, successful coloring, and unsatisfiable palettes.
- Component/render tests should verify the primary teaching labels and controls.
- Production output is a static export deployed through GitHub Pages for the repository. Asset URLs must honor the repository base path, and the project must not be created or deployed in ChatGPT Sites.

## 11. Acceptance criteria

The first version is complete when:

1. A learner can change the number of colors without reloading and the map domains update correctly.
2. Run, Pause, Step, Back, Reset, and speed controls behave consistently.
3. Every state visibly communicates remaining options, with the complete domain available through focus/click inspection.
4. Each propagation event identifies its cause and resulting domain change in plain language.
5. The actual branching depth-first tree and backtracking are visible below the map, synchronized with it, and capable of reaching all 50 levels through an auto-following limited-height scroll pane.
6. The 50-state constraint graph is valid and symmetric; solved runs contain no same-colored adjacent states, and any tentative adjacent-color conflict is contradicted before another assignment event.
7. The page clearly distinguishes solved, contradiction, backtracking, and unsatisfiable states.
8. The experience works with keyboard-only navigation, reduced motion, and small screens.
9. Automated tests and the production build pass.
10. Starter copy, starter preview code, and unused starter-only dependencies are removed; repository documentation describes the finished product and its commands.
11. The DFS tree is directly below the map, visibly connects decisions to color branches and descendants, auto-scrolls to the active branch, crosses out rejected/pruned candidates, and visibly responds to every solver event with a synchronized current-step label, highlighted endpoint, and bold colored route.
12. A learner can switch constraint propagation on/off and compare the same exact remaining-search-space metric, which starts at `k^50`, never increases, and does not decrease merely because a branch is tried.
13. The static production site is delivered through GitHub Pages, with no ChatGPT Sites project binding in the repository.
14. A compact sticky monitor keeps remaining search space, solver status, propagation mode, and speed visible while the default-collapsed details sidebar allows the main map-and-tree area to expand.
15. Explicit DFS choices visibly follow the selected top-down or bottom-up map order, and a learner can redirect exactly one upcoming choice by selecting an unassigned state and invoking the separate rethink action.
16. A learner can fix colors on specific states, see those states visibly locked, recolor or clear them, and observe the exact outcome space and neighboring domains respond before DFS continues; directly conflicting neighboring fixed colors cannot be entered.

## 12. Out of scope for the first version

- Editing the state adjacency graph.
- Comparing multiple search algorithms side by side.
- User accounts, cloud saves, leaderboards, or classrooms.
- Territories, counties, or international maps.
- Formal proof visualization beyond the DFS stack and domain history.

These are suitable follow-ons after the core teaching interaction is proven.
