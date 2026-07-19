import { proxyTimelineRequest } from "@/lib/planner/server-bridge";

export const dynamic = "force-dynamic";
export const GET = (request: Request) => proxyTimelineRequest(request, "company-logo");
export const HEAD = (request: Request) => proxyTimelineRequest(request, "company-logo");
export const PUT = (request: Request) => proxyTimelineRequest(request, "company-logo");
export const DELETE = (request: Request) => proxyTimelineRequest(request, "company-logo");
