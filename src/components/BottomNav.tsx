import { useEffect, useRef, useState, startTransition } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
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
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  // Optimistic target index so rapid tab taps move the glass pill at 0ms without waiting for route render
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);

  const pointerDownX = useRef<number | null>(null);
  const lastHoveredIndex = useRef<number | null>(null);
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload all 5 main tab route chunks once at idle so rapid switching never stutters on chunk loading
  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const item of items) {
        void router.preloadRoute({ to: item.to }).catch(() => {});
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [router]);

  // Clear optimistic index once router pathname catches up
  const routeActiveIndex = (() => {
    if (pathname === "/") return 0;
    const found = items.findIndex((item, idx) => idx > 0 && pathname.startsWith(item.to));
    return found === -1 ? 0 : found;
  })();

  useEffect(() => {
    setOptimisticIndex(null);
  }, [routeActiveIndex]);

  if (pathname.startsWith("/admin")) return null;

  const activeIndex = optimisticIndex ?? routeActiveIndex;

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
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    setBouncing(true);
    bounceTimerRef.current = setTimeout(() => setBouncing(false), 360);
  };

  const computeRatioFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const tabWidth = rect.width / items.length;
    const clampedX = Math.max(
      tabWidth / 2,
      Math.min(rect.width - tabWidth / 2, clientX - rect.left),
    );
    return (clampedX - tabWidth / 2) / (rect.width - tabWidth);
  };

  const commitNavigation = (targetIdx: number) => {
    const targetItem = items[targetIdx];
    if (!targetItem) return;
    // Immediately snap the pill to the new tab at 60fps before React renders the new route tree
    setOptimisticIndex(targetIdx);
    triggerBounce();
    triggerNavHaptic();
    startTransition(() => {
      void navigate({ to: targetItem.to });
    });
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
      setIsDragging(false);
      setDragRatio(null);
      pointerDownX.current = null;
      commitNavigation(targetIdx);
      return;
    }

    const ratio = computeRatioFromClientX(e.clientX);
    const tappedIdx = Math.max(
      0,
      Math.min(items.length - 1, Math.round(ratio * (items.length - 1))),
    );
    pointerDownX.current = null;
    setIsDragging(false);
    setDragRatio(null);
    commitNavigation(tappedIdx);
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
        {/* Sliding & Bouncy Glassmorphism Inner Pill (GPU composited) */}
        <div
          aria-hidden="true"
          style={{
            width: `calc((100% - 0.75rem) / ${items.length})`,
            transform: `translate3d(${pillIndexFloat * 100}%, 0, 0) scale(${
              isDragging ? "1.08, 0.93" : bouncing ? "1.04, 0.97" : "1, 1"
            })`,
            transition: isDragging
              ? "none"
              : "transform 0.42s var(--ease-bounce)",
          }}
          className="nav-glass-pill pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-full will-change-transform"
        />

        {items.map(({ to, label, icon: Icon }, idx) => {
          const isCurrent = idx === effectiveIndex;
          return (
            <button
              key={to}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => {}}
              className={cn(
                "relative z-10 flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-colors duration-150",
                isCurrent
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground/85",
              )}
            >
              <span className="relative">
                <Icon
                  size={18}
                  strokeWidth={isCurrent ? 2.25 : 1.85}
                  className="transition-transform duration-150"
                />
                {label === "Faves" && count > 0 && (
                  <span className="absolute -right-2.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent px-1 text-[8px] font-bold text-accent-foreground shadow-sm">
                    {count}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[9.5px] tracking-wide",
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
