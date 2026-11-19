import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-line bg-white", className)} {...props} />;
}
