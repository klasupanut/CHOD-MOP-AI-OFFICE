import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  columnIndexToLetter,
  RENOVATION_PILOT_PROJECT,
  RenovationStatusError,
  resolveRenovationMutationTarget,
} from "../src/lib/renovation/status-schema.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const headers = [
  "project",
  "block",
  "unitNo",
  "unitType",
  "Warehouse Floor Option",
  "Slab Renovation Status",
];

test("Renovation writeback resolves one exact CHOD 2 unit and status cell", () => {
  const target = resolveRenovationMutationTarget([
    headers,
    [RENOVATION_PILOT_PROJECT, "A", "A1", "Factory/Warehouse", "OP2 - 2 Ton", ""],
    [RENOVATION_PILOT_PROJECT, "A", "A2", "Factory/Warehouse", "OP3 - 3 Ton", "Planned Work"],
  ], " a2 ", "Planned Work");

  assert.deepEqual(target, {
    rowNumber: 3,
    statusColumnIndex: 5,
    currentStatus: "Planned Work",
  });
  assert.equal(columnIndexToLetter(target.statusColumnIndex), "F");
  assert.equal(columnIndexToLetter(51), "AZ");
});

test("Renovation writeback rejects stale, duplicate, missing, and unsupported targets", () => {
  const values = [
    headers,
    [RENOVATION_PILOT_PROJECT, "A", "A1", "Factory/Warehouse", "OP2 - 2 Ton", "Completed / Past Work"],
  ];
  assert.throws(
    () => resolveRenovationMutationTarget(values, "A1", "Planned Work"),
    (error) => error instanceof RenovationStatusError && error.status === 409 && /changed since/i.test(error.message),
  );
  assert.throws(
    () => resolveRenovationMutationTarget([...values, values[1]], "A1", "Completed / Past Work"),
    (error) => error instanceof RenovationStatusError && error.status === 409 && /more than once/i.test(error.message),
  );
  assert.throws(
    () => resolveRenovationMutationTarget(values, "Z99", ""),
    (error) => error instanceof RenovationStatusError && error.status === 409 && /not found/i.test(error.message),
  );
  assert.throws(
    () => resolveRenovationMutationTarget([
      headers,
      [RENOVATION_PILOT_PROJECT, "A", "A1", "Factory/Warehouse", "OP2 - 2 Ton", "Unknown"],
    ], "A1", "Unknown"),
    /Unsupported Slab Renovation Status/,
  );
});

test("Renovation API is authenticated, same-origin guarded, and disabled by default", async () => {
  const route = await read("../src/app/api/renovation/status/route.ts");
  const connector = await read("../src/lib/renovation/google-sheet-status.ts");
  const envExample = await read("../.env.example");

  assert.match(route, /getApiUser\("Renovation"\)/);
  assert.match(route, /rejectUnsafeMutationRequest\(request\)/);
  assert.match(route, /isRenovationWriteEnabled\(\)/);
  assert.match(connector, /import "server-only"/);
  assert.match(connector, /includeValuesInResponse=true/);
  assert.match(connector, /updatedCells !== 1/);
  assert.match(connector, /resolveRenovationMutationTarget/);
  assert.match(envExample, /RENOVATION_WRITE_MODE=disabled/);
  assert.doesNotMatch(route + connector, /NEXT_PUBLIC_.*RENOVATION/i);
});

test("Warehouse client uses the guarded same-origin write API and never Google credentials", async () => {
  const app = await read("../warehouse-status-map-dist/app.js");
  const html = await read("../warehouse-status-map-dist/index.html");

  assert.match(html, /id="slabStatusEditor"/);
  assert.match(app, /const RENOVATION_STATUS_API = "\/api\/renovation\/status"/);
  assert.match(app, /expectedStatus/);
  assert.match(app, /method: "PATCH"/);
  assert.doesNotMatch(app, /GOOGLE_PRIVATE_KEY|GOOGLE_SERVICE_ACCOUNT_EMAIL|Authorization:\s*`Bearer/);
});
