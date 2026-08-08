import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const clientRoot = new URL("../dist/client/", import.meta.url);
const basePath = process.env.PAGES_BASE_PATH ?? "/map-colors";

test("creates a self-contained GitHub Pages artifact", async () => {
  const [html, assetFiles] = await Promise.all([
    readFile(new URL("index.html", clientRoot), "utf8"),
    readdir(new URL("assets/", clientRoot)),
    access(new URL(".nojekyll", clientRoot)),
    access(new URL("favicon.png", clientRoot)),
    access(new URL("og.png", clientRoot)),
    access(new URL("map/us-states.svg", clientRoot)),
  ]);

  assert.match(html, new RegExp(`${basePath}/assets/`));
  assert.match(html, new RegExp(`${basePath}/favicon\\.png`));
  assert.match(
    html,
    /https:\/\/icequeen1024\.github\.io\/map-colors\/og\.png/,
  );

  const javascript = await Promise.all(
    assetFiles
      .filter((file) => file.endsWith(".js"))
      .map((file) => readFile(new URL(`assets/${file}`, clientRoot), "utf8")),
  );
  assert.match(
    javascript.join("\n"),
    new RegExp(`${basePath}/map/us-states\\.svg`),
  );

  await assert.rejects(access(new URL(".openai/hosting.json", projectRoot)));
  await assert.rejects(access(new URL(".openai/hosting.json", clientRoot)));
});
