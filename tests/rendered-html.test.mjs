import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const html = await readFile(
    new URL("../dist/client/index.html", import.meta.url),
    "utf8",
  );
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

test("statically renders the complete teaching interface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>Map Colors — Constraint Propagation, Made Visible<\/title>/i,
  );
  assert.match(html, /Watch constraints travel across the map\./);
  assert.match(html, /State[^<]*<\/b> = variable/);
  assert.match(html, /Available colors/);
  assert.match(html, /Run/);
  assert.match(html, /Step/);
  assert.match(html, /Open details/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Outcomes not yet eliminated · start <!-- -->4<!-- -->\^50/);
  assert.match(html, /1\.267 × 10\^30/);
  assert.match(html, /1,267,650,600,228,229,401,496,703,205,376/);
  assert.match(html, /Exact count/);
  assert.match(html, /Human check time/);
  assert.match(html, /≈ 4\.016 × 10\^22 years/);
  assert.match(html, /at 1 complete outcome \/ second/);
  assert.match(
    html,
    /aria-label="approximately 4\.016 times ten to the power of 22 years for a human checking one complete outcome per second continuously"/i,
  );
  assert.match(html, /Magnitude remaining/);
  assert.match(html, /log scale/);
  assert.match(html, /Propagation<\/span><strong>ON<\/strong><small>Ready/);
  assert.match(html, /Constraint propagation/);
  assert.match(html, /Search setup/);
  assert.match(html, /State order/);
  assert.match(html, /Top down/);
  assert.match(html, /Bottom up/);
  assert.match(html, /Human guidance/);
  assert.match(html, /Select a state to guide the search/);
  assert.match(html, /Fix selected state(?:'|&#x27;)s color/);
  assert.match(html, /Select a state before fixing it to Coral/);
  assert.match(html, /Select a state first/);
  assert.match(html, /Branching search history/);
  assert.match(html, /DFS tree/);
  assert.match(html, /bold = current DFS route/);
  assert.match(html, /outlined = this step/);
  assert.match(html, /Step <!-- -->1<!-- --> · <!-- -->Ready/);
  assert.match(html, /No DFS branch is active yet/);
  assert.match(html, /rejected \/ pruned/);
  assert.match(
    html,
    /aria-label="[^"]*complete outcomes remaining with constraint propagation on"/i,
  );
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Interactive map of the 50 United States/);
  assert.match(
    html,
    /https:\/\/icequeen1024\.github\.io\/map-colors\/og\.png/,
  );
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the licensed map and a bounded auto-following branching tree", async () => {
  const [page, layout, packageJson, mapAsset, labSource, labStyles, mapSource, mapStyles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/map/us-states.svg", import.meta.url), "utf8"),
    readFile(new URL("../app/MapColoringLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/map-coloring-lab.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/USMap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/USMap.css", import.meta.url), "utf8"),
  ]);

  const stateIds = [...mapAsset.matchAll(/<path\s+id="([A-Z]{2})"/g)].map(
    (match) => match[1],
  );
  assert.equal(stateIds.length, 50);
  assert.equal(new Set(stateIds).size, 50);
  assert.match(mapAsset, /CC0-1\.0/);

  assert.match(page, /<MapColoringLab \/>/);
  assert.match(layout, /export const metadata/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(labSource, /className="tree-branches"/);
  assert.match(labSource, /className={`tree-child-decisions/);
  assert.match(labSource, /data-current-tree-event/);
  assert.match(labSource, /treeEventPresentation/);
  assert.match(labSource, /pathBranchIds/);
  assert.match(labSource, /lastAttemptedBranchId/);
  assert.match(labSource, /is-path-continuation/);
  assert.match(labSource, /aria-live="polite"/);
  assert.match(labSource, /guideNextDecision/);
  assert.match(labSource, /learnerInterventions/);
  assert.match(labSource, /fixedAssignments/);
  assert.match(labSource, /fixedStates={fixedStateCodes}/);
  assert.match(labSource, /Clear all \({fixedStateCodes\.length}\)/);
  assert.match(labSource, /viewport\.scrollTop = Math\.max/);
  assert.match(labSource, /viewport\.scrollLeft = Math\.max/);
  assert.match(
    labStyles,
    /\.dfs-tree-viewport\s*{[^}]*height:\s*clamp\(260px,\s*48vh,\s*390px\);[^}]*overflow:\s*auto;/s,
  );
  assert.match(
    labStyles,
    /\.map-learning-stage\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
  );
  assert.match(labStyles, /\.tree-branches::before/);
  assert.match(labStyles, /\.tree-child-decisions::before/);
  assert.match(labStyles, /\.tree-live-step/);
  assert.match(labStyles, /\.tree-branch\.is-on-path/);
  assert.match(labStyles, /\.tree-event-badge/);
  assert.match(labStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(labStyles, /\.fixed-color-options/);
  assert.match(mapSource, /Human-assigned and locked/);
  assert.match(mapSource, /usMap__lockShackle/);
  assert.match(mapStyles, /\.usMap__outline--fixed/);

  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
