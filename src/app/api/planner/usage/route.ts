import { proxyTimelineRequest } from "@/lib/planner/server-bridge";

export const dynamic = "force-dynamic";
export const GET = (request: Request) => proxyTimelineRequest(request, "usage");
