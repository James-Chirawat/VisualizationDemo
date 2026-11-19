import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Dashboard qwenReady={Boolean(process.env.QWEN_API_KEY?.trim() || process.env.DASHSCOPE_API_KEY?.trim())} />;
}
