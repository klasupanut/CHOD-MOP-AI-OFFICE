import { proxyTimelineRequest } from "@/lib/planner/server-bridge";

export const dynamic = "force-dynamic";
export const GET = (request: Request) => proxyTimelineRequest(request, "plan");
export const PUT = (request: Request) => proxyTimelineRequest(request, "plan");
export const DELETE = (request: Request) => proxyTimelineRequest(request, "plan");
