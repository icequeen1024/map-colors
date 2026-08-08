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
- **Variable ordering:** minimum remaining values (smallest domain first), with state abbreviation as the stable tie-breaker. The explanation panel must name this rule.
- **Value ordering:** palette order, left to right, so a reset followed by Run always produces the same trace.
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
- Clicking, tapping, or keyboard-focusing a state opens its details without changing the solver.
- Hover/focus reveals the state name, assigned value, full domain, and land-border neighbors.

### 5.3 Control bar

The controls remain close to the map and are usable on touch screens.

- **Run / Pause**: starts and pauses automatic playback without resetting progress.
- **Step**: advances exactly one solver event while paused.
- **Back one step**: returns to the preceding recorded event for explanation and inspection; resuming from there continues deterministically.
- **Reset**: returns to all states unassigned with full domains.
- **Speed slider**: labeled from “Explain” to “Fast,” with the current interval expressed accessibly. Speed changes take effect during a run.
- **Palette control**: add or remove colors dynamically. Start with four visually distinct, color-vision-friendly colors. The engine accepts any palette length; the interface warns that very large palettes are visually compressed rather than changing solver semantics.
- **Preset buttons**: “Try 3 colors,” “Classic 4,” and “Show a backtrack” provide quick teaching entry points. A preset may set palette and deterministic starting conditions, but must use the same solver rather than a prerecorded fake animation.

Controls must disable only when their action is impossible and must expose an explanation through accessible text or a tooltip.

### 5.4 Explanation panel

A persistent panel translates the current event into plain language.

- Event heading, for example “Colorado tries coral.”
- One-sentence cause and effect, for example “Colorado borders Utah, so coral is removed from Utah’s options.”
- Formal annotation underneath, for example `UT domain: {coral, blue, gold} → {blue, gold}`.
- A compact legend explaining assigned, current, affected, forced, and contradiction states.
- A “Why this state?” disclosure explaining minimum remaining values and the tie-breaker.
- A selected-state inspector with the state name, assignment, complete domain, neighbor list, and which neighbors removed which colors.

### 5.5 Search and progress panel

- A visible depth-first search stack, newest decision first, showing state abbreviation and attempted color.
- Backtracked frames remain briefly visible as struck-through or dimmed entries so the learner sees the branch being abandoned.
- Counters for assignments, domain reductions, backtracks, and search depth.
- Progress text that describes algorithm status; do not imply that percentage of colored states predicts remaining runtime.
- A scrollable event history with short entries. Clicking a history entry inspects that snapshot without mutating the run until the user deliberately resumes from it.

### 5.6 Completion and contradiction states

- **Solved:** celebrate lightly, state the number of colors and search statistics, and keep the completed map inspectable.
- **Contradiction:** clearly show the empty domain, the assignments that caused it, and the next backtrack.
- **Unsatisfiable:** explain that search exhausted every branch for this palette and invite the learner to add a color.
- These messages appear inline; avoid blocking modals.

## 6. Visual direction

- Feel like an excellent classroom whiteboard refined into a modern interactive: warm paper background, ink-like text, crisp dark state boundaries, and vivid domain tokens.
- Use a responsive two-column desktop layout with the map dominant and the explanation/search panel secondary. Stack controls, map, explanation, and search history on narrow screens.
- Use restrained motion: a short pulse travels from the assigned state to the neighbor, then the eliminated dot exits. Backtracking reverses/dims the abandoned decision. Motion communicates causality rather than decoration.
- Honor `prefers-reduced-motion` by removing travel and exit animation while preserving immediate state changes and narration.
- Do not rely on gradients, stock dashboard styling, or decorative imagery.

## 7. Accessibility

- Meet WCAG 2.2 AA contrast for text and controls.
- All controls and state shapes are keyboard reachable with visible focus.
- Each state exposes an accessible label containing its name, assignment status, and remaining color count.
- Domain colors have text names and stable symbols/numbers; meaning is never encoded by hue alone.
- Solver narration is announced through a polite live region while rapid playback avoids overwhelming screen readers (summarize batches at the fastest setting).
- The speed control, palette controls, counters, and history expose programmatic labels.
- Touch targets are at least 44 by 44 CSS pixels where layout permits; map states may use an expanded invisible hit target or inspector list equivalent.

## 8. Responsive behavior

- **Wide (≥ 1100 px):** map and controls occupy roughly two thirds; explanation and stack occupy one third.
- **Medium (700–1099 px):** map remains full width, with explanation and stack in a two-column row below.
- **Small (< 700 px):** one column; sticky compact playback controls; the map is horizontally contained without requiring page-level horizontal scrolling; a searchable state list provides an accessible alternative for tiny shapes.

## 9. State and persistence

- No account, server database, or external API is required.
- Reset state is deterministic.
- The selected speed and palette may be saved in local storage as device-local preferences; solver progress need not persist across reloads.
- The page must work after its static assets load and must not require network access at runtime.

## 10. Technical shape

- React/TypeScript in the existing vinext project.
- Keep solver logic, U.S. adjacency data, and visual components separated.
- Use a vetted static U.S. map asset/data source with a compatible license, checked into the project or bundled as a dependency; do not call a map service at runtime.
- Keep map adjacency data explicit and testable. Add a validation test that every referenced state exists and every adjacency is symmetric.
- Solver tests must cover propagation, forced assignments, contradictions, deterministic stepping, backtracking, successful coloring, and unsatisfiable palettes.
- Component/render tests should verify the primary teaching labels and controls.

## 11. Acceptance criteria

The first version is complete when:

1. A learner can change the number of colors without reloading and the map domains update correctly.
2. Run, Pause, Step, Back, Reset, and speed controls behave consistently.
3. Every state visibly communicates remaining options, with the complete domain available through focus/click inspection.
4. Each propagation event identifies its cause and resulting domain change in plain language.
5. The depth-first stack and backtracking are visible and synchronized with the map.
6. The 50-state constraint graph is valid, symmetric, and produces no same-colored adjacent states in a solved run.
7. The page clearly distinguishes solved, contradiction, backtracking, and unsatisfiable states.
8. The experience works with keyboard-only navigation, reduced motion, and small screens.
9. Automated tests and the production build pass.
10. Starter copy, starter preview code, and unused starter-only dependencies are removed; repository documentation describes the finished product and its commands.

## 12. Out of scope for the first version

- Editing the state adjacency graph.
- Comparing multiple search algorithms side by side.
- User accounts, cloud saves, leaderboards, or classrooms.
- Territories, counties, or international maps.
- Formal proof visualization beyond the DFS stack and domain history.

These are suitable follow-ons after the core teaching interaction is proven.
