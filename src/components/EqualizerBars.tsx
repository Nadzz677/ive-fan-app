import { cn } from "@/lib/utils";

export function EqualizerBars({ active, className }: { active: boolean; className?: string }) {
  return (
    <span className={cn("flex h-3 items-end gap-[2px]", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-current", active ? "eq-bar h-3" : "h-1.5")}
          style={active ? { animationDelay: `${i * 0.15}s` } : undefined}
        />
      ))}
    </span>
  );
}
