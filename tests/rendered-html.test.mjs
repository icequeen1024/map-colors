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
  assert.match(html, /State inspector/);
  assert.match(html, /Decision stack/);
  assert.match(html, /Color attempts remaining/);
  assert.match(html, /Propagation <!-- -->ON/);
  assert.match(html, /Constraint propagation/);
  assert.match(html, /DFS tree/);
  assert.match(html, /rejected \/ pruned/);
  assert.match(
    html,
    /aria-label="[^"]*color attempts remaining with constraint propagation on"/i,
  );
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Interactive map of the 50 United States/);
  assert.match(
    html,
    /https:\/\/icequeen1024\.github\.io\/map-colors\/og\.png/,
  );
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the licensed 50-state map and removes starter-only UI", async () => {
  const [page, layout, packageJson, mapAsset] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/map/us-states.svg", import.meta.url), "utf8"),
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

  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
