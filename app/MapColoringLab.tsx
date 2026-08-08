"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ADJACENCY,
  STATE_CODES,
  STATE_NAMES,
  generateTrace,
  type StateCode,
} from "@/lib/solver";
import { USMap } from "./components/USMap";
import "./map-coloring-lab.css";

export type PaletteColor = {
  id: string;
  name: string;
  hex: string;
  symbol: string;
};

const STARTER_PALETTE: PaletteColor[] = [
  { id: "coral", name: "Coral", hex: "#e76f51", symbol: "C" },
  { id: "teal", name: "Teal", hex: "#238477", symbol: "T" },
  { id: "gold", name: "Gold", hex: "#d49b18", symbol: "G" },
  { id: "blue", name: "Blue", hex: "#4776ba", symbol: "B" },
];

const EXTRA_COLORS = [
  ["Plum", "#8b5ca5"],
  ["Rose", "#c85f7c"],
  ["Mint", "#63a860"],
  ["Sienna", "#9a6846"],
  ["Sky", "#3398bd"],
  ["Olive", "#7b8237"],
] as const;

const SPEEDS = [
  { label: "Explain", interval: 1600 },
  { label: "Thoughtful", interval: 1000 },
  { label: "Steady", interval: 650 },
  { label: "Quick", interval: 350 },
  { label: "Fast", interval: 120 },
] as const;

const STATE_OPTIONS = STATE_CODES.map((code) => [code, STATE_NAMES[code]] as const).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

function colorName(colorId: string | undefined, palette: PaletteColor[]) {
  if (!colorId) return "—";
  return palette.find((color) => color.id === colorId)?.name ?? colorId;
}

function paletteText(text: string, palette: PaletteColor[]) {
  return palette.reduce(
    (copy, color) => copy.replaceAll(color.id, color.name.toLocaleLowerCase()),
    text,
  );
}

function eventTone(type: string) {
  if (type === "contradiction" || type === "unsatisfiable") return "danger";
  if (type === "solved") return "success";
  if (type === "backtrack") return "backtrack";
  if (type === "remove-color" || type === "forced-assignment") return "change";
  return "current";
}

function makeExtraColor(index: number): PaletteColor {
  const bankColor = EXTRA_COLORS[(index - STARTER_PALETTE.length) % EXTRA_COLORS.length];
  const cycle = Math.floor((index - STARTER_PALETTE.length) / EXTRA_COLORS.length);
  const number = index + 1;
  return {
    id: `color-${number}`,
    name: cycle === 0 ? bankColor[0] : `${bankColor[0]} ${cycle + 1}`,
    hex: bankColor[1],
    symbol: String(number),
  };
}

export function MapColoringLab() {
  const [palette, setPalette] = useState<PaletteColor[]>(STARTER_PALETTE);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedState, setSelectedState] = useState<StateCode | null>(null);
  const [stateQuery, setStateQuery] = useState("");
  const colorSequence = useRef(STARTER_PALETTE.length);

  const trace = useMemo(
    () => generateTrace(palette.map((color) => color.id)),
    [palette],
  );
  const snapshot = trace[cursor] ?? trace[0];
  const atEnd = cursor >= trace.length - 1;
  const terminal = snapshot?.status === "solved" || snapshot?.status === "unsatisfiable";

  useEffect(() => {
    if (!playing || atEnd || terminal) return;
    const timer = window.setTimeout(() => {
      const nextCursor = Math.min(cursor + 1, trace.length - 1);
      setCursor(nextCursor);
      const nextStatus = trace[nextCursor]?.status;
      if (
        nextCursor === trace.length - 1 ||
        nextStatus === "solved" ||
        nextStatus === "unsatisfiable"
      ) {
        setPlaying(false);
      }
    }, SPEEDS[speed].interval);
    return () => window.clearTimeout(timer);
  }, [atEnd, playing, speed, terminal, trace, cursor]);

  const chosenState = selectedState ?? snapshot?.currentState ?? snapshot?.event.state ?? null;
  const selectedDomain = chosenState ? snapshot?.domains[chosenState] ?? [] : [];
  const selectedAssignment = chosenState ? snapshot?.assignments[chosenState] : undefined;
  const removalNotes = useMemo(() => {
    if (!chosenState) return [];
    const notes: string[] = [];
    for (let index = 1; index <= cursor; index += 1) {
      const event = trace[index]?.event;
      if (
        event?.type === "remove-color" &&
        event.state === chosenState &&
        event.causeState &&
        event.colorId
      ) {
        notes.push(`${STATE_NAMES[event.causeState]} removed ${colorName(event.colorId, palette)}`);
      }
    }
    return notes;
  }, [chosenState, cursor, palette, trace]);

  const visibleStates = useMemo(() => {
    const query = stateQuery.trim().toLocaleLowerCase();
    if (!query) return STATE_OPTIONS;
    return STATE_OPTIONS.filter(
      ([abbr, name]) =>
        abbr.toLocaleLowerCase().includes(query) ||
        name.toLocaleLowerCase().includes(query),
    );
  }, [stateQuery]);

  const liveMessage = useMemo(() => {
    if (!snapshot) return "Solver ready.";
    if (speed === SPEEDS.length - 1 && !terminal && cursor % 4 !== 0) return "";
    if (speed === SPEEDS.length - 1 && !terminal) {
      return `Search update: ${snapshot.metrics.assignments} assignments, ${snapshot.metrics.domainReductions} domain reductions, ${snapshot.metrics.backtracks} backtracks.`;
    }
    return paletteText(snapshot.event.narration, palette);
  }, [cursor, palette, snapshot, speed, terminal]);

  function pauseAndMove(nextCursor: number) {
    setPlaying(false);
    setCursor(Math.max(0, Math.min(nextCursor, trace.length - 1)));
  }

  function updatePalette(nextPalette: PaletteColor[]) {
    setPlaying(false);
    setCursor(0);
    setSelectedState(null);
    setPalette(nextPalette);
  }

  function addColor() {
    const index = colorSequence.current;
    colorSequence.current += 1;
    updatePalette([...palette, makeExtraColor(index)]);
  }

  function removeColor(id: string) {
    if (palette.length <= 1) return;
    updatePalette(palette.filter((color) => color.id !== id));
  }

  function applyPreset(kind: "three" | "four" | "backtrack") {
    const next = STARTER_PALETTE.slice(0, kind === "four" ? 4 : 3);
    updatePalette(next);
    if (kind === "backtrack") {
      window.setTimeout(() => setPlaying(true), 0);
    }
  }

  const assignmentCount = Object.keys(snapshot?.assignments ?? {}).length;
  const event = snapshot.event;
  const eventTitle = paletteText(event.title, palette);
  const playbackStatus = playing
    ? "Running"
    : snapshot.status === "solved"
      ? "Solved"
      : snapshot.status === "unsatisfiable"
        ? "Unsatisfiable"
        : cursor === 0
          ? "Ready"
          : "Paused";

  return (
    <main className="lab-shell">
      <header className="lesson-header">
        <a className="brand-mark" href="#top" aria-label="Map Colors home">
          <span className="brand-map" aria-hidden="true">◆</span>
          <span>Map Colors</span>
        </a>
        <div className="lesson-heading" id="top">
          <p className="eyebrow">Constraint propagation, drawn out</p>
          <h1>Watch constraints travel across the map.</h1>
          <p className="intro-copy">
            Give every state a color, but never match a land-border neighbor. We’ll
            reveal every decision the search makes along the way.
          </p>
        </div>
        <details className="read-guide">
          <summary>How to read this</summary>
          <ol>
            <li><strong>Look at the dots:</strong> they are a state’s available colors.</li>
            <li><strong>Watch the outlines:</strong> they show the current and affected states.</li>
            <li><strong>Follow the stack:</strong> it records the search’s open decisions.</li>
          </ol>
        </details>
        <div className="concept-key" aria-label="Concept key">
          <span><b>State</b> = variable</span>
          <span><b>Dots</b> = available colors</span>
          <span><b>Border</b> = constraint</span>
        </div>
      </header>

      <section className="workbench" aria-label="Interactive map coloring lesson">
        <div className="map-column">
          <section className="control-board" aria-label="Solver controls">
            <div className="playback-controls">
              <button
                className="control-button primary-control"
                type="button"
                onClick={() => setPlaying((value) => !value)}
                disabled={terminal || (atEnd && !playing)}
                aria-label={playing ? "Pause automatic playback" : "Run automatic playback"}
              >
                <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
                {playing ? "Pause" : "Run"}
              </button>
              <button
                className="control-button"
                type="button"
                onClick={() => pauseAndMove(cursor + 1)}
                disabled={atEnd}
                title={atEnd ? "The search is at its final event" : "Advance one solver event"}
              >
                <span aria-hidden="true">→|</span> Step
              </button>
              <button
                className="control-button"
                type="button"
                onClick={() => pauseAndMove(cursor - 1)}
                disabled={cursor === 0}
                title={cursor === 0 ? "There is no earlier event" : "Inspect the preceding event"}
              >
                <span aria-hidden="true">↶</span> Back
              </button>
              <button
                className="control-button quiet-control"
                type="button"
                onClick={() => {
                  pauseAndMove(0);
                  setSelectedState(null);
                }}
                disabled={cursor === 0 && !playing}
                title={cursor === 0 && !playing ? "The map is already reset" : "Return to the initial domains"}
              >
                <span aria-hidden="true">↺</span> Reset
              </button>
            </div>

            <label className="speed-control">
              <span className="speed-label">
                <span>Playback speed</span>
                <strong>{SPEEDS[speed].label}</strong>
              </span>
              <input
                type="range"
                min="0"
                max={SPEEDS.length - 1}
                step="1"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                aria-valuetext={`${SPEEDS[speed].label}, one step every ${SPEEDS[speed].interval} milliseconds`}
              />
              <span className="speed-ends" aria-hidden="true"><span>Explain</span><span>Fast</span></span>
            </label>
          </section>

          <section className="palette-board" aria-labelledby="palette-heading">
            <div className="section-title-row">
              <div>
                <p className="kicker">The domain</p>
                <h2 id="palette-heading">Available colors</h2>
              </div>
              <button className="add-color" type="button" onClick={addColor}>
                <span aria-hidden="true">＋</span> Add color
              </button>
            </div>
            <div className="palette-list" aria-label={`${palette.length} colors in the palette`}>
              {palette.map((color) => (
                <div className="palette-chip" key={color.id}>
                  <span className="color-token" style={{ "--token-color": color.hex } as React.CSSProperties}>
                    {color.symbol}
                  </span>
                  <span>{color.name}</span>
                  <button
                    type="button"
                    onClick={() => removeColor(color.id)}
                    disabled={palette.length === 1}
                    aria-label={`Remove ${color.name}`}
                    title={palette.length === 1 ? "At least one color is required" : `Remove ${color.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="preset-row" aria-label="Teaching presets">
              <span>Try a lesson:</span>
              <button type="button" onClick={() => applyPreset("three")}>Try 3 colors</button>
              <button type="button" onClick={() => applyPreset("four")}>Classic 4</button>
              <button type="button" onClick={() => applyPreset("backtrack")}>Show a backtrack</button>
            </div>
            {palette.length > 8 && (
              <p className="palette-note" role="note">
                The solver still uses all {palette.length} colors. The map compresses the dots;
                select a state to see its complete domain.
              </p>
            )}
          </section>

          <section className="map-board" aria-labelledby="map-heading">
            <div className="map-caption">
              <div>
                <p className="kicker">The constraint graph</p>
                <h2 id="map-heading">United States</h2>
              </div>
              <p>
                <strong>{assignmentCount} of 50 assigned</strong>
                <span>Colored count shows progress, not time remaining.</span>
              </p>
            </div>
            {snapshot && (
              <USMap
                assignments={snapshot.assignments}
                domains={snapshot.domains}
                palette={palette}
                currentState={snapshot.currentState}
                affectedState={snapshot.affectedState}
                selectedState={chosenState}
                onSelectState={setSelectedState}
                forcedStates={event.type === "forced-assignment" && event.state ? [event.state] : []}
                contradictedState={event.type === "contradiction" ? event.state ?? snapshot.affectedState : null}
                neighbors={ADJACENCY}
              />
            )}
            <details className="state-finder">
              <summary>Find a state by name</summary>
              <label>
                <span className="sr-only">Search states</span>
                <input
                  type="search"
                  value={stateQuery}
                  onChange={(searchEvent) => setStateQuery(searchEvent.target.value)}
                  placeholder="Search states…"
                />
              </label>
              <div className="state-results">
                {visibleStates.map(([abbr, name]) => {
                  const assigned = snapshot?.assignments[abbr];
                  const domain = snapshot?.domains[abbr] ?? [];
                  return (
                    <button
                      type="button"
                      key={abbr}
                      onClick={() => setSelectedState(abbr)}
                      aria-pressed={chosenState === abbr}
                    >
                      <strong>{abbr}</strong>
                      <span>{name}</span>
                      <small>{assigned ? colorName(assigned, palette) : `${domain.length} options`}</small>
                    </button>
                  );
                })}
              </div>
            </details>
          </section>
        </div>

        <aside className="lesson-sidebar" aria-label="Solver explanation and progress">
          <section className={`event-card event-${eventTone(event.type)}`} aria-labelledby="event-heading">
            <p className="event-number">{playbackStatus} · Event {cursor + 1} of {trace.length}</p>
            <div className="event-heading-row">
              <span className="event-icon" aria-hidden="true">
                {event.type === "contradiction" ? "!" : event.type === "solved" ? "✓" : "→"}
              </span>
              <div>
                <p className="kicker">What just happened</p>
                <h2 id="event-heading">{eventTitle}</h2>
              </div>
            </div>
            <p className="event-description">{paletteText(event.narration, palette)}</p>
            {event.formal && <code className="formal-note">{paletteText(event.formal, palette)}</code>}

            {snapshot?.status === "solved" && (
              <div className="completion-note" role="status">
                <strong>The map is solved.</strong> All neighbors differ using {palette.length} colors,
                after {snapshot.metrics.backtracks} backtracks.
              </div>
            )}
            {event.type === "contradiction" && (
              <div className="contradiction-note" role="status">
                <strong>No options remain.</strong> The search will abandon this branch and return
                to the newest decision with another color to try.
              </div>
            )}
            {snapshot?.status === "unsatisfiable" && (
              <div className="contradiction-note" role="status">
                <strong>Every branch was exhausted.</strong> This palette cannot color the map.
                Add a color and try again.
              </div>
            )}

            <details className="why-state">
              <summary>Why this state?</summary>
              <p>
                The search chooses the unassigned state with the fewest remaining colors — the
                <strong> minimum remaining values</strong> rule. Ties go to the alphabetically first
                state abbreviation, so every run is repeatable.
              </p>
            </details>
          </section>

          <section className="inspector-card" aria-labelledby="inspector-heading">
            <div className="section-title-row">
              <div>
                <p className="kicker">Look closer</p>
                <h2 id="inspector-heading">State inspector</h2>
              </div>
              {chosenState && <span className="state-badge">{chosenState}</span>}
            </div>
            {!chosenState ? (
              <p className="empty-copy">Select any state on the map to see every option and constraint.</p>
            ) : (
              <div className="inspector-content">
                <h3>{STATE_NAMES[chosenState] ?? chosenState}</h3>
                <dl>
                  <div><dt>Assignment</dt><dd>{colorName(selectedAssignment, palette)}</dd></div>
                  <div><dt>Options left</dt><dd>{selectedAssignment ? "Locked" : selectedDomain.length}</dd></div>
                </dl>
                <div>
                  <h4>Complete domain</h4>
                  <div className="domain-list">
                    {selectedDomain.length > 0 ? selectedDomain.map((colorId) => {
                      const color = palette.find((item) => item.id === colorId);
                      return (
                        <span key={colorId}>
                          <i style={{ "--token-color": color?.hex ?? "#777" } as React.CSSProperties}>{color?.symbol ?? "?"}</i>
                          {color?.name ?? colorId}
                        </span>
                      );
                    }) : <em>No colors remain</em>}
                  </div>
                </div>
                <div>
                  <h4>Land-border neighbors</h4>
                  <p>{ADJACENCY[chosenState].length ? ADJACENCY[chosenState].map((abbr) => STATE_NAMES[abbr]).join(", ") : "None — this state has no land-border constraints."}</p>
                </div>
                <div>
                  <h4>Colors removed by neighbors</h4>
                  <p>{removalNotes.length ? removalNotes.join("; ") : "No neighboring assignment has removed a color yet."}</p>
                </div>
              </div>
            )}
          </section>

          <section className="legend-card" aria-labelledby="legend-heading">
            <h2 id="legend-heading">Map marks</h2>
            <ul>
              <li><span className="legend-mark assigned">✓</span> Assigned</li>
              <li><span className="legend-mark current">◎</span> Current</li>
              <li><span className="legend-mark affected">→</span> Affected</li>
              <li><span className="legend-mark forced">!</span> Forced</li>
              <li><span className="legend-mark conflict">×</span> Contradiction</li>
            </ul>
          </section>

          <section className="search-card" aria-labelledby="search-heading">
            <div className="section-title-row">
              <div>
                <p className="kicker">Depth-first search</p>
                <h2 id="search-heading">Decision stack</h2>
              </div>
              <span className="depth-badge">Depth {snapshot?.metrics.searchDepth ?? 0}</span>
            </div>
            <p className="stack-direction">Newest decision first</p>
            <ol className="decision-stack">
              {snapshot?.stack.length ? [...snapshot.stack].reverse().map((frame, index) => (
                <li className={frame.status === "backtracked" ? "is-backtracked" : ""} key={`${frame.state}-${frame.colorId}-${index}`}>
                  <span>{snapshot.stack.length - index}</span>
                  <strong>{frame.state}</strong>
                  <i style={{ "--token-color": palette.find((color) => color.id === frame.colorId)?.hex ?? "#777" } as React.CSSProperties} />
                  <small>{frame.status === "backtracked" ? "abandoned" : `try ${colorName(frame.colorId, palette)}`}</small>
                </li>
              )) : <li className="empty-stack">No decisions yet. Press Step to begin.</li>}
            </ol>
          </section>

          <section className="metrics-card" aria-labelledby="metrics-heading">
            <h2 id="metrics-heading">Search notes</h2>
            <dl className="metrics-grid">
              <div><dt>Assignments</dt><dd>{snapshot?.metrics.assignments ?? 0}</dd></div>
              <div><dt>Reductions</dt><dd>{snapshot?.metrics.domainReductions ?? 0}</dd></div>
              <div><dt>Backtracks</dt><dd>{snapshot?.metrics.backtracks ?? 0}</dd></div>
              <div><dt>Max depth</dt><dd>{snapshot?.metrics.maxSearchDepth ?? 0}</dd></div>
            </dl>
          </section>

          <section className="history-card" aria-labelledby="history-heading">
            <div className="section-title-row">
              <div>
                <p className="kicker">Recorded trace</p>
                <h2 id="history-heading">Recent events</h2>
              </div>
              <span>{cursor + 1}/{trace.length}</span>
            </div>
            <ol className="event-history">
              {trace.slice(Math.max(0, cursor - 79), cursor + 1).map((item) => (
                <li key={`${item.event.type}-${item.index}`}>
                  <button
                    type="button"
                    className={item.index === snapshot.index ? "is-current" : ""}
                    onClick={() => pauseAndMove(trace.indexOf(item))}
                    aria-current={item.index === snapshot.index ? "step" : undefined}
                  >
                    <span>{item.index + 1}</span>
                    <span><strong>{paletteText(item.event.title, palette)}</strong><small>{paletteText(item.event.narration, palette)}</small></span>
                  </button>
                </li>
              )).reverse()}
            </ol>
          </section>
        </aside>
      </section>

      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>
    </main>
  );
}

export default MapColoringLab;
