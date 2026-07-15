import { FitoutProjectWorkspace } from "@/components/workspace/FitoutProjectWorkspace";
import { getFitoutWorkspaceData } from "@/lib/fitout/fitout-google-sheet";
import { requireModule } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function FitoutProjectPage() {
  const user = await requireModule("Fit-out Project");
  const data = await getFitoutWorkspaceData({ allowFallback: false });
  void user;
  return <FitoutProjectWorkspace data={data} />;
}
