import { analyze, num, pct, readFilters, target, type Filters } from "@/lib/analytics";

export const runtime = "nodejs";

function demoAnswer(question: string, filters: Filters) {
  const { summary, worst, byReason, comparison } = analyze(filters);
  if (!summary.total) return "ตัวกรองนี้ไม่มีเที่ยวขนส่ง ลองขยายช่วงวันที่หรือเลือกทุกสถานะ แล้วถามอีกครั้ง";
  const gap = summary.rate !== null && comparison?.rate != null ? summary.rate - comparison.rate : null;
  const isMetricQuestion = /สูตร|คำนวณ|นับยังไง|คิดอย่างไร/.test(question);
  const isRiskQuestion = /สาเหตุ|ช้า|ปรับ|เสี่ยง|R-02/i.test(question);
  const evidence = [
    `มี **${summary.total} เที่ยว** ส่งถึงแล้ว ${summary.completed} เที่ยว และกำลังขนส่ง ${summary.pending} เที่ยว`,
    summary.rate === null ? "ยังคำนวณอัตราตรงเวลาไม่ได้ เพราะยังไม่มีเที่ยวที่ส่งถึง" :
      `ส่งตรงเวลา **${pct(summary.rate)}** (${summary.onTime}/${summary.completed} เที่ยวที่ส่งถึงแล้ว) เทียบเป้าหมาย ${target}%`,
    gap === null ? (worst ? `เส้นทางต่ำสุดในตัวกรองคือ **${worst.id}** ที่ ${pct(worst.rate)} จาก ${worst.completed} เที่ยวที่ส่งถึง` : null) :
      `ต่างจากเส้นทางอื่น **${gap.toFixed(1)} จุดเปอร์เซ็นต์** ในช่วงวันที่และสถานะเดียวกัน`,
  ].filter(Boolean).map(line => "- " + line).join("\n");
  const finding = isMetricQuestion ?
    "**วิธีคำนวณ**\n\nอัตราส่งตรงเวลา = เที่ยวตรงเวลา ÷ เที่ยวที่ส่งถึงแล้ว × 100 ส่วนค่าใช้จ่ายเฉลี่ย = ค่าใช้จ่ายรวม ÷ เที่ยวทั้งหมดในตัวกรอง" :
    byReason.length ? `**สิ่งที่ควรตรวจต่อ**\n\n${isRiskQuestion ? "สาเหตุที่ถูกบันทึกบ่อยที่สุดคือ" : "ถ้าจะเริ่มแก้ความล่าช้า ให้ตรวจรายการที่บันทึกว่า"} **${byReason[0].reason}** (${byReason[0].count} จาก ${summary.late} เที่ยวล่าช้า) เที่ยวที่ล่าช้าช้ากว่ากำหนดเฉลี่ย ${num(summary.delay, 1)} วัน ควรเทียบช่วงเวลาออกรถและจุดรับสินค้าก่อนสรุปสาเหตุ` :
      "**สิ่งที่ควรตรวจต่อ**\n\nลองเลือกทุกสถานะเพื่อเทียบเที่ยวตรงเวลาและเที่ยวล่าช้าบนฐานเดียวกัน";
  return evidence + "\n\n" + finding;
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 415 });
  // Only accept requests from the dashboard origin.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "โดเมนของคำขอไม่ตรงกับเว็บเดโม" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 12000) return Response.json({ error: "ข้อความยาวเกินไป" }, { status: 413 });
    const body = JSON.parse(raw);
    const filters = readFilters(body?.filters);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!filters || !question || question.length > 800)
      return Response.json({ error: "ตรวจข้อความและช่วงวันที่ แล้วลองอีกครั้ง" }, { status: 400 });
    return Response.json({ answer: demoAnswer(question, filters) });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    return Response.json({ error: "ประมวลผลคำถามไม่สำเร็จ ลองอีกครั้ง" }, { status: 502 });
  }
}
