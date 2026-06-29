"use client";

import { quickPrompts } from "@/data/mock-dashboard";
import { Bot, Send, Sparkles } from "lucide-react";
import { FormEvent, useRef, useState, WheelEvent } from "react";

type AskResponse = { agent: string; answer: string; cached?: boolean };

export function AskHQ() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const promptRowRef = useRef<HTMLDivElement>(null);

  async function ask(questionOverride?: string) {
    const finalQuestion = (questionOverride ?? question).trim();
    if (!finalQuestion || loading) return;
    setQuestion(finalQuestion);
    setLoading(true);
    try {
      const result = await fetch("/api/ask-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalQuestion }),
      });
      setResponse((await result.json()) as AskResponse);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask();
  }

  function scrollPrompts(event: WheelEvent<HTMLDivElement>) {
    const row = promptRowRef.current;
    if (!row || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    row.scrollLeft += event.deltaY;
    event.preventDefault();
  }

  return (
    <section className={`ask-hq ${response ? "has-response" : ""}`} aria-label="Ask CHOD MOP OFFICE">
      {response ? (
        <div className="hq-response">
          <Bot size={20} />
          <p><strong>{response.agent.toUpperCase()}</strong>{response.answer}</p>
          {response.cached ? <span>CACHED</span> : null}
        </div>
      ) : null}
      <div className="prompt-scroll-shell">
        <div
          className="prompt-row"
          ref={promptRowRef}
          onWheel={scrollPrompts}
          role="list"
          aria-label="Ask AI quick prompts"
          tabIndex={0}
        >
          {quickPrompts.map((prompt) => (
            <button role="listitem" key={prompt} onClick={() => void ask(prompt)}>{prompt}</button>
          ))}
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="ask-icon"><Sparkles size={21} /></div>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="สรุปงานสำคัญที่ต้องทำวันนี้"
          aria-label="Ask CHOD MOP OFFICE"
        />
        <div className="mock-label">ASK AI</div>
        <button className="send-button" disabled={loading} aria-label="Send to CHOD MOP OFFICE">
          {loading ? <span className="loader" /> : <Send size={21} />}
        </button>
      </form>
    </section>
  );
}
