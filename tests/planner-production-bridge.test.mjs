import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Planner runtime is cloud-only and contains no production mock project", async () => {
  const source = await read("../src/components/planner/TimelinePlannerWorkspace.tsx");
  assert.doesNotMatch(source, /Central Embassy Retail Fit-out/i);
  assert.doesNotMatch(source, /Local draft mode|setUsageState\("local"\)|listLocalProjects|readLocalProject|saveLocalProject/);
  assert.doesNotMatch(source, /\/api\/tenant\//);
  for (const route of ["plan", "projects", "usage", "company-profile", "company-logo"]) {
    assert.match(source, new RegExp(`/api/planner/${route}`));
  }
  assert.match(source, /Connection error — Timeline cloud data was not loaded/);
  assert.match(source, /signature === savedPlanSignature/);
  assert.match(source, /if \(!cloudProjectId && isEmptyPlan\(planPayload\)\) return/);
});

test("Planner organization is fixed to Timeline production tenant", async () => {
  const tenancy = await read("../src/lib/planner/tenancy.ts");
  assert.match(tenancy, /id:\s*"org-chod-ai-office"/);
  assert.doesNotMatch(tenancy, /org-chod-mop-office/);
});

test("Planner API bridge trusts only approved server session identity", async () => {
  const bridge = await read("../src/lib/planner/server-bridge.ts");
  assert.match(bridge, /import "server-only"/);
  assert.match(bridge, /await getApiUser\(\)/);
  assert.match(bridge, /CHOD_ORGANIZATION\.id/);
  assert.match(bridge, /createHmac\("sha256", config\.identitySecret\)/);
  assert.match(bridge, /cf-access-client-id/);
  assert.match(bridge, /cf-access-client-secret/);
  assert.doesNotMatch(bridge, /NEXT_PUBLIC_TIMELINE/);
  assert.doesNotMatch(bridge, /request\.headers\.get\(["']x-chod-user-email/);
});

test("All Planner bridge routes exist and delegate to the server-only proxy", async () => {
  const routes = [
    "context",
    "projects",
    "plan",
    "usage",
    "company-profile",
    "company-logo",
  ];
  for (const route of routes) {
    const source = await read(`../src/app/api/planner/${route}/route.ts`);
    assert.match(source, /proxyTimelineRequest/);
    assert.doesNotMatch(source, /x-chod-user-email|x-organization-id/);
  }
});

test("Timeline credentials are documented as server-only variables", async () => {
  const envExample = await read("../.env.example");
  for (const name of [
    "TIMELINE_API_BASE_URL",
    "TIMELINE_CF_ACCESS_CLIENT_ID",
    "TIMELINE_CF_ACCESS_CLIENT_SECRET",
    "TIMELINE_INTERNAL_IDENTITY_SECRET",
  ]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
    assert.doesNotMatch(envExample, new RegExp(`NEXT_PUBLIC_${name}`));
  }
});
