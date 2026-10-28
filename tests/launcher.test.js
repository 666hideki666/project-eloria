import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = readFileSync(new URL("../scripts/project-eloria-start.sh", import.meta.url), "utf8");
const start = script.indexOf("is_project_http_ready() {");
const readyFunction = script.slice(start, script.indexOf("\n}", start) + 2);

// Execute the launcher's actual Bash predicate with a deterministic HTTP body.
// No server is started or stopped, and no browser is opened by these tests.
function acceptsPage(page, curlStatus = "0") {
  return spawnSync("/bin/bash", ["-c", `
    curl() { printf '%s' "$ELORIA_QA_PAGE"; return "$ELORIA_QA_CURL_STATUS"; }
    GAME_URL=http://127.0.0.1:4173/
    ${readyFunction}
    is_project_http_ready
  `], {
    env: { ...process.env, ELORIA_QA_PAGE: page, ELORIA_QA_CURL_STATUS: curlStatus },
    encoding: "utf8",
    timeout: 2000,
  }).status;
}

describe("one-click launcher HTTP identity", () => {
  it("recognizes the real current index.html, including its renamed title", () => {
    const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(acceptsPage(index)).toBe(0);
  });

  it.each([
    '<html><title>Another app</title><body>Ready</body></html>',
    '<html><title>ELORIA</title><body>Another app with the same name</body></html>',
    '<html><title>ELORIA unrelated</title><body id="game-shell"></body></html>',
  ])("rejects an unrelated response: %s", (page) => {
    expect(acceptsPage(page)).toBe(1);
  });

  it("rejects unavailable HTTP responses", () => {
    expect(acceptsPage("", "22")).toBe(1);
  });
});
