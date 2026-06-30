import type { ApprovedUser } from "./types";
import type { AgentId } from "@/lib/types";

const SESSION_WINDOW_MS = 8 * 60 * 60 * 1000;

function fallbackCharacterId(email: string): AgentId | "" {
  return email.toLowerCase() === "chod.mopteam@gmail.com" ? "kla" : "";
}

function isRecentlySeen(user: ApprovedUser, now: Date) {
  if (!user.active || !user.lastSignInProvider) return false;
  const lastTouched = Date.parse(user.updatedAt || "");
  if (Number.isNaN(lastTouched)) return false;
  return now.getTime() - lastTouched <= SESSION_WINDOW_MS;
}

export function getOnlineCharacterIds(users: ApprovedUser[], now = new Date()): AgentId[] {
  const online = new Set<AgentId>();

  for (const user of users) {
    if (!isRecentlySeen(user, now)) continue;
    const characterId = user.characterId || fallbackCharacterId(user.email);
    if (characterId) online.add(characterId);
  }

  return [...online];
}
