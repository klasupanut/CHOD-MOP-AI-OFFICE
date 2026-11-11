import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  columnIndexToLetter,
  displayRenovationFieldValue,
  normalizeWritableRenovationFieldValue,
  normalizeRenovationProject,
  RENOVATION_OPERATION_DEFINITIONS,
  RENOVATION_PROJECTS,
  RenovationStatusError,
  resolveRenovationMutationTargets,
} from "../src/lib/renovation/status-schema.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const project = "Factory&Warehouse Chodthanawat 2";
const headers = [
  "project",
  "block",
  "unitNo",
  "Warehouse Floor Option",
  "Slab Renovation Status",
  "Slab Type",
  "Office Renovated",
  "Electric Work Status",
  "Pumbling Renovated",
];

test("Renovation writeback resolves exact multi-field cells for one unit", () => {
  const target = resolveRenovationMutationTargets([
    headers,
    [project, "A", "A1", "OP2 - 2 Ton", "", "Flat slab on pile", "", "", ""],
    [project, "A", "A2", "OP3 - 3 Ton", "Planned Work", "Flat slab on pile", false, true, ""],
  ], " a2 ", "slab", [
    { field: "warehouseFloorOption", value: "OP2 - 2 Ton", expectedValue: "OP3 - 3 Ton" },
    { field: "slabRenovationStatus", value: "Completed / Past Work", expectedValue: "Planned Work" },
    { field: "officeRenovated", value: "TRUE", expectedValue: "FALSE" },
  ]);

  assert.equal(target.rowNumber, 3);
  assert.deepEqual(target.fields.map((item) => ({
    key: item.field.key,
    column: item.columnIndex,
    current: item.currentValue,
    next: item.nextValue,
    googleValue: item.googleValue,
    changed: item.changed,
  })), [
    { key: "warehouseFloorOption", column: 3, current: "OP3 - 3 Ton", next: "OP2 - 2 Ton", googleValue: "OP2 - 2 Ton", changed: true },
    { key: "slabRenovationStatus", column: 4, current: "Planned Work", next: "Completed / Past Work", googleValue: "Completed / Past Work", changed: true },
    { key: "officeRenovated", column: 6, current: "FALSE", next: "TRUE", googleValue: true, changed: true },
  ]);
  assert.equal(columnIndexToLetter(6), "G");
  assert.equal(columnIndexToLetter(51), "AZ");
});

test("Renovation definitions cover every visible operation menu", () => {
  assert.deepEqual(Object.keys(RENOVATION_OPERATION_DEFINITIONS), [
    "slab",
    "electrical",
    "ventilation",
    "tariff",
    "lighting",
  ]);
  assert.equal(RENOVATION_PROJECTS.length, 8);
  assert.ok(RENOVATION_OPERATION_DEFINITIONS.slab.fields.some((field) => field.key === "warehouseFloorOption"));
  assert.ok(RENOVATION_OPERATION_DEFINITIONS.slab.fields.some((field) => field.key === "officeRenovated"));
  assert.ok(RENOVATION_OPERATION_DEFINITIONS.electrical.fields.some((field) => field.key === "plumbingStatus"));
  const inspectionDate = RENOVATION_OPERATION_DEFINITIONS.lighting.fields.find((field) => field.key === "lightingInspectionDate");
  assert.equal(displayRenovationFieldValue(inspectionDate, 25569), "1970-01-01");
  assert.deepEqual(normalizeWritableRenovationFieldValue(inspectionDate, "1970-01-01"), {
    displayValue: "1970-01-01",
    googleValue: 25569,
  });
});

test("Renovation writeback rejects stale, duplicate, missing, clearing, and cross-operation targets", () => {
  const values = [
    headers,
    [project, "A", "A1", "OP2 - 2 Ton", "Completed / Past Work", "Flat slab on pile", true, true, false],
  ];
  assert.throws(
    () => resolveRenovationMutationTargets(values, "A1", "slab", [
      { field: "slabRenovationStatus", value: "Planned Work", expectedValue: "Planned Work" },
    ]),
    (error) => error instanceof RenovationStatusError && error.status === 409 && /changed since/i.test(error.message),
  );
  assert.throws(
    () => resolveRenovationMutationTargets([...values, values[1]], "A1", "slab", [
      { field: "slabRenovationStatus", value: "Planned Work", expectedValue: "Completed / Past Work" },
    ]),
    /appears more than once/,
  );
  assert.throws(
    () => resolveRenovationMutationTargets(values, "Z99", "slab", [
      { field: "slabRenovationStatus", value: "Planned Work", expectedValue: "" },
    ]),
    /was not found/,
  );
  assert.throws(
    () => resolveRenovationMutationTargets(values, "A1", "slab", [
      { field: "warehouseFloorOption", value: "", expectedValue: "OP2 - 2 Ton" },
    ]),
    /cannot be cleared/,
  );
  assert.throws(
    () => resolveRenovationMutationTargets(values, "A1", "slab", [
      { field: "lightingStatus", value: "Operational", expectedValue: "" },
    ]),
    (error) => error instanceof RenovationStatusError && error.status === 403,
  );
  assert.throws(
    () => normalizeRenovationProject("Unknown Site"),
    (error) => error instanceof RenovationStatusError && error.status === 403,
  );
});

test("Renovation API is authenticated, same-origin guarded, and disabled by default", async () => {
  const route = await read("../src/app/api/renovation/status/route.ts");
  const connector = await read("../src/lib/renovation/google-sheet-status.ts");
  const envExample = await read("../.env.example");

  assert.match(route, /getApiUser\("Renovation"\)/);
  assert.match(route, /rejectUnsafeMutationRequest\(request\)/);
  assert.match(route, /isRenovationWriteEnabled\(\)/);
  assert.match(route, /RENOVATION_OPERATION_DEFINITIONS/);
  assert.match(route, /RENOVATION_PROJECTS/);
  assert.match(connector, /import "server-only"/);
  assert.match(connector, /\/values:batchUpdate/);
  assert.match(connector, /totalUpdatedCells !== ranges\.length/);
  assert.match(connector, /resolveRenovationMutationTargets/);
  assert.match(envExample, /RENOVATION_WRITE_MODE=disabled/);
  assert.doesNotMatch(route + connector, /NEXT_PUBLIC_.*RENOVATION/i);
});

test("Warehouse client exposes guarded editors without Google credentials", async () => {
  const app = await read("../warehouse-status-map-dist/app.js");
  const html = await read("../warehouse-status-map-dist/index.html");

  assert.match(html, /id="renovationEditor"/);
  assert.match(html, /id="renovationFields"/);
  assert.match(html, /id="saveRenovationBtn"/);
  assert.match(app, /const RENOVATION_STATUS_API = "\/api\/renovation\/status"/);
  assert.match(app, /expectedValue/);
  assert.match(app, /operation: operationId/);
  assert.match(app, /method: "PATCH"/);
  assert.doesNotMatch(app, /GOOGLE_PRIVATE_KEY|GOOGLE_SERVICE_ACCOUNT_EMAIL|Authorization:\s*`Bearer/);
});
