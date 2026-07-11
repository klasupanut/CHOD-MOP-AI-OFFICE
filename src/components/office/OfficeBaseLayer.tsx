import Image from "next/image";
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
      <Image
        alt=""
        draggable={false}
        fill
        priority
        quality={90}
        sizes="(max-width: 760px) 100vw, (max-width: 1200px) 82vw, 70vw"
        src={periodBackgrounds[period]}
      />
    </div>
  );
}
