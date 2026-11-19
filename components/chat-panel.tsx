"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, FileText, LoaderCircle, MessageCircle, Paperclip, RotateCcw, Sparkles, X } from "lucide-react";
import { Dialog } from "radix-ui";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { statusLabels, type Filters } from "@/lib/analytics";

type Message = { role: "user" | "assistant"; content: string; scope?: string; file?: string };
type Attachment = { file: File; summary: string };
const maxFileSize = 2 * 1024 * 1024;

function summarizeFile(name: string, text: string) {
  const extension = name.split(".").at(-1)?.toLowerCase();
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned || cleaned.includes("\0")) throw new Error("ไฟล์ว่างหรืออ่านเป็นข้อความไม่ได้");
  if (extension === "txt") {
    return `**สรุปไฟล์ข้อความ**\n\nไฟล์มี ${cleaned.split(/\r?\n/).length.toLocaleString("th-TH")} บรรทัด และ ${cleaned.length.toLocaleString("th-TH")} ตัวอักษร`;
  }
  const separator = extension === "tsv" ? "\t" : ",";
  // Count logical records, including CSV fields with quoted newlines.
  let quoted = false;
  let rows = 1;
  let columns = 1;
  for (let index = 0; index < cleaned.length; index++) {
    const character = cleaned[index];
    if (character === '"') {
      if (quoted && cleaned[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && character === "\n") rows++;
    else if (!quoted && rows === 1 && character === separator) columns++;
  }
  if (quoted) throw new Error("ตรวจเครื่องหมายคำพูดในไฟล์ตารางแล้วลองอีกครั้ง");
  return `**สรุปไฟล์ตาราง**\n\nพบ ${Math.max(0, rows - 1).toLocaleString("th-TH")} แถวข้อมูล และ ${columns} คอลัมน์ นับแถวแรกเป็นหัวตาราง`;
}
const prompts = ["สรุปผลตามตัวกรอง", "ทำไมส่งล่าช้า และควรตรวจอะไรต่อ?", "คำนวณอัตราส่งตรงเวลาอย่างไร?"];

export function ChatPanel({ filters, open, setOpen }: {
  filters: Filters; open: boolean; setOpen: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [reading, setReading] = useState(false);

  async function attach(file: File) {
    setError("");
    if (!/\.(csv|tsv|txt)$/i.test(file.name) || !file.size || file.size > maxFileSize) {
      setError("เลือกไฟล์ CSV, TSV หรือ TXT ขนาดไม่เกิน 2 MB");
      return;
    }
    setReading(true);
    try {
      const summary = summarizeFile(file.name, await file.text());
      setAttachment({ file, summary });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อ่านไฟล์ไม่สำเร็จ");
    } finally { setReading(false); }
  }
  const scope = `${filters.route === "all" ? "ทุกเส้นทาง" : filters.route} · ${filters.status === "all" ? "ทุกสถานะ" : statusLabels[filters.status]}`;
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [messages, pending, open]);

  async function send(value: string) {
    const content = value.trim();
    if ((!content && !attachment) || pending || reading) return;
    const turn: Message = { role: "user", content, scope, file: attachment?.file.name };
    const next = [...messages, turn];
    setMessages(next); setQuestion(""); setError(""); setPending(true);
    try {
      if (!content && attachment) {
        setMessages([...next, { role: "assistant", content: attachment.summary, scope: "ไฟล์แนบ" }]);
        setAttachment(null);
        return;
      }
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, question: content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ส่งข้อความไม่สำเร็จ");
      const answer = attachment ? attachment.summary + "\n\n**ข้อมูลจากแดชบอร์ด**\n\n" + data.answer : data.answer;
      setMessages([...next, { role: "assistant", content: answer, scope }]);
      setAttachment(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งข้อความไม่สำเร็จ");
      setMessages(messages); setQuestion(content);
    } finally { setPending(false); }
  }

  return <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
    <Dialog.Trigger asChild><Button className="chat-head" aria-label={open ? "ซ่อน AI Analyst" : "เปิด AI Analyst"} title="AI Analyst">{open ? <X size={25} /> : <MessageCircle size={25} />}{!open && <span>AI Analyst</span>}</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Content className="chat-panel chat-window" onInteractOutside={event => event.preventDefault()}>
        <div className="chat-header flex items-center gap-3 px-4 py-3">
          <span className="ai-icon"><Sparkles size={20} /></span>
          <div className="min-w-0 flex-1"><Dialog.Title className="text-lg font-bold">AI Analyst</Dialog.Title><Dialog.Description className="text-xs text-slate-200">โหมดจำลอง · คำนวณจากตัวกรองปัจจุบัน</Dialog.Description></div>
          <Button title="ล้างแชต" aria-label="ล้างแชต" disabled={pending || reading || (!messages.length && !question && !attachment)} onClick={() => { setMessages([]); setQuestion(""); setError(""); setAttachment(null); }} className="icon-button"><RotateCcw size={17} /></Button>
          <Dialog.Close asChild><Button aria-label="ปิด AI Analyst" className="icon-button"><X size={20} /></Button></Dialog.Close>
        </div>
        <div className="chat-context border-b border-line bg-slate-50 px-4 py-2 text-sm"><b>{scope}</b><p className="mt-0.5 text-muted">{filters.from} ถึง {filters.to}</p></div>
        <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
          {!messages.length && <div className="space-y-3"><div className="rounded-xl bg-[#eef5ff] p-4"><Bot size={20} className="mb-2 text-blue-600" /><p className="font-bold">ถามเกี่ยวกับข้อมูลที่เห็น</p><p className="mt-1 text-sm text-muted">ถามถึงตัวเลข สาเหตุที่บันทึกไว้ หรือสิ่งที่ควรตรวจต่อ คำตอบจะอิงตัวกรอง ณ ตอนส่ง</p></div>{prompts.map(prompt => <Button key={prompt} onClick={() => send(prompt)} className="w-full justify-start border border-line text-left hover:bg-slate-50">{prompt}</Button>)}</div>}
          {messages.map((message, i) => <div key={i} className={`mb-4 ${message.role === "user" ? "ml-8" : "mr-3"}`}>
            <p className="mb-1 text-xs text-muted">{message.role === "user" ? "คุณ" : "คำตอบสาธิต"} · {message.scope}</p>
            <div className={`rounded-xl px-4 py-3 text-sm ${message.role === "user" ? "bg-[#112b45] text-white" : "markdown border border-line bg-slate-50"}`}>
              {message.role === "user" ? <>{message.file && <span className="chat-file-label"><FileText size={15} /> {message.file}</span>}{message.content}</> : <ReactMarkdown disallowedElements={["img", "a"]} unwrapDisallowed>{message.content}</ReactMarkdown>}
            </div>
          </div>)}
          {pending && <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" /> กำลังวิเคราะห์ข้อมูล</p>}
        </div>
        <form className="border-t border-line bg-white p-3" onSubmit={event => { event.preventDefault(); void send(question); }}>
          {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
          {attachment && <div className="attachment-chip"><FileText size={16} /><span>{attachment.file.name}</span><Button type="button" className="icon-button" disabled={pending} onClick={() => setAttachment(null)} aria-label="นำไฟล์แนบออก"><X size={15} /></Button></div>}
          <div className="flex items-end gap-1 rounded-xl border border-line p-1.5 focus-within:border-blue-500">
            <input ref={fileInput} type="file" accept=".csv,.tsv,.txt" hidden onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void attach(file); }} />
            <Button type="button" className="icon-button h-9 w-9" onClick={() => fileInput.current?.click()} disabled={pending || reading} title="แนบ CSV, TSV หรือ TXT" aria-label="แนบไฟล์"><Paperclip size={19} /></Button>
            <textarea aria-label="คำถามสำหรับ AI" placeholder="ถามเกี่ยวกับข้อมูลที่เลือก…" rows={2} maxLength={800} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(question); } }} className="min-w-0 flex-1 resize-none p-2 text-sm outline-none" />
            <Button type="submit" disabled={(!question.trim() && !attachment) || pending || reading} className="primary h-10 w-10 p-0" aria-label="ส่งคำถาม"><ArrowUp size={19} /></Button>
          </div>
          <p className="mt-2 text-xs text-muted">แนบ CSV, TSV หรือ TXT ได้สูงสุด 2 MB · สรุปไฟล์บนเครื่อง</p>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
