# Map Colors

Map Colors is an interactive lesson about constraint propagation and depth-first search. It turns the U.S. map-coloring problem into a step-by-step visual trace: each state exposes its remaining color domain, assignments propagate to neighboring states, contradictions are explained, and abandoned branches remain visible in the DFS stack.

The product behavior and acceptance criteria live in [SPEC.md](./SPEC.md).

## What the lesson shows

- State = variable
- Available colors = domain
- Shared land border = “not equal” constraint
- Assigning a color removes it from each unassigned neighbor
- Empty domains trigger backtracking
- A palette can be changed without changing the solver implementation

The 50-state graph includes Alaska and Hawaii as isolated states and omits the District of Columbia. Search is deterministic: it uses minimum remaining values with state abbreviation as the tie-breaker, then tries colors in palette order.

## Controls

- **Run / Pause** plays the generated solver trace.
- **Step** advances one educational event.
- **Back** revisits the previous snapshot.
- **Reset** restores every domain.
- **Speed** changes playback timing without changing the trace.
- **Palette controls** add or remove colors and regenerate the trace.
- **Presets** provide quick ways to compare constrained and unconstrained searches.

Select any state on the map to inspect its assignment, complete domain, and neighbors. The explanation, event history, metrics, and DFS stack stay synchronized with the current snapshot.

## Local development

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

## Verification

```bash
npm test
npm run lint
npm run build
```

The tests validate rendered teaching content, the U.S. adjacency graph, deterministic solver behavior, propagation, backtracking, and valid completed colorings.

## Project structure

- `app/` — teaching interface, responsive styles, and U.S. map visualization
- `lib/` — state metadata, adjacency graph, and pure solver trace generation
- `tests/` — solver, data, and rendered-page checks
- `public/` — static social and icon assets
- `.openai/hosting.json` — Sites hosting configuration (no database or object storage required)

No account, runtime map service, database, or external API is needed. The finished lesson runs entirely from bundled assets and client-side state.
