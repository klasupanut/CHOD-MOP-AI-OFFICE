import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("notification popover stays above workspace and embedded module layers", async () => {
  const css = await read("../src/app/globals.css");

  assert.match(css, /\.topbar\s*\{[^}]*z-index:\s*320;/s);
  assert.match(css, /\.topbar\s*\{[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.notification-menu\s*\{[^}]*z-index:\s*1001;/s);
  assert.match(css, /\.notification-popover\s*\{[^}]*z-index:\s*1002;/s);
  assert.match(css, /\.notification-popover\s*\{[^}]*pointer-events:\s*auto;/s);
});

