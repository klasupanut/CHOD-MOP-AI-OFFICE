import type { OfficePeriod } from "./ThailandTimeController";

const periodBackgrounds: Record<OfficePeriod, string> = {
  dawn: "/assets/office/office-base-dawn.png",
  day: "/assets/office/office-base-clean.png",
  afternoon: "/assets/office/office-base-clean.png",
  evening: "/assets/office/office-base-evening.png",
  night: "/assets/office/office-base-night.png",
  "late-night": "/assets/office/office-base-night.png",
};

export function OfficeBaseLayer({ period }: { period: OfficePeriod }) {
  return (
    <div className="office-asset-layer office-base-layer" aria-hidden="true">
      <img src={periodBackgrounds[period]} alt="" draggable={false} />
    </div>
  );
}
