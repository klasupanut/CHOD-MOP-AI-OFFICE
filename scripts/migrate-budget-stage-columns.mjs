import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_SPREADSHEET_ID = "1NmVPZkEGxeUvIQYsuoyF7L9Xhjn03zH5RZvDf8UJ2Po";
const TARGET_SHEETS = [
  { id: 1670988984, title: "CHOD 1" },
  { id: 715191170, title: "CHOD 2" },
  { id: 1288685133, title: "CHOD 3" },
  { id: 1504272791, title: "CHOD 5" },
];
const STAGE_LABELS = [
  "Site Survey",
  "Bid",
  "Budget Approved",
  "PR",
  "PO",
  "Handover",
];
const APPLY = process.argv.includes("--apply");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const source = readFileSync(filePath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function normalizePrivateKey(raw) {
  let key = String(raw || "").trim();
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  const pem = key.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
  if (!pem) return key;
  const body = pem[1].replace(/\s+/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join("\n") || body}\n-----END PRIVATE KEY-----\n`;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(email, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(privateKey))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed (${response.status}).`);
  }
  const payload = await response.json();
  if (!payload.access_token) throw new Error("Google access token was not returned.");
  return payload.access_token;
}

function quotedSheet(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return clean(value).replace(/\s+/g, " ").toUpperCase();
}

async function googleJson(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Google Sheets request failed (${response.status}).`;
    throw new Error(message);
  }
  return body;
}

async function readMetadata(spreadsheetId, token) {
  const fields = encodeURIComponent(
    "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
  );
  return googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=${fields}`,
    token,
  );
}

async function batchGetValues(spreadsheetId, token, ranges) {
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  return googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    token,
  );
}

async function readStageValidation(spreadsheetId, token, targets) {
  const params = new URLSearchParams({
    includeGridData: "true",
    fields: "sheets(properties(sheetId,title),data(rowData(values(dataValidation))))",
  });
  for (const { sheet } of targets) {
    params.append("ranges", `${quotedSheet(sheet.title)}!T4`);
  }
  return googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?${params}`,
    token,
  );
}

function valueAt(rows, rowIndex, columnIndex) {
  return rows?.[rowIndex]?.[columnIndex] ?? "";
}

function validateTarget(sheet, headerRows, stageRows) {
  const checks = [
    [valueAt(headerRows, 1, 0), "ลำดับ", "A2"],
    [valueAt(headerRows, 1, 1), "รายการ", "B2"],
    [valueAt(headerRows, 2, 8), "BID", "I3"],
    [valueAt(headerRows, 2, 9), "PR", "J3"],
    [valueAt(headerRows, 2, 10), "PO", "K3"],
    [valueAt(headerRows, 2, 11), "CON", "L3"],
    [valueAt(headerRows, 1, 12), "สถานะ", "M2"],
    [valueAt(headerRows, 1, 18), "หมายเหตุ", "S2"],
  ];
  for (const [actual, expected, cell] of checks) {
    if (normalizeHeader(actual) !== normalizeHeader(expected)) {
      throw new Error(
        `${sheet.title}: ${cell} expected "${expected}" but found "${clean(actual) || "(blank)"}". No data was changed.`,
      );
    }
  }

  const stageHeader = clean(valueAt(stageRows, 0, 0));
  const dataValues = (stageRows || []).slice(2).map((row) => clean(row?.[0])).filter(Boolean);
  if (stageHeader && normalizeHeader(stageHeader) !== "STAGE") {
    throw new Error(`${sheet.title}: T2 is already used by "${stageHeader}". No data was changed.`);
  }
  if (!stageHeader && dataValues.length) {
    throw new Error(`${sheet.title}: column T contains data without a STAGE header. No data was changed.`);
  }
  const invalidValues = dataValues.filter((value) => (
    !STAGE_LABELS.some((label) => normalizeHeader(label) === normalizeHeader(value))
  ));
  if (invalidValues.length) {
    throw new Error(`${sheet.title}: column T contains unsupported stage values. No data was changed.`);
  }
  return { alreadyConfigured: normalizeHeader(stageHeader) === "STAGE", populatedRows: dataValues.length };
}

function migrationRequests(targets) {
  return targets.flatMap(({ sheet, alreadyConfigured }) => {
    const rowCount = Math.max(4, Math.min(Number(sheet.gridProperties?.rowCount || 1000), 5000));
    const requests = [];
    if (!alreadyConfigured) {
      requests.push(
        {
          copyPaste: {
            source: {
              sheetId: sheet.sheetId,
              startRowIndex: 1,
              endRowIndex: 3,
              startColumnIndex: 18,
              endColumnIndex: 19,
            },
            destination: {
              sheetId: sheet.sheetId,
              startRowIndex: 1,
              endRowIndex: 3,
              startColumnIndex: 19,
              endColumnIndex: 20,
            },
            pasteType: "PASTE_FORMAT",
            pasteOrientation: "NORMAL",
          },
        },
        {
          updateCells: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 19,
              endColumnIndex: 20,
            },
            rows: [{ values: [{ userEnteredValue: { stringValue: "STAGE" } }] }],
            fields: "userEnteredValue",
          },
        },
      );
    }
    requests.push(
      {
        setDataValidation: {
          range: {
            sheetId: sheet.sheetId,
            startRowIndex: 3,
            endRowIndex: rowCount,
            startColumnIndex: 19,
            endColumnIndex: 20,
          },
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: STAGE_LABELS.map((label) => ({ userEnteredValue: label })),
            },
            strict: true,
            showCustomUi: true,
          },
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: sheet.sheetId,
            dimension: "COLUMNS",
            startIndex: 19,
            endIndex: 20,
          },
          properties: { pixelSize: 145 },
          fields: "pixelSize",
        },
      },
    );
    return requests;
  });
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  const spreadsheetId = process.env.GOOGLE_SHEET_ID_BUDGET_UTILIZE || DEFAULT_SPREADSHEET_ID;
  const email = clean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  if (!email || !privateKey) {
    throw new Error("Google service account configuration is missing.");
  }

  const token = await getAccessToken(email, privateKey);
  const metadata = await readMetadata(spreadsheetId, token);
  const sheetsById = new Map(
    (metadata.sheets || []).map(({ properties }) => [Number(properties?.sheetId), properties]),
  );
  const sheetsByTitle = new Map(
    (metadata.sheets || []).map(({ properties }) => [clean(properties?.title), properties]),
  );

  const targets = TARGET_SHEETS.map((expected) => {
    const sheet = sheetsById.get(expected.id) || sheetsByTitle.get(expected.title);
    if (!sheet) throw new Error(`Target sheet ${expected.title} (${expected.id}) was not found.`);
    if (Number(sheet.gridProperties?.columnCount || 0) < 20) {
      throw new Error(`${expected.title}: fewer than 20 columns. No columns were inserted automatically.`);
    }
    return { expected, sheet };
  });

  const ranges = targets.flatMap(({ sheet }) => [
    `${quotedSheet(sheet.title)}!A1:T3`,
    `${quotedSheet(sheet.title)}!T2:T5000`,
  ]);
  const valuesPayload = await batchGetValues(spreadsheetId, token, ranges);
  const valueRanges = valuesPayload.valueRanges || [];
  const inspected = targets.map(({ expected, sheet }, index) => {
    const headerRows = valueRanges[index * 2]?.values || [];
    const stageRows = valueRanges[index * 2 + 1]?.values || [];
    const validation = validateTarget(expected, headerRows, stageRows);
    return { sheet, ...validation };
  });

  console.log(`${APPLY ? "APPLY" : "DRY RUN"}: guarded STAGE migration`);
  for (const target of inspected) {
    console.log(
      `- ${target.sheet.title}: ${target.alreadyConfigured ? "STAGE already present" : "T is empty and safe"}; existing stage rows ${target.populatedRows}`,
    );
  }

  if (!APPLY) {
    console.log("No Google Sheet data was changed. Re-run with --apply after reviewing this dry run.");
    return;
  }

  const requests = migrationRequests(inspected);
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    token,
    { method: "POST", body: JSON.stringify({ requests }) },
  );

  const verified = await batchGetValues(
    spreadsheetId,
    token,
    inspected.map(({ sheet }) => `${quotedSheet(sheet.title)}!T2:T3`),
  );
  verified.valueRanges?.forEach((range, index) => {
    const header = clean(range.values?.[0]?.[0]);
    if (normalizeHeader(header) !== "STAGE") {
      throw new Error(`${inspected[index].sheet.title}: STAGE header verification failed.`);
    }
  });
  const validationPayload = await readStageValidation(spreadsheetId, token, inspected);
  const validationById = new Map(
    (validationPayload.sheets || []).map((sheet) => [Number(sheet.properties?.sheetId), sheet]),
  );
  for (const target of inspected) {
    const validation = validationById
      .get(Number(target.sheet.sheetId))
      ?.data?.[0]?.rowData?.[0]?.values?.[0]?.dataValidation;
    const labels = (validation?.condition?.values || []).map((item) => clean(item.userEnteredValue));
    if (
      validation?.condition?.type !== "ONE_OF_LIST"
      || STAGE_LABELS.some((label) => !labels.includes(label))
    ) {
      throw new Error(`${target.sheet.title}: STAGE dropdown verification failed.`);
    }
  }
  console.log(`Applied and verified ${inspected.length} sheets, including dropdown validation. Existing project rows were not populated or moved.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
