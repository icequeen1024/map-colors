"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import "./USMap.css";

export interface MapPaletteColor {
  id: string;
  name: string;
  hex: string;
  symbol?: string;
}

export const US_STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
} as const;

export type StateCode = keyof typeof US_STATE_NAMES;

export interface USMapProps {
  assignments: Readonly<Partial<Record<string, string | null | undefined>>>;
  domains: Readonly<Partial<Record<string, readonly string[] | undefined>>>;
  palette: readonly MapPaletteColor[];
  currentState?: string | null;
  affectedState?: string | null;
  selectedState?: string | null;
  forcedStates?: readonly string[];
  contradictedState?: string | null;
  neighbors?: Readonly<Partial<Record<string, readonly string[] | undefined>>>;
  onSelectState?: (stateCode: StateCode) => void;
  className?: string;
}

interface StateGeometry {
  code: StateCode;
  x: number;
  y: number;
  leader?: readonly [number, number];
  callout?: boolean;
}

// Shape paths are a checked-in, same-origin asset derived from the CC0-licensed
// @svg-maps/usa.states-territories v1.0.0 map. These coordinates place the
// teaching labels and domains without coupling this component to solver data.
const STATE_GEOMETRY: readonly StateGeometry[] = [
  { code: "WA", x: 119, y: 53 },
  { code: "OR", x: 94, y: 123 },
  { code: "CA", x: 83, y: 276 },
  { code: "NV", x: 132, y: 241 },
  { code: "ID", x: 198, y: 133 },
  { code: "MT", x: 300, y: 94 },
  { code: "WY", x: 300, y: 178 },
  { code: "UT", x: 215, y: 255 },
  { code: "AZ", x: 202, y: 363 },
  { code: "NM", x: 303, y: 369 },
  { code: "CO", x: 317, y: 274 },
  { code: "ND", x: 414, y: 94 },
  { code: "SD", x: 414, y: 155 },
  { code: "NE", x: 417, y: 221 },
  { code: "KS", x: 438, y: 292 },
  { code: "OK", x: 460, y: 357 },
  { code: "TX", x: 412, y: 455 },
  { code: "MN", x: 506, y: 123 },
  { code: "IA", x: 519, y: 210 },
  { code: "MO", x: 548, y: 291 },
  { code: "AR", x: 548, y: 373 },
  { code: "LA", x: 556, y: 448 },
  { code: "WI", x: 577, y: 151 },
  { code: "IL", x: 592, y: 245 },
  { code: "MS", x: 608, y: 421 },
  { code: "MI", x: 666, y: 160 },
  { code: "IN", x: 645, y: 241 },
  { code: "KY", x: 670, y: 311 },
  { code: "TN", x: 650, y: 349 },
  { code: "AL", x: 654, y: 421 },
  { code: "OH", x: 704, y: 231 },
  { code: "WV", x: 744, y: 269 },
  { code: "GA", x: 713, y: 414 },
  { code: "FL", x: 738, y: 489 },
  { code: "SC", x: 750, y: 382 },
  { code: "NC", x: 757, y: 353 },
  { code: "VA", x: 770, y: 292 },
  { code: "PA", x: 779, y: 205 },
  { code: "NY", x: 797, y: 156 },
  { code: "VT", x: 839, y: 126 },
  { code: "ME", x: 894, y: 79 },
  { code: "NH", x: 894, y: 119, leader: [870, 126], callout: true },
  { code: "MA", x: 904, y: 148, leader: [880, 157], callout: true },
  { code: "RI", x: 906, y: 178, leader: [879, 173], callout: true },
  { code: "CT", x: 882, y: 195, leader: [858, 184], callout: true },
  { code: "NJ", x: 867, y: 222, leader: [834, 216], callout: true },
  { code: "DE", x: 874, y: 249, leader: [833, 244], callout: true },
  { code: "MD", x: 850, y: 273, leader: [803, 247], callout: true },
  { code: "AK", x: 145, y: 495 },
  { code: "HI", x: 283, y: 544 },
] as const;

const normalizeCode = (value: string | null | undefined) =>
  value?.trim().toUpperCase() ?? "";

function lookup<T>(
  values: Readonly<Partial<Record<string, T | undefined>>>,
  code: StateCode,
): T | undefined {
  return values[code] ?? values[code.toLowerCase()];
}

function colorName(colorId: string, paletteById: ReadonlyMap<string, MapPaletteColor>) {
  return paletteById.get(colorId)?.name ?? colorId;
}

export function USMap({
  assignments,
  domains,
  palette,
  currentState,
  affectedState,
  selectedState,
  forcedStates = [],
  contradictedState,
  neighbors,
  onSelectState,
  className,
}: USMapProps) {
  const paletteById = new Map(palette.map((color) => [color.id, color]));
  const normalizedCurrent = normalizeCode(currentState);
  const normalizedAffected = normalizeCode(affectedState);
  const normalizedSelected = normalizeCode(selectedState);
  const normalizedContradiction = normalizeCode(contradictedState);
  const normalizedForced = new Set(forcedStates.map(normalizeCode));

  const chooseState = (code: StateCode) => onSelectState?.(code);

  const handleKeyDown = (
    event: ReactKeyboardEvent<SVGGElement>,
    code: StateCode,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseState(code);
    }
  };

  return (
    <figure className={["usMap", className].filter(Boolean).join(" ")}>
      <svg
        className="usMap__svg"
        viewBox="0 0 940 600"
        role="group"
        aria-label="Interactive map of the 50 United States"
        aria-describedby="us-map-instructions"
      >
        <rect className="usMap__paper" x="1" y="1" width="938" height="598" rx="24" />
        <path className="usMap__insetFrame" d="M20 440h220v144H20z" />
        <path className="usMap__insetFrame" d="M244 500h126v84H244z" />
        <text className="usMap__insetLabel" x="31" y="459">ALASKA</text>
        <text className="usMap__insetLabel" x="255" y="519">HAWAII</text>

        {STATE_GEOMETRY.map(({ code, x, y, leader, callout }) => {
          const name = US_STATE_NAMES[code];
          const assignmentId = lookup(assignments, code) ?? null;
          const assignment = assignmentId ? paletteById.get(assignmentId) : undefined;
          const availableIds = lookup(domains, code) ?? palette.map((color) => color.id);
          const availableColors = availableIds.map((id) =>
            paletteById.get(id) ?? { id, name: id, hex: "#8b8b83", symbol: "?" },
          );
          const stateNeighbors = neighbors ? lookup(neighbors, code) ?? [] : [];
          const isSelected = code === normalizedSelected;
          const isCurrent = code === normalizedCurrent;
          const isAffected = code === normalizedAffected;
          const isForced = normalizedForced.has(code);
          const isContradicted = code === normalizedContradiction;
          const visibleColors = availableColors.slice(0, 3);
          const overflow = Math.max(0, availableColors.length - visibleColors.length);
          const dotsWidth = Math.max(0, (visibleColors.length - 1) * 13) + (overflow ? 24 : 0);
          const dotsStartX = x - dotsWidth / 2;
          const statusMark = isContradicted
            ? "×"
            : isForced
              ? "!"
              : isCurrent
                ? "?"
                : isAffected
                  ? "−"
                  : null;
          const domainNames = availableIds.map((id) => colorName(id, paletteById));
          const assignmentText = assignmentId
            ? `Assigned ${colorName(assignmentId, paletteById)}`
            : "Unassigned";
          const domainText = `${availableIds.length} ${availableIds.length === 1 ? "color" : "colors"} available${domainNames.length ? `: ${domainNames.join(", ")}` : ": none"}`;
          const neighborText = stateNeighbors.length
            ? `Land-border neighbors: ${stateNeighbors
                .map(normalizeCode)
                .map((neighbor) => US_STATE_NAMES[neighbor as StateCode] ?? neighbor)
                .join(", ")}`
            : neighbors
              ? "No land-border neighbors"
              : "";
          const statusText = [
            isCurrent && "current search state",
            isAffected && "affected by propagation",
            isForced && "forced assignment",
            isContradicted && "contradiction",
            isSelected && "selected",
          ].filter(Boolean);
          const accessibleLabel = [
            name,
            assignmentText,
            domainText,
            neighborText,
            ...statusText,
            "Press Enter to inspect",
          ].filter(Boolean).join(". ");

          return (
            <g
              className="usMap__state"
              key={code}
              role="button"
              tabIndex={0}
              aria-label={accessibleLabel}
              aria-pressed={isSelected}
              onClick={() => chooseState(code)}
              onFocus={() => chooseState(code)}
              onKeyDown={(event) => handleKeyDown(event, code)}
            >
              <title>{[name, assignmentText, domainText, neighborText].filter(Boolean).join(" · ")}</title>
              <use
                className="usMap__shape"
                href={`/map/us-states.svg#${code}`}
                style={{ fill: assignment?.hex ?? (assignmentId ? "#9a958c" : "#fbf8ef") }}
              />
              {isSelected && <use className="usMap__outline usMap__outline--selected" href={`/map/us-states.svg#${code}`} />}
              {isCurrent && <use className="usMap__outline usMap__outline--current" href={`/map/us-states.svg#${code}`} />}
              {isAffected && <use className="usMap__outline usMap__outline--affected" href={`/map/us-states.svg#${code}`} />}
              {isForced && <use className="usMap__outline usMap__outline--forced" href={`/map/us-states.svg#${code}`} />}
              {isContradicted && <use className="usMap__outline usMap__outline--contradiction" href={`/map/us-states.svg#${code}`} />}

              {leader && (
                <line className="usMap__leader" x1={leader[0]} y1={leader[1]} x2={x} y2={y - 2} />
              )}
              {callout && (
                <rect className="usMap__calloutTarget" x={x - 22} y={y - 13} width="44" height="38" rx="8" />
              )}
              <rect className="usMap__labelPlate" x={x - 13} y={y - 9} width="26" height="17" rx="5" />
              <text className="usMap__stateCode" x={x} y={y + 3}>{code}</text>

              {assignmentId ? (
                <g className="usMap__assignedMark" aria-hidden="true">
                  <circle cx={x} cy={y + 16} r="6.4" style={{ fill: assignment?.hex ?? "#9a958c" }} />
                  <text x={x} y={y + 18.5}>✓</text>
                </g>
              ) : (
                <g className="usMap__domain" aria-hidden="true">
                  {visibleColors.map((color, index) => (
                    <g key={`${code}-${color.id}`}>
                      <circle
                        className="usMap__domainDot"
                        cx={dotsStartX + index * 13}
                        cy={y + 17}
                        r="5.3"
                        style={{ fill: color.hex }}
                      />
                      <text className="usMap__domainSymbol" x={dotsStartX + index * 13} y={y + 19.1}>
                        {color.symbol ?? String(index + 1)}
                      </text>
                    </g>
                  ))}
                  {overflow > 0 && (
                    <text className="usMap__overflow" x={dotsStartX + visibleColors.length * 13 + 1} y={y + 20}>
                      +{overflow}
                    </text>
                  )}
                </g>
              )}

              {statusMark && (
                <g className={`usMap__status usMap__status--${isContradicted ? "contradiction" : isForced ? "forced" : isCurrent ? "current" : "affected"}`} aria-hidden="true">
                  <circle cx={x + 15} cy={y - 9} r="7" />
                  <text x={x + 15} y={y - 6.1}>{statusMark}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption id="us-map-instructions" className="usMap__caption">
        Select or focus a state to inspect it. Dots show its remaining color options; <strong>+N</strong> means more options are available in the inspector.
      </figcaption>
    </figure>
  );
}

export default USMap;
