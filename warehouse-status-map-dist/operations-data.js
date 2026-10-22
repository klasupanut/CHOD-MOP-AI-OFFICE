(function () {
  "use strict";

  const field = (key, label, aliases, unit = "") => ({ key, label, aliases: [key, ...aliases], unit });
  const categories = [
    { id: "slab", name: "Slab Renovation", icon: "layers", fields: [
      field("warehouseFloorOption", "Floor Option", ["warehouse floor option", "warehouse slab option", "slabRenovationOption", "slab option"]),
      field("slabRenovationStatus", "Renovation Status", ["warehouseFloorStatus", "warehouse slab status", "slabStatus", "slab renovation", "floor renovation status"]),
      field("slabType", "Slab Type", ["warehouseFloorType", "warehouse floor material", "floor type", "slab material"]),
      field("slabLoadCapacity", "Load Capacity", ["slab load capacity", "warehouse floor load capacity"]),
      field("slabPlanYear", "Plan Year", ["warehouseFloorPlanYear", "slab renovation plan year"]),
      field("slabRenovationDate", "Renovation Date", ["warehouseFloorRenovationDate", "slab date", "floor renovation date"]),
      field("slabRemark", "Notes", ["warehouseFloorRemark", "slab notes", "slab renovation remark"])
    ], officeFields: [
      field("officeRenovated", "Office Renovated", ["office renovated", "office renovation completed", "officeFloorCompleted"])
    ] },
    { id: "electrical", name: "Electrical & Pumbling System", icon: "zap", fields: [
      field("electricalStatus", "Electric Work Status", ["electric work status", "electrical work status", "electrical status", "electric status", "electrical system", "electric system status", "electricalRenovated"]),
      field("plumbingStatus", "Pumbling Renovated", ["pumbling renovated", "plumbing renovated", "pumblingStatus", "plumbing work status", "pumbling work status", "pumbling status"])
    ] },
    { id: "ventilation", name: "Ventilation System", icon: "fan", fields: [
      field("ventilationStep", "Work Step", ["ventilation work step", "ventilation stage", "ventilation package"]),
      field("ventilationStatus", "System Status", ["ventilation system", "ventilation system status"]),
      field("ventilationType", "System Type", ["ventilation type"]),
      field("shutterCanopyStatus", "Shutter Canopy", ["shutter awning status", "canopy status", "shutter canopy", "shutter awning"]),
      field("ventilationRemark", "Notes", ["ventilation notes"])
    ] },
    { id: "tariff", name: "Electricity Tariff", icon: "receipt-text", fields: [
      field("electricityTariffType", "Tariff Type", ["tariff type", "electricity billing type"]),
      field("electricityTimePeriod", "Time Period 1", ["electricity time period", "tariff time period"]),
      { ...field("electricityTariff", "Base Energy 1", ["electricity rate", "electric rate", "electricity sales rate", "power tariff", "tariff", "rate thb kwh"], "THB/kWh"), decimals: 4 },
      field("electricityTimePeriod2", "Time Period 2", ["electricity time period 2", "tariff time period 2"]),
      { ...field("electricityTariff2", "Base Energy 2", ["electricity tariff 2", "electricity rate 2"], "THB/kWh"), decimals: 4 },
      { ...field("electricityDemandCharge", "Demand Charge", ["electricity demand charge", "demand charge"], "THB/kW"), decimals: 2 },
      { ...field("electricityFt", "Ft", ["electricity ft", "ft charge"], "THB/kWh"), decimals: 4 },
      { ...field("electricityServiceCharge", "Service Charge", ["electricity service charge", "service charge"], "THB/month"), decimals: 2 }
    ] },
    { id: "lighting", name: "Interior Lighting", icon: "lightbulb", fields: [
      field("lightingStatus", "Lighting Status", ["interior lighting status", "lighting system", "interior lighting"]),
      field("lightingType", "Fixture Type", ["interior lighting type", "fixture type", "lamp type"]),
      field("lightingIlluminanceLux", "Illuminance", ["lighting lux", "illuminance", "lux"], "lux"),
      field("lightingPowerW", "Power", ["lighting wattage", "lighting power", "lighting watts"], "W"),
      field("lightingInspectionDate", "Inspection Date", ["lighting inspection date"]),
      field("lightingRemark", "Notes", ["lighting notes", "interior lighting remark"])
    ] }
  ];

  const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f]/g, "");
  const clean = (value) => String(value ?? "").trim();
  const present = (value) => !["", "-", "n/a", "null", "undefined"].includes(clean(value).toLowerCase());
  const noData = { key: "missing", label: "No data", color: "#869bad", text: "#071016", recorded: false, attention: false };
  const electricalColor = "#c28b18";
  const plumbingColor = "#65cfff";
  const tariffColors = Object.freeze({
    tou222: "#22dfcf",
    tou323: "#ffd45c",
    tod212: "#b790ff",
    tod: "#ff6b9c"
  });
  const palette = ["#60bfff", "#b9a4f5", "#78d8da", "#e3a3c6", "#a6cbed", "#e0c49a"];
  const floorOptionColors = new Map();
  const slabCategory = categories[0];
  // Reference taxonomy, not project data. Unit assignments and counts still come only from the sheet.
  const floorCatalog = [
    { id: "op1", label: "OP1 - On Ground", color: "#b7d5eb", plannedColor: "#83a9c9" },
    { id: "op2", label: "OP2 - 2 Ton", color: "#80d5a7", plannedColor: "#b499c9" },
    { id: "op3", label: "OP3 - 3 Ton", color: "#ffff79", plannedColor: "#ff7d81" },
    { id: "office05", label: "Office", color: "#c4a6ff", plannedColor: "#9a8cff" }
  ];
  const stepCatalog = [
    { id: "step1", label: "STEP 1 - I+L", symbols: 1 },
    { id: "step2", label: "STEP 2 - R+I+L+J", symbols: 2 }
  ];

  function workStage(value) {
    const key = normalize(value);
    if (/^(plan|planned|plannedwork|pending|notstarted|scheduled|future|upcoming|tobedone|แผน|แผนงาน|รอดำเนินการ|ยังไม่เริ่ม|กำลังจะทำ|ที่จะทำ)$/.test(key) || /^แผนงานปี/.test(key)) return "planned";
    if (/^(completed?|completedpastwork|done|renovated|installed|operational|past|historical|existing|previouslycompleted|previouslyrenovated|เสร็จ|เสร็จแล้ว|ทำแล้ว|ทำแล้วในอดีต|ดำเนินการแล้ว|ปรับปรุงแล้ว|ติดตั้งแล้ว)$/.test(key)) return "completed";
    if (/^(inprogress|ongoing|underconstruction|renovating|underrepair|กำลังดำเนินการ|กำลังปรับปรุง)$/.test(key)) return "inprogress";
    return "unspecified";
  }

  function findFloorOption(value, part) {
    const key = normalize(value);
    if (part === "office") return /^(office|officefloor|office05|office05ton|office05ตัน|05|05ton|05tons|05ตัน|พื้นสำนักงาน)(sqm|m2)?$/.test(key) ? floorCatalog[3] : null;
    if (/^(op1|option1|op1onground|onground|slabonground)$/.test(key)) return floorCatalog[0];
    if (/^(op2|option2|op22ton|op22tons|op22ตัน|2ton|2tons|2ตัน)(sqm|m2)?$/.test(key)) return floorCatalog[1];
    if (/^(op3|option3|op33ton|op33tons|op33ตัน|3ton|3tons|3ตัน)(sqm|m2)?$/.test(key)) return floorCatalog[2];
    return null;
  }

  function findStep(value) {
    const key = normalize(value);
    if (/^(1|step1|il|step1il)$/.test(key)) return stepCatalog[0];
    if (/^(2|step2|rilj|step2rilj)$/.test(key)) return stepCatalog[1];
    return null;
  }

  function ventilationVisual(row) {
    const values = row?.operations || {};
    const definition = categories.find((item) => item.id === "ventilation");
    if (!definition.fields.some((item) => present(values[item.key]))) return noData;
    const step = findStep(values.ventilationStep || values.ventilationType);
    const stage = workStage(values.ventilationStatus);
    const statusVisual = present(values.ventilationStatus) ? valueVisual(values.ventilationStatus, { unit: "" }) : null;
    if (!step) return statusVisual || { ...noData, key: "recorded", label: present(values.ventilationStep) ? clean(values.ventilationStep) : "Recorded", recorded: true };
    const planned = stage === "planned";
    const suffix = planned ? " / Planned" : stage === "inprogress" ? " / In Progress" : stage === "unspecified" ? " / Status unspecified" : "";
    return { key: `${step.id}:${stage}`, label: `${step.label}${suffix}`,
      color: planned || statusVisual?.attention ? "#ff454f" : stage === "completed" ? "#00c86a" : stage === "inprogress" ? "#efc86a" : "#869bad", text: "#071016", recorded: true,
      attention: Boolean(statusVisual?.attention), stage, planned, stepId: step.id, symbols: step.symbols,
      optionLabel: stage === "unspecified" || stage === "inprogress" ? `${step.label}${suffix}` : step.label };
  }

  function canopyVisual(row) {
    const raw = clean(row?.operations?.shutterCanopyStatus);
    if (!present(raw)) return noData;
    const stage = workStage(raw);
    const attention = valueVisual(raw, { unit: "" }).attention;
    const installed = /^(yes|true|1|installed|completed?|done|มี|ติดตั้งแล้ว)$/.test(normalize(raw));
    return { key: `canopy:${normalize(raw)}`, label: `Shutter Canopy - ${raw}`, optionLabel: "Shutter Canopy",
      color: stage === "planned" || attention ? "#ff454f" : installed ? "#00c86a" : "#869bad", text: "#071016", stage,
      recorded: true, attention, planned: stage === "planned", installed, icon: "store" };
  }

  function floorFields(part) { return part === "office" ? slabCategory.officeFields : slabCategory.fields; }

  function hasFloorData(row, part) {
    return floorFields(part).some((definition) => present(row?.operations?.[definition.key]));
  }

  function officeCompletion(row) {
    const raw = clean(row?.operations?.officeRenovated);
    if (/^(true|yes|1|checked|completed?|done|renovated|ปรับปรุงแล้ว|ทำแล้ว)$/.test(normalize(raw))) return true;
    if (/^(false|no|0|unchecked|notcompleted|notrenovated|ยังไม่ได้ทำ)$/.test(normalize(raw))) return false;
    if (present(raw)) return null;
    return workStage(row?.operations?.officeFloorStatus) === "completed" ? true : null;
  }

  function hasOffice(row) { return officeCompletion(row) === true; }

  function checkboxCompletion(value) {
    const key = normalize(value);
    if (/^(true|yes|1|checked|completed?|done|renovated|ปรับปรุงแล้ว|ทำแล้ว)$/.test(key)) return true;
    if (/^(false|no|0|unchecked|notcompleted|notrenovated|ยังไม่ได้ทำ)$/.test(key)) return false;
    return null;
  }

  function electricalCompletion(row) {
    return renovationStatus(row?.operations?.electricalStatus);
  }

  function plumbingCompletion(row) { return renovationStatus(row?.operations?.plumbingStatus); }

  function renovationStatus(value) {
    return checkboxCompletion(value);
  }

  function renovationVisual(row, part) {
    const completed = part === "electrical" ? electricalCompletion(row) : plumbingCompletion(row);
    return { ...noData, key: completed === null ? "missing" : completed ? "renovated" : "not-renovated",
      label: completed === null ? "No data" : completed ? "Renovated" : "Not Renovated",
      color: completed === true ? part === "electrical" ? electricalColor : plumbingColor : noData.color,
      recorded: completed !== null, renovated: completed === true };
  }

  function electricalVisual(row) {
    const electric = renovationVisual(row, "electrical"), plumbing = renovationVisual(row, "plumbing");
    if (!electric.recorded && !plumbing.recorded) return noData;
    const both = electric.renovated && plumbing.renovated;
    const bothRecorded = electric.recorded && plumbing.recorded;
    return { ...noData, key: both ? "both:renovated" : electric.renovated ? "electrical:renovated" : plumbing.renovated ? "plumbing:renovated" : bothRecorded ? "not-renovated" : "partial",
      label: both ? "Both renovated" : electric.renovated ? "Electrical renovated" : plumbing.renovated ? "Pumbling renovated" : bothRecorded ? "Not Renovated" : "Partially recorded",
      color: electric.renovated ? electricalColor : noData.color,
      recorded: true, renovated: electric.renovated };
  }

  function floorOption(row, part) {
    const values = row?.operations || {};
    const keys = part === "office" ? ["officeFloorOption", "officeFloorType"] : ["warehouseFloorOption", "slabType"];
    return keys.map((key) => clean(values[key])).find(present) || "";
  }

  function optionColor(key) {
    if (!floorOptionColors.has(key)) {
      const index = floorOptionColors.size;
      floorOptionColors.set(key, palette[index] || `hsl(${Math.round(index * 137.508) % 360} 65% 72%)`);
    }
    return floorOptionColors.get(key);
  }

  function prepareOptions(rows) {
    [...new Set(rows.flatMap((row) => [floorOption(row, "warehouse"), floorOption(row, "office")]).filter(present).map(normalize))]
      .sort().forEach(optionColor);
  }

  function fromSheet(source) {
    const columns = new Map(Object.entries(source).map(([key, value]) => [normalize(key), value]));
    const definitions = [...categories.flatMap((category) => [...category.fields, ...(category.officeFields || [])]),
      field("officeFloorStatus", "Legacy Office Status", ["office slab status", "officeRenovationStatus"])];
    const values = Object.fromEntries(definitions.map((definition) => {
      const key = definition.aliases.find((alias) => present(columns.get(normalize(alias))));
      return [definition.key, key ? clean(columns.get(normalize(key))) : ""];
    }));
    // Capacity follows the recorded floor option, never an independent manual value.
    const option = findFloorOption(values.warehouseFloorOption, "warehouse");
    values.slabLoadCapacity = option?.id === "op1" ? "N/A" : option?.id === "op2" ? "2 Ton/sq.m." : option?.id === "op3" ? "3 Ton/sq.m." : "";
    return values;
  }

  function display(value, definition) {
    if (definition.key === "slabLoadCapacity" && clean(value).toUpperCase() === "N/A") return "N/A";
    if (!present(value)) return "-";
    if (definition.key === "officeRenovated") {
      const completed = checkboxCompletion(value);
      return completed === true ? "Completed" : completed === false ? "Not marked complete" : "-";
    }
    if (["electricalStatus", "plumbingStatus"].includes(definition.key)) {
      const completed = renovationStatus(value);
      return completed === true ? "Renovated" : completed === false ? "Not Renovated" : "-";
    }
    const text = clean(value);
    if (definition.decimals !== undefined && /^-?[\d,.]+$/.test(text)) {
      const number = Number(text.replace(/,/g, ""));
      if (Number.isFinite(number)) return `${number.toLocaleString("en-US", { minimumFractionDigits: definition.decimals, maximumFractionDigits: definition.decimals })} ${definition.unit}`.trim();
    }
    return definition.unit && /^-?[\d,.]+$/.test(text) ? `${text} ${definition.unit}` : text;
  }

  function tariffPeriods(row) {
    const values = row?.operations || {};
    const periods = [{ time: values.electricityTimePeriod ?? "", rate: values.electricityTariff ?? "" }];
    if (present(values.electricityTimePeriod2) || present(values.electricityTariff2)) periods.push({ time: values.electricityTimePeriod2 ?? "", rate: values.electricityTariff2 ?? "" });
    return periods;
  }

  function visual(row, category) {
    if (category.id === "slab") return floorVisual(row, "warehouse");
    if (category.id === "electrical") return electricalVisual(row);
    if (category.id === "ventilation") return ventilationVisual(row);
    const values = row?.operations || {};
    if (!category.fields.some((definition) => present(values[definition.key]))) return noData;
    const primary = category.fields[0];
    const raw = clean(values[primary.key]);
    if (!present(raw)) return { key: "recorded", label: "Recorded", color: "#60bfff", text: "#071016", recorded: true, attention: false };
    const result = valueVisual(raw, primary);
    return category.id === "tariff" && tariffColors[result.key] ? { ...result, color: tariffColors[result.key] } : result;
  }

  function valueVisual(raw, primary) {
    const key = normalize(raw);
    let color = palette[[...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
    const attention = /^(fault|faulty|failed|defect|damaged|repairrequired|requiresrepair|requiresattention|needsrepair|poor|notworking|overdue|critical)$/.test(key);
    if (attention) color = "#ff879a";
    else if (/^(completed?|done|renovated|operational|normal|good|working|installed|pass|passed)$/.test(key)) color = "#5ddbb9";
    else if (/^(inprogress|ongoing|underconstruction|renovating|underrepair)$/.test(key)) color = "#efc86a";
    else if (/^(planned|pending|notstarted|notinstalled)$/.test(key)) color = "#b9a4f5";
    return { key, label: display(raw, primary), color, text: "#071016", recorded: true, attention };
  }

  function floorVisual(row, part) {
    if (part === "office") {
      const completed = officeCompletion(row);
      return { ...noData, key: completed === true ? "office:completed" : completed === false ? "office:unchecked" : "missing",
        label: completed === true ? "Office renovated" : completed === false ? "Not marked complete" : "No data",
        color: completed === true ? floorCatalog[3].color : noData.color, recorded: completed !== null,
        classified: completed === true, optionId: "office05", stage: completed === true ? "completed" : "unspecified" };
    }
    if (!hasFloorData(row, part)) return noData;
    const option = floorOption(row, part);
    const statusKey = part === "office" ? "officeFloorStatus" : "slabRenovationStatus";
    const rawStatus = clean(row?.operations?.[statusKey]);
    const attention = present(rawStatus) && valueVisual(rawStatus, { unit: "" }).attention;
    const reference = part === "office" ? floorCatalog[3] : findFloorOption(option, part);
    const stage = workStage(rawStatus);
    const planned = stage === "planned" || stage === "inprogress";
    const classified = Boolean(reference && (stage === "completed" || planned));
    const optionLabel = reference?.label || (option ? "Unmapped floor option" : "Floor option not specified");
    const suffix = classified ? planned ? " / Planned" : " / Completed" : " / Status or option missing";
    return { key: reference ? `option:${reference.id}:${stage}` : "unclassified",
      label: `${optionLabel}${suffix}`, optionLabel,
      color: classified ? planned ? reference.plannedColor : reference.color : noData.color,
      text: "#071016", recorded: true, attention, optionId: reference?.id || "", stage, planned, classified };
  }

  function summary(rows, category) {
    const visuals = rows.map((row) => {
      const warehouse = visual(row, category);
      if (category.id === "ventilation") {
        const canopy = canopyVisual(row);
        return { recorded: warehouse.recorded || canopy.recorded, attention: warehouse.attention || canopy.attention };
      }
      if (category.id !== "slab") return warehouse;
      const office = floorVisual(row, "office");
      return { recorded: warehouse.recorded || office.recorded, attention: warehouse.attention || office.attention };
    });
    const recorded = visuals.filter((item) => item.recorded).length;
    return { total: rows.length, recorded, attention: visuals.filter((item) => item.attention).length,
      missing: rows.length - recorded, coverage: rows.length ? recorded / rows.length * 100 : null };
  }

  function legend(rows, category, part = "warehouse") {
    const entries = new Map();
    rows.filter((row) => part !== "office" || hasOffice(row)).forEach((row) => {
      const item = category.id === "slab" ? floorVisual(row, part) : visual(row, category);
      const existing = entries.get(item.key);
      entries.set(item.key, { ...item, count: (existing?.count || 0) + 1 });
    });
    if (!entries.size) entries.set(noData.key, { ...noData, count: 0 });
    return [...entries.values()].sort((a, b) => Number(b.recorded) - Number(a.recorded) || a.label.localeCompare(b.label, "en", { numeric: true }));
  }

  function referenceLegend(rows, category) {
    if (category.id === "electrical") return [{ title: "Renovation Status", kind: "floor", items: [
      { label: "Electrical renovated", color: electricalColor, count: rows.filter((row) => electricalCompletion(row) === true).length },
      { label: "Pumbling renovated", color: plumbingColor, kind: "plumbing", count: rows.filter((row) => plumbingCompletion(row) === true).length },
      { label: "Not Renovated", color: noData.color, count: rows.filter((row) => electricalCompletion(row) === false && plumbingCompletion(row) === false).length }
    ] }];
    if (category.id === "slab") {
      const warehouse = legend(rows, category);
      const entryFor = (definition, planned = false) => ({
        ...definition, key: `${definition.id}:${planned ? "planned" : "completed"}`, optionLabel: definition.label,
        kind: definition.id === "office05" ? "office" : "floor",
        color: planned ? definition.plannedColor : definition.color, planned,
        count: warehouse
          .filter((item) => item.classified && item.optionId === definition.id && Boolean(item.planned) === planned)
          .reduce((sum, item) => sum + item.count, 0)
      });
      return [
        { title: "Completed / Past Work", kind: "floor", items: floorCatalog.slice(0, 3).map((item) => entryFor(item)) },
        { title: "Planned Work", kind: "floor", items: floorCatalog.slice(0, 3).map((item) => entryFor(item, true)),
          unclassified: {
            warehouse: warehouse.filter((item) => !item.classified).reduce((sum, item) => sum + item.count, 0),
            office: 0
          } },
        { title: "Office", kind: "office", items: [{ label: "Office renovated", color: floorCatalog[3].color, count: rows.filter(hasOffice).length }] }
      ];
    }
    if (category.id === "ventilation") {
      const values = legend(rows, category);
      const current = stepCatalog.map((step) => ({ ...step, key: step.id, optionLabel: step.label, color: "#00c86a",
        count: values.filter((item) => item.stepId === step.id && item.stage === "completed").reduce((sum, item) => sum + item.count, 0) }));
      const planned = stepCatalog.map((step) => ({ ...step, key: `${step.id}:planned`, optionLabel: step.label, color: "#ff454f", planned: true,
        count: values.filter((item) => item.stepId === step.id && item.planned).reduce((sum, item) => sum + item.count, 0) }));
      const canopies = new Map();
      rows.forEach((row) => { const item = canopyVisual(row); if (item.recorded) canopies.set(item.key, { ...item, count: (canopies.get(item.key)?.count || 0) + 1 }); });
      return [
        { title: "Ventilation Work", kind: "step", items: [...current, ...values.filter((item) => !item.stepId || (!item.planned && item.stage !== "completed"))] },
        { title: "Planned Work", kind: "step", items: planned },
        { title: "Shutter Canopy", kind: "canopy", items: canopies.size ? [...canopies.values()] : [{ ...noData, count: rows.length }] }
      ];
    }
    return [{ title: category.name, kind: "floor", items: legend(rows, category) }];
  }

  const inputOptions = {
    warehouseFloorOption: floorCatalog.slice(0, 3).map((item) => item.label),
    slabRenovationStatus: ["Completed / Past Work", "Planned Work"],
    ventilationStep: stepCatalog.map((item) => item.label),
    ventilationStatus: ["Completed / Past Work", "Planned Work", "In Progress"],
    shutterCanopyStatus: ["Installed", "Planned", "Needs Repair", "Not Installed"],
    lightingStatus: ["Operational", "Needs Repair", "Planned", "In Progress", "Not Installed"]
  };

  window.WarehouseOperations = { categories, inputOptions, fromSheet, display, visual, summary, legend, noData,
    floorVisual, floorFields, hasFloorData, hasOffice, officeCompletion, electricalCompletion, plumbingCompletion, electricalVisual, renovationVisual, tariffPeriods,
    prepareOptions, referenceLegend, ventilationVisual, canopyVisual };
})();
