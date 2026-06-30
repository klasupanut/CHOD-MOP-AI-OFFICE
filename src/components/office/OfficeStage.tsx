"use client";

import { agents } from "@/data/agents";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "@/lib/types";
import { AskHQOverlay } from "./AskHQOverlay";
import { CharacterInfoOverlay } from "./CharacterInfoOverlay";
import { CharacterLayer } from "./CharacterLayer";
import { OfficeBackStationLayer } from "./OfficeBackStationLayer";
import { OfficeBaseLayer } from "./OfficeBaseLayer";
import { OfficeExecutiveStationLayer } from "./OfficeExecutiveStationLayer";
import { OfficeFrontOcclusionLayer } from "./OfficeFrontOcclusionLayer";
import { OfficeMiddleStationLayer } from "./OfficeMiddleStationLayer";
import { OfficeTimeLightingLayer } from "./OfficeTimeLightingLayer";
import { TammasitDashboardWall } from "./TammasitDashboardWall";
import { useThailandTime } from "./ThailandTimeController";
import type { ApprovedUser } from "@/lib/auth/types";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";
import type { AgentId } from "@/lib/types";

const frontFacingAgents = new Set<Agent["id"]>(["tammasit", "film", "kla", "moss"]);
const showAiHq = process.env.NEXT_PUBLIC_SHOW_AI_HQ === "true";

export function OfficeStage({
  currentUser,
  dashboardData,
  onlineCharacterIds,
}: {
  currentUser: ApprovedUser;
  dashboardData: LiveDashboardData;
  onlineCharacterIds: AgentId[];
}) {
  const { period, timeLabel } = useThailandTime();
  const [activeAgent, setActiveAgent] = useState<Agent["id"] | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserCharacterId = currentUser.characterId || (currentUser.email.toLowerCase() === "chod.mopteam@gmail.com" ? "kla" : "");
  const onlineCharacters = new Set<AgentId>(onlineCharacterIds.length ? onlineCharacterIds : currentUserCharacterId ? [currentUserCharacterId] : []);
  const director = agents.find((agent) => agent.id === "tammasit");
  const middleAgents = agents.filter((agent) => agent.id === "film" || agent.id === "kla");
  const frontAgents = agents.filter((agent) => agent.id === "foreman" || agent.id === "moss");
  const showFrontView = useCallback((agentId: Agent["id"]) => {
    if (!frontFacingAgents.has(agentId)) return;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setActiveAgent(agentId);
    resetTimer.current = setTimeout(() => {
      setActiveAgent(null);
      resetTimer.current = null;
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  return (
    <section className={`office-stage period-${period}`} aria-label="CHOD MOP OFFICE operations floor">
      <OfficeBaseLayer period={period} />
      <OfficeTimeLightingLayer />
      <TammasitDashboardWall data={dashboardData} />
      <OfficeExecutiveStationLayer />
      <OfficeMiddleStationLayer />
      <OfficeBackStationLayer />
      {director ? <CharacterLayer agent={director} isLooking={activeAgent === director.id} /> : null}
      {middleAgents.map((agent) => <CharacterLayer agent={agent} isLooking={activeAgent === agent.id} key={agent.id} />)}
      <OfficeFrontOcclusionLayer />
      {frontAgents.map((agent) => <CharacterLayer agent={agent} isLooking={activeAgent === agent.id} key={agent.id} />)}

      <div className="stage-topline">
        <div><span className="live-dot" /> LIVE OFFICE</div>
        <div>{timeLabel} ICT · {period.replace("-", " ").toUpperCase()}</div>
      </div>
      {agents.map((agent) => (
        <CharacterInfoOverlay
          agent={agent}
          active={activeAgent === agent.id}
          canFaceFront={frontFacingAgents.has(agent.id)}
          online={onlineCharacters.has(agent.id)}
          onSelect={showFrontView}
          key={agent.id}
        />
      ))}
      {showAiHq ? <AskHQOverlay /> : null}
    </section>
  );
}
