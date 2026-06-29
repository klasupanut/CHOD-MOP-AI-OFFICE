"use client";

import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Agent } from "@/lib/types";

type Props = {
  agent: Agent;
  active: boolean;
  canFaceFront: boolean;
  online: boolean;
  onSelect: (agentId: Agent["id"]) => void;
};

export function CharacterInfoOverlay({ agent, active, canFaceFront, online, onSelect }: Props) {
  const critical = agent.id === "foreman";
  const warning = agent.id === "kla" || agent.id === "moss";
  const Icon = critical || warning ? AlertTriangle : agent.id === "tammasit" ? Activity : CheckCircle2;

  return (
    <button
      type="button"
      className={`character-info info-${agent.id} ${active ? "is-active" : ""} ${critical ? "is-critical" : warning ? "is-warning" : ""} ${online ? "is-online" : "is-offline"}`}
      onClick={() => {
        if (canFaceFront) onSelect(agent.id);
      }}
      aria-pressed={active}
      aria-label={canFaceFront ? `Turn ${agent.name} toward the office` : `${agent.name} has a working view only`}
    >
      <span className="info-signal" title={online ? "Logged in" : "Not logged in"} />
      <span className="info-copy">
        <strong>{agent.name}</strong>
        <small>{agent.station}</small>
        <span className="info-status">{active ? "Looking at you" : online ? "Online now" : "Offline"}</span>
      </span>
      <Icon size={16} />
    </button>
  );
}
