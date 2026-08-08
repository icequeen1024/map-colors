# Map Colors

Map Colors is an interactive lesson about constraint propagation and depth-first search. It turns the U.S. map-coloring problem into a step-by-step visual trace: each state exposes its remaining color domain, assignments propagate to neighboring states, contradictions are explained, and abandoned branches remain visible in the DFS tree below the map.

The product behavior and acceptance criteria live in [SPEC.md](./SPEC.md).

## What the lesson shows

- State = variable
- Available colors = domain
- Shared land border = “not equal” constraint
- Assigning a color removes it from each unassigned neighbor
- Empty domains trigger backtracking
- A palette can be changed without changing the solver implementation

The 50-state graph includes Alaska and Hawaii as isolated states and omits the District of Columbia. Search is deterministic: explicit DFS choices scan the displayed map from top to bottom or bottom to top, then try colors in palette order. Constraint propagation may assign states ahead of that scan.

## Controls

- **Run / Pause** plays the generated solver trace.
- **Step** advances one educational event.
- **Back** revisits the previous snapshot.
- **Reset** restores every domain.
- **Speed** changes playback timing without changing the trace.
- **Constraint propagation ON/OFF** resets and reruns the same deterministic search so its workload can be compared fairly.
- **State order** switches between top-down and bottom-up map scans.
- **Human guidance** lets a learner select an unassigned state and ask the solver to rethink it at the next explicit decision. The request changes one choice only, then the selected map order resumes.
- **Assign a color** lets a learner fix a selected state to a palette color. Fixed states are visibly locked, respected by every search branch, and can be recolored, cleared individually, or cleared together. Colors that would conflict with a fixed neighbor are disabled.
- **Palette controls** add or remove colors and regenerate the trace.
- **Presets** provide quick ways to compare constrained and unconstrained searches.

An actual branching, 50-state-capable DFS tree sits directly below the map and remains synchronized with the current snapshot. It connects each decision to its separate color options and descendant decisions inside a limited-height, two-directional scroll pane that automatically follows the active branch. A compact sticky monitor keeps remaining search space, solver status, propagation mode, and speed visible. Select any state to inspect its assignment, complete domain, and neighbors in an optional details sidebar; the sidebar is collapsed by default so the map-and-tree area can expand. Rejected and constraint-pruned color branches remain visible with crossed-out labels.

## Remaining search space

This teaching metric is the exact number of complete color assignments to all 50 states that have not yet been eliminated. With `k` colors, a fresh run begins at `k^50`. The value can only stay level or decrease: domain reductions remove every complete assignment that depends on the removed option, and contradictions remove the remaining outcome volume beneath that branch. Merely trying a DFS branch does not eliminate its untried siblings.

Remaining search space is not a future-event count, runtime estimate, percentage complete, or count of valid solutions. Large values are summarized in scientific notation while the exact grouped integer remains available visually and to assistive technology. A solver-attempt cap may stop an intentionally expensive run to keep the browser responsive, but that cap is only an execution safeguard and never defines the workload metric.

Beside the count, **Human check time** translates the same remaining outcome space into years at a deliberately simple classroom rate: one complete assignment checked every second, continuously, using a 365.25-day year. The estimate updates from the exact count and is a human-scale comparison, not a prediction of solver or computer runtime.

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

## GitHub Pages deployment

Pushes to `main` run [the Pages workflow](./.github/workflows/deploy-pages.yml). It verifies the lesson, creates a static Vite bundle with the `/map-colors` repository prefix, and publishes `dist/client` to:

[Open Map Colors](https://icequeen1024.github.io/map-colors/)

The repository’s **Settings → Pages → Build and deployment → Source** must be set to **GitHub Actions**. To inspect the exact deployment artifact locally:

```bash
PAGES_BASE_PATH=/map-colors npm run build:pages
npm run test:pages
```

Local development remains available at `/`; the repository prefix is applied only to the Pages build. Visitors use the complete application directly at the GitHub Pages URL—no download, installation, account, or server runtime is required.

## Project structure

- `app/` — teaching interface, responsive styles, and U.S. map visualization
- `lib/` — state metadata, adjacency graph, and pure solver trace generation
- `tests/` — solver, data, and rendered-page checks
- `public/` — static social and icon assets
- `.github/workflows/deploy-pages.yml` — verified static export and GitHub Pages deployment

No account, runtime map service, database, or external API is needed. The finished lesson runs entirely from bundled assets and client-side state.
