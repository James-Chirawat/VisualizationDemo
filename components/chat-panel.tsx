"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { Dialog } from "radix-ui";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { statusLabels, type Filters } from "@/lib/analytics";

type Message = { role: "user" | "assistant"; content: string; scope?: string };
const prompts = ["สรุปผลตามตัวกรอง", "ทำไมส่งล่าช้า และควรตรวจอะไรต่อ?", "คำนวณอัตราส่งตรงเวลาอย่างไร?"];

export function ChatPanel({ filters, open, setOpen }: {
  filters: Filters; open: boolean; setOpen: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const scope = `${filters.route === "all" ? "ทุกเส้นทาง" : filters.route} · ${filters.status === "all" ? "ทุกสถานะ" : statusLabels[filters.status]}`;
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [messages, pending, open]);

  async function send(value: string) {
    const content = value.trim();
    if (!content || pending) return;
    const turn: Message = { role: "user", content, scope };
    const next = [...messages, turn];
    setMessages(next); setQuestion(""); setError(""); setPending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, question: content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ส่งข้อความไม่สำเร็จ");
      setMessages([...next, { role: "assistant", content: data.answer, scope }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งข้อความไม่สำเร็จ");
      setMessages(messages); setQuestion(content);
    } finally { setPending(false); }
  }

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-[#0c1b2a]/45" />
      <Dialog.Content className="chat-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <span className="ai-icon"><Sparkles size={20} /></span>
          <div className="min-w-0 flex-1"><Dialog.Title className="text-lg font-bold">AI Analyst</Dialog.Title><Dialog.Description className="text-[13px] text-muted">โหมดจำลอง · คำนวณจากตัวกรองปัจจุบัน</Dialog.Description></div>
          <Button title="ล้างแชต" aria-label="ล้างแชต" disabled={pending || (!messages.length && !question)} onClick={() => { setMessages([]); setQuestion(""); setError(""); }} className="icon-button"><RotateCcw size={17} /></Button>
          <Dialog.Close asChild><Button aria-label="ปิด AI Analyst" className="icon-button"><X size={20} /></Button></Dialog.Close>
        </div>
        <div className="border-b border-line bg-slate-50 px-5 py-3 text-sm"><b>{scope}</b><p className="mt-0.5 text-muted">{filters.from} ถึง {filters.to}</p></div>
        <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
          {!messages.length && <div className="space-y-3"><div className="rounded-xl bg-[#eef5ff] p-4"><Bot size={20} className="mb-2 text-blue-600" /><p className="font-bold">ถามเกี่ยวกับข้อมูลที่เห็น</p><p className="mt-1 text-sm text-muted">ถามถึงตัวเลข สาเหตุที่บันทึกไว้ หรือสิ่งที่ควรตรวจต่อ คำตอบจะอิงตัวกรอง ณ ตอนส่ง</p></div>{prompts.map(prompt => <Button key={prompt} onClick={() => send(prompt)} className="w-full justify-start border border-line text-left hover:bg-slate-50">{prompt}</Button>)}</div>}
          {messages.map((message, i) => <div key={i} className={`mb-4 ${message.role === "user" ? "ml-8" : "mr-3"}`}>
            <p className="mb-1 text-xs text-muted">{message.role === "user" ? "คุณ" : "คำตอบสาธิต"} · {message.scope}</p>
            <div className={`rounded-xl px-4 py-3 text-sm ${message.role === "user" ? "bg-[#112b45] text-white" : "markdown border border-line bg-slate-50"}`}>
              {message.role === "user" ? message.content : <ReactMarkdown disallowedElements={["img", "a"]} unwrapDisallowed>{message.content}</ReactMarkdown>}
            </div>
          </div>)}
          {pending && <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" /> กำลังวิเคราะห์ข้อมูล</p>}
        </div>
        <form className="border-t border-line p-4" onSubmit={event => { event.preventDefault(); void send(question); }}>
          {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
          <div className="flex items-end gap-2 rounded-xl border border-line p-2 focus-within:border-blue-500">
            <textarea aria-label="คำถามสำหรับ AI" placeholder="ถามเกี่ยวกับข้อมูลที่เลือก…" rows={2} maxLength={800} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(question); } }} className="min-w-0 flex-1 resize-none p-2 text-sm outline-none" />
            <Button type="submit" disabled={!question.trim() || pending} className="primary h-10 w-10 p-0" aria-label="ส่งคำถาม"><ArrowUp size={19} /></Button>
          </div>
          <p className="mt-2 text-xs text-muted">ใช้ข้อมูลจำลองในการสาธิต · ตรวจตัวเลขในกราฟและตารางประกอบคำตอบ</p>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
