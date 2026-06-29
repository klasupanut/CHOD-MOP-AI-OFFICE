"use client";

import { Bot, Clock3, Cloud, Database, Globe2, KeyRound, ShieldCheck, WalletCards } from "lucide-react";
import type { SettingsGeneralStatus } from "@/lib/settings/runtime-status";

const cardIcon = [Cloud, Database, Globe2, KeyRound, ShieldCheck, Bot];

export function GeneralSettingsPanel({ status }: { status: SettingsGeneralStatus }) {
  return (
    <section className="settings-panel settings-info-panel">
      <header className="settings-info-header">
        <div>
          <span>APP IDENTITY</span>
          <h2>General</h2>
          <p>Current operating mode for CHOD MOP OFFICE. Read-only by design before official deployment.</p>
        </div>
        <div className="settings-info-stamp">
          <ShieldCheck size={20} />
          Free-first mode
        </div>
      </header>

      <div className="settings-general-layout">
        <article className="settings-identity-card">
          <strong>{status.appName}</strong>
          <span>{status.environment}</span>
          <dl>
            <div><dt>App URL</dt><dd>{status.appUrl}</dd></div>
            <div><dt>Network URL</dt><dd>{status.networkUrl}</dd></div>
            <div><dt>Auth provider</dt><dd>{status.authProvider}</dd></div>
            <div><dt>AI mode</dt><dd>{status.aiMode}</dd></div>
            <div><dt>Timezone</dt><dd>{status.timezone}</dd></div>
            <div><dt>Data mode</dt><dd>{status.dataMode}</dd></div>
          </dl>
        </article>

        <div className="settings-mode-grid">
          <article>
            <WalletCards size={21} />
            <span>Cost mode</span>
            <strong>{status.costMode}</strong>
          </article>
          <article>
            <Clock3 size={21} />
            <span>OTP mode</span>
            <strong>{status.otpMode}</strong>
          </article>
        </div>
      </div>

      <div className="settings-status-card-grid">
        {status.cards.map((card, index) => {
          const Icon = cardIcon[index] || ShieldCheck;
          return (
            <article className={`settings-status-card ${card.tone}`} key={card.label}>
              <Icon size={22} />
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}
