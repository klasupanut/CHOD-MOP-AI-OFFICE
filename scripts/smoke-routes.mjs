const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "");

const checks = [
  { path: "/api/health", status: 200 },
  { path: "/login", status: 200 },
  { path: "/", status: 307, location: "/login" },
  { path: "/dashboard", status: 307, location: "/login" },
  { path: "/tasks", status: 307, location: "/login" },
  { path: "/projects", status: 307, location: "/login" },
  { path: "/fit-out-project", status: 307, location: "/login" },
  { path: "/calendar-schedule", status: 307, location: "/login" },
  { path: "/quotations", status: 307, location: "/login" },
  { path: "/approvals", status: 307, location: "/login" },
  { path: "/reports", status: 307, location: "/login" },
  { path: "/settings/users", status: 307, location: "/login" },
  { path: "/local-quotation", status: 307, location: "/quotations" },
];

const failures = [];
for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, { redirect: "manual" });
    const location = response.headers.get("location") || "";
    const statusOk = response.status === check.status;
    const locationOk = !check.location || location.includes(check.location);
    if (!statusOk || !locationOk) {
      failures.push(`${check.path}: expected ${check.status}${check.location ? ` → ${check.location}` : ""}; got ${response.status}${location ? ` → ${location}` : ""}`);
      continue;
    }
    console.log(`OK ${check.path} (${response.status})`);
  } catch (error) {
    failures.push(`${check.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("Route smoke test failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Route smoke test passed for ${baseUrl}`);
