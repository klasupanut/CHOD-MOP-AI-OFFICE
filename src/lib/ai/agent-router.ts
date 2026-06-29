import type { AgentId } from "@/lib/types";

const FITOUT_KEYWORDS = ["fit-out", "fitout", "mini fit-out", "mega fit-out", "งานตกแต่ง", "งานต่อเติม"];

const TASK_PROJECT_KEYWORDS = [
  "task",
  "tasks",
  "project",
  "projects",
  "งานของ",
  "งานค้าง",
  "overdue",
  "รอ tammasit",
  "สรุป task",
  "สรุป project",
  "fit-out b8",
];

const APPROVAL_KEYWORDS = [
  "approve",
  "approval",
  "approvals",
  "quotation approval",
  "quotation รออนุมัติ",
  "อนุมัติ quotation",
  "รออนุมัติ",
  "สิทธิอนุมัติ",
  "ใครอนุมัติ",
  "tammasit approve",
  "moss review",
  "fit-out รอใคร",
  "งานที่ต้องให้ tammasit เซ็น",
];

const keywordRoutes: Array<{ agent: AgentId; keywords: string[] }> = [
  { agent: "foreman", keywords: ["pm", "maintenance", "renovation cycle", "sla", "ซ่อม", "รอบ"] },
  { agent: "film", keywords: ["quotation", "document", "ใบเสนอราคา", "เอกสาร"] },
  { agent: "kla", keywords: ["shop drawing", "calculation", "major renovation", "drawing", "แบบ", "คำนวณ"] },
  { agent: "moss", keywords: ["solar", "electrical", "power", "ไฟฟ้า", "โซลาร์"] },
];

function includesAny(question: string, keywords: string[]) {
  return keywords.some((keyword) => question.includes(keyword));
}

export function isFitoutQuestion(question: string) {
  return includesAny(question.toLowerCase(), FITOUT_KEYWORDS);
}

function routeApprovalQuestion(question: string): AgentId {
  if (includesAny(question, ["moss", "electrical", "solar", "ไฟฟ้า", "โซลาร์"])) return "moss";
  if (includesAny(question, ["kla", "fit-out", "fitout", "renovation", "drawing", "งานตกแต่ง", "งานต่อเติม"])) return "kla";
  if (includesAny(question, ["film", "quotation", "document", "ใบเสนอราคา", "เอกสาร"])) return "film";
  if (includesAny(question, ["foreman", "pm", "maintenance", "site"])) return "foreman";
  return "tammasit";
}

function routeFitoutQuestion(question: string): AgentId {
  if (includesAny(question, ["quotation", "document", "ใบเสนอราคา", "เอกสาร"])) return "film";
  if (includesAny(question, ["approval", "overview", "summary", "อนุมัติ", "สรุป"])) return "tammasit";
  if (includesAny(question, ["site", "progress", "หน้างาน", "ความคืบหน้า"])) return "foreman";
  if (includesAny(question, ["electrical", "ไฟฟ้า"])) return "moss";
  return "kla";
}

export function routeQuestion(question: string): AgentId {
  const normalized = question.toLowerCase();
  if (includesAny(normalized, APPROVAL_KEYWORDS)) return routeApprovalQuestion(normalized);
  if (includesAny(normalized, FITOUT_KEYWORDS)) return routeFitoutQuestion(normalized);
  if (includesAny(normalized, TASK_PROJECT_KEYWORDS)) {
    if (includesAny(normalized, ["film", "quotation", "document", "เอกสาร"])) return "film";
    if (includesAny(normalized, ["moss", "solar", "electrical", "ไฟฟ้า"])) return "moss";
    if (includesAny(normalized, ["kla", "drawing", "engineering", "fit-out b8"])) return "kla";
    if (includesAny(normalized, ["foreman", "pm", "site", "overdue"])) return "foreman";
    return "tammasit";
  }
  return keywordRoutes.find(({ keywords }) => includesAny(normalized, keywords))?.agent ?? "tammasit";
}

export function mockAnswer(question: string, agent: AgentId) {
  const normalized = question.toLowerCase();

  if (includesAny(normalized, APPROVAL_KEYWORDS)) {
    const approvalAnswers: Record<AgentId, string> = {
      tammasit: "Quotation approvals ตอนนี้มี 2 รายการรออนุมัติ: CHOD-FO-26-003 Fit-out B8 และ CHOD-EQ-26-011 Electrical upgrade. Tammasit อนุมัติ final ได้ทุก scope.",
      film: "Film เป็นคนเตรียมและส่ง quotation/document เข้าคิวอนุมัติ แต่ค่าเริ่มต้นยังไม่มีสิทธิ approve. งานที่ควรตามคือ CHOD-FO-26-003 Fit-out B8.",
      kla: "Kla review/recommend ได้เฉพาะ Fit-out และ Renovation. ถ้าเกินวงเงินหรือเป็น final approval ต้องส่งต่อ Tammasit. ตอนนี้ CHOD-FO-26-003 อยู่ใน scope ของ Kla.",
      moss: "Moss review/recommend ได้เฉพาะ Electrical และ Solar ภายในวงเงิน mock 500,000 บาท. ตอนนี้ CHOD-EQ-26-011 รอ Moss review และ Tammasit final.",
      foreman: "Foreman ยังไม่มีสิทธิ approve quotation ค่าเริ่มต้น แต่ช่วยแจ้ง site detail/PM detail เพื่อให้ quotation ผ่านอนุมัติเร็วขึ้นได้.",
    };
    return { agent, answer: approvalAnswers[agent], question, mode: "mock" as const };
  }

  if (includesAny(normalized, TASK_PROJECT_KEYWORDS)) {
    const taskAnswers: Record<AgentId, string> = {
      tammasit: "สรุปวันนี้: มี 10 tasks, overdue 2, waiting approval 2. Project ที่ต้องตามคือ Fit-out B8, PM Loop F7 และ Solar CHOD-03.",
      film: "งานของ Film วันนี้: Prepare Fit-out B8 quotation, Upload Fit-out document package และ weekly operation summary. ควรปิด quotation Fit-out B8 ก่อน.",
      kla: "งานของ Kla วันนี้: Review shop drawing Fit-out B8, Check engineering scope และ Major Renovation Drawing Review.",
      foreman: "Foreman มีงาน site/PM ค้าง: Update site progress overdue, Close overdue PM work orders และ Site measurement B8.",
      moss: "งานของ Moss วันนี้: Review electrical scope/quotation สำหรับ Fit-out B8 และ Check inverter output variance ของ Solar CHOD-03.",
    };
    return { agent, answer: taskAnswers[agent], question, mode: "mock" as const };
  }

  const fitoutAnswers: Record<AgentId, string> = {
    tammasit: "Fit-out มี active 8 งาน: Mini Fit-out 5 งาน และ Mega Fit-out 3 งาน มี 3 รายการรออนุมัติและ 2 งานเกินกำหนด ควรเร่ง approval กับ handover ก่อน.",
    film: "เอกสาร Fit-out มี quotation รอตรวจ 2 ชุด และ document control รอส่งอนุมัติ 3 รายการ แนะนำปิด quotation status ก่อน 14:00.",
    kla: "Fit-out engineering review มี drawing รอตรวจ 2 ชุด และ Mega Fit-out 1 งานเสี่ยงด้าน revision ควรเทียบ shop drawing กับหน้างานวันนี้.",
    foreman: "Fit-out site progress มี 2 งานช้ากว่าแผน และ 1 handover pending ควรอัปเดต site progress พร้อมแจ้งประเด็นหน้างานให้ Kla.",
    moss: "Fit-out electrical scope มี 1 quotation และ 1 งานระบบไฟฟ้ารอตรวจโหลด ถ้าไม่เกี่ยวกับ electrical ให้ route กลับ Kla หรือ Film.",
  };

  const answers: Record<AgentId, string> = {
    tammasit: "วันนี้ควรเร่ง 3 เรื่อง: ปิด PM overdue 3 งาน, เคลียร์อนุมัติ quotation 2 รายการ และติดตามความเสี่ยง Major Renovation 1 โครงการ.",
    film: "มีเอกสารและ quotation รออนุมัติ 2 รายการ โดย CHOD-FO-26-003 เพิ่งส่งให้ตรวจ ควรตามลายเซ็นก่อนบ่าย.",
    kla: "Shop Drawing Rev.02 อัปโหลดแล้ว แต่มี Major Renovation 1 โครงการที่ต้องเทียบ revision และตรวจ calculation report วันนี้.",
    foreman: "PM overdue 3 งาน และมีรอบบำรุงรักษาใกล้ถึงกำหนด ควรโทรยืนยันผู้รับเหมาและอัปเดต SLA ก่อนเที่ยง.",
    moss: "Solar CHOD-03 มี output variance 1 จุด ควรตรวจ inverter log พร้อมอัปเดต electrical quotation ที่เปิดอยู่.",
  };

  return {
    agent,
    answer: isFitoutQuestion(question) ? fitoutAnswers[agent] : answers[agent],
    question,
    mode: "mock" as const,
  };
}
