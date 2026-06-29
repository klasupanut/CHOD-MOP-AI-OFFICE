"use client";

import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { useState } from "react";
import type { Agent } from "@/lib/types";

const sizes: Record<Agent["id"], string> = {
  tammasit: "character-director",
  film: "character-middle",
  kla: "character-middle",
  foreman: "character-lower",
  moss: "character-lower",
};

const frontFacingAgents = new Set<Agent["id"]>(["tammasit", "film", "kla", "moss"]);

export function CharacterLayer({ agent, isLooking }: { agent: Agent; isLooking: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasFrontAsset = frontFacingAgents.has(agent.id);
  const backAsset = `/assets/characters/${agent.id}-back.png`;
  const frontAsset = hasFrontAsset ? `/assets/characters/${agent.id}-front.png` : null;

  return (
    <div className={`character-layer character-${agent.id} ${sizes[agent.id]} ${isLooking ? "is-looking" : ""}`}>
      <motion.div
        className="character-motion"
        animate={isLooking ? { y: [0, -2, 0] } : { y: [0, -3, 0], rotate: [-0.25, 0.35, -0.25] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: agent.id.length * 0.08 }}
      >
        <motion.div
          className="character-body"
          animate={isLooking ? { scaleY: 1.01, x: 0 } : { scaleY: [1, 1.008, 1], x: [0, 1, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {imageFailed ? (
            <div className="character-fallback">
              <UserRound size={28} />
              <span>{agent.name}</span>
            </div>
          ) : (
            <div className="character-swap-frame">
              <img
                className={`character-swap-image character-back ${isLooking ? "" : "is-visible"}`}
                src={backAsset}
                alt={`${agent.name}, ${agent.role}, working at desk`}
                onError={() => setImageFailed(true)}
                draggable={false}
              />
              {frontAsset ? (
                <img
                  className={`character-swap-image character-front ${isLooking ? "is-visible" : ""}`}
                  src={frontAsset}
                  alt=""
                  aria-hidden={!isLooking}
                  onError={() => setImageFailed(true)}
                  draggable={false}
                />
              ) : null}
            </div>
          )}
        </motion.div>
        <motion.span
          className="typing-indicator"
          animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.72, 1, 0.72] }}
          transition={{ duration: 1.25, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}
