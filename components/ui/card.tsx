import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

// A card is a plain box by default; pass as="section" only when it is a labelled page region.
export function Card({ as: Component = "div", className, ...props }: ComponentProps<"div"> & { as?: "div" | "section" }) {
  return <Component className={cn("rounded-2xl border border-line bg-surface", className)} {...props} />;
}
