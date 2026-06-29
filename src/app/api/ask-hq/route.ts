import { NextResponse } from "next/server";
import { mockAnswer, routeQuestion } from "@/lib/ai/agent-router";
import { getApiUser } from "@/lib/auth/api";

const responseCache = new Map<string, ReturnType<typeof mockAnswer>>();

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { question?: string };
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const cached = responseCache.get(question);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // MVP stays in mock mode. A future OpenAI adapter can be called here only after submit.
  const response = mockAnswer(question, routeQuestion(question));
  responseCache.set(question, response);
  return NextResponse.json({ ...response, cached: false });
}
