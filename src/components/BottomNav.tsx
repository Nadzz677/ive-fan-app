import { useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Disc3, Heart, Home, ListMusic, Users } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/members", label: "Members", icon: Users },
  { to: "/discography", label: "Albums", icon: Disc3 },
  { to: "/music", label: "Music", icon: ListMusic },
  { to: "/favorites", label: "Faves", icon: Heart },
] as const;

function triggerNavHaptic() {
  if (Capacitor.isNativePlatform()) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}

export function BottomNav() {
  const { count } = useFavorites();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const pointerDownX = useRef<number | null>(null);
  const lastHoveredIndex = useRef<number | null>(null);

  if (pathname.startsWith("/admin")) return null;

  // Determine which tab index (0..4) is active from the route
  const activeIndex = (() => {
    if (pathname === "/") return 0;
    const found = items.findIndex((item, idx) => idx > 0 && pathname.startsWith(item.to));
    return found === -1 ? 0 : found;
  })();

  // While dragging, highlight whichever tab the pill center is currently over
  const effectiveIndex =
    dragRatio !== null
      ? Math.max(0, Math.min(items.length - 1, Math.round(dragRatio * (items.length - 1))))
      : activeIndex;

  // Compute the pill's horizontal translation in percentage of 1 tab width (0% to 400%)
  const pillIndexFloat =
    dragRatio !== null
      ? Math.max(0, Math.min(items.length - 1, dragRatio * (items.length - 1)))
      : activeIndex;

  const triggerBounce = () => {
    setBouncing(true);
    window.setTimeout(() => setBouncing(false), 380);
  };

  const computeRatioFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const tabWidth = rect.width / items.length;
    // Map pointer center to 0..1 across tab centers
    const clampedX = Math.max(tabWidth / 2, Math.min(rect.width - tabWidth / 2, clientX - rect.left));
    return (clampedX - tabWidth / 2) / (rect.width - tabWidth);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerDownX.current = e.clientX;
    lastHoveredIndex.current = activeIndex;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerDownX.current === null) return;
    const deltaX = Math.abs(e.clientX - pointerDownX.current);

    if (!isDragging && deltaX > 6) {
      setIsDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (isDragging || deltaX > 6) {
      const ratio = computeRatioFromClientX(e.clientX);
      setDragRatio(ratio);
      const hoveredIdx = Math.round(ratio * (items.length - 1));
      if (hoveredIdx !== lastHoveredIndex.current) {
        lastHoveredIndex.current = hoveredIdx;
        triggerNavHaptic();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerDownX.current === null) return;

    if (isDragging && dragRatio !== null) {
      const targetIdx = Math.max(
        0,
        Math.min(items.length - 1, Math.round(dragRatio * (items.length - 1))),
      );
      const targetItem = items[targetIdx];
      setIsDragging(false);
      setDragRatio(null);
      pointerDownX.current = null;
      triggerBounce();
      triggerNavHaptic();
      if (targetItem) {
        void navigate({ to: targetItem.to });
      }
      return;
    }

    // Standard tap on a tab
    const ratio = computeRatioFromClientX(e.clientX);
    const tappedIdx = Math.max(
      0,
      Math.min(items.length - 1, Math.round(ratio * (items.length - 1))),
    );
    const tappedItem = items[tappedIdx];
    pointerDownX.current = null;
    setIsDragging(false);
    setDragRatio(null);
    triggerBounce();
    triggerNavHaptic();
    if (tappedItem) {
      void navigate({ to: tappedItem.to });
    }
  };

  const handlePointerCancel = () => {
    pointerDownX.current = null;
    setIsDragging(false);
    setDragRatio(null);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3.5 pb-2.5 pt-1">
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="glass-panel relative mx-auto flex max-w-md select-none touch-none items-center justify-between rounded-full p-1.5"
      >
        {/* Sliding & Bouncy Glassmorphism Inner Pill (like iOS Clock tab pill) */}
        <div
          aria-hidden="true"
          style={{
            width: `calc((100% - 0.75rem) / ${items.length})`,
            transform: `translate3d(${pillIndexFloat * 100}%, 0, 0) scale(${
              isDragging ? "1.08, 0.93" : bouncing ? "1.04, 0.97" : "1, 1"
            })`,
            transition: isDragging
              ? "transform 0.05s linear"
              : "transform 0.48s var(--ease-bounce)",
          }}
          className="nav-glass-pill pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-full"
        />

        {items.map(({ to, label, icon: Icon }, idx) => {
          const isCurrent = idx === effectiveIndex;
          return (
            <button
              key={to}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => {
                // Handled by pointerUp on track for unified tap + drag physics
              }}
              className={cn(
                "relative z-10 flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-all duration-200",
                isCurrent
                  ? "scale-[1.04] text-primary"
                  : "text-muted-foreground hover:text-foreground/85",
              )}
            >
              <span className="relative">
                <Icon
                  size={18}
                  strokeWidth={isCurrent ? 2.25 : 1.85}
                  className="transition-transform duration-200"
                />
                {label === "Faves" && count > 0 && (
                  <span className="absolute -right-2.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent px-1 text-[8px] font-bold text-accent-foreground shadow-sm">
                    {count}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[9.5px] tracking-wide transition-all",
                  isCurrent ? "font-bold text-primary" : "font-medium",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
