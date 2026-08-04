"use client";

import { Activity, CheckCircle2 } from "lucide-react";
import type { Agent } from "@/lib/types";

type Props = {
  agent: Agent;
  active: boolean;
  canFaceFront: boolean;
  online: boolean;
  onSelect: (agentId: Agent["id"]) => void;
};

export function CharacterInfoOverlay({ agent, active, canFaceFront, online, onSelect }: Props) {
  const Icon = agent.id === "tammasit" ? Activity : CheckCircle2;

  return (
    <button
      type="button"
      className={`character-info info-${agent.id} ${active ? "is-active" : ""} ${online ? "is-online" : "is-offline"}`}
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
