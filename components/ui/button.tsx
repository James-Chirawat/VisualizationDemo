import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Button({ asChild = false, className, ...props }: ComponentProps<"button"> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return <Component className={cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:pointer-events-none disabled:opacity-50", className)} {...props} />;
}
