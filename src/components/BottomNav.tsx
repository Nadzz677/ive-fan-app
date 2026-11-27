import { useEffect, useRef, useState, startTransition } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Disc3, Heart, Home, ListMusic, Users } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { STUDIO_ROUTE_PATH } from "@/lib/studio-route";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/members", label: "Members", icon: Users },
  { to: "/discography", label: "Albums", icon: Disc3 },
  { to: "/music", label: "Music", icon: ListMusic },
  { to: "/favorites", label: "Faves", icon: Heart },
] as const;

function triggerNavHaptic(style: ImpactStyle = ImpactStyle.Light) {
  if (Capacitor.isNativePlatform()) {
    void Haptics.impact({ style }).catch(() => {});
  }
}

export function BottomNav() {
  const { count } = useFavorites();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const lensRimRef = useRef<HTMLDivElement>(null);

  // Optimistic target index so rapid tab taps highlight & glide at 0ms
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isEngaged, setIsEngaged] = useState(false);

  // Spring physics refs (driven at 60fps in rAF directly on DOM for zero React re-render lag!)
  const springPosRef = useRef<number>(0);
  const springVelRef = useRef<number>(0);
  const targetPosRef = useRef<number>(0);
  const lensSpringRef = useRef<number>(0); // 0 = rested inner pill, 1 = expanded Liquid Glass lens bubble
  const lensVelRef = useRef<number>(0);
  const targetLensRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const isDraggingRef = useRef<boolean>(false);
  const pointerDownXRef = useRef<number | null>(null);
  const lastHapticIdxRef = useRef<number | null>(null);
  const deflateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload all 5 main tab route chunks once at idle so switching never stutters
  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const item of items) {
        void router.preloadRoute({ to: item.to }).catch(() => {});
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [router]);

  const routeActiveIndex = (() => {
    if (pathname === "/") return 0;
    const found = items.findIndex((item, idx) => idx > 0 && pathname.startsWith(item.to));
    return found === -1 ? 0 : found;
  })();

  useEffect(() => {
    setOptimisticIndex(null);
  }, [routeActiveIndex]);

  const activeIndex = optimisticIndex ?? routeActiveIndex;
  const effectiveIndex = hoveredIndex ?? activeIndex;

  // Keep spring target synchronized when route changes externally
  useEffect(() => {
    if (!isDraggingRef.current) {
      targetPosRef.current = activeIndex;
      kickSpringLoop();
    }
  }, [activeIndex]);

  const applyPillTransform = (pos: number, vel: number, lens: number) => {
    const pillEl = pillRef.current;
    if (!pillEl) return;

    // Velocity-driven soft jelly squash & stretch (exact fluid feel from navigation_bar_idea.mp4!)
    const speed = Math.min(1.6, Math.abs(vel) * 0.085);
    const stretchX = 1 + lens * 0.14 + speed * 0.24;
    const squashY = 1 + lens * 0.26 - speed * 0.11;

    pillEl.style.transform = `translate3d(${pos * 100}%, 0, 0) scale(${stretchX.toFixed(4)}, ${squashY.toFixed(4)})`;

    // Crossfade smoothly between rested subtle dark pill and luminous Liquid Glass lens rim
    if (lensRimRef.current) {
      lensRimRef.current.style.opacity = String(Math.max(0, Math.min(1, lens)));
    }
  };

  const kickSpringLoop = () => {
    if (rafIdRef.current !== null) return;
    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      // 1. Horizontal position damped harmonic spring (soft, plush, bouncy!)
      const stiffness = isDraggingRef.current ? 460 : 250;
      const damping = isDraggingRef.current ? 30 : 20;
      const force = (targetPosRef.current - springPosRef.current) * stiffness;
      springVelRef.current += (force - springVelRef.current * damping) * dt;
      springPosRef.current += springVelRef.current * dt;

      // 2. Liquid Glass Lens inflation / deflation spring
      const lensStiffness = 300;
      const lensDamping = 22;
      const lensForce = (targetLensRef.current - lensSpringRef.current) * lensStiffness;
      lensVelRef.current += (lensForce - lensVelRef.current * lensDamping) * dt;
      lensSpringRef.current += lensVelRef.current * dt;

      applyPillTransform(springPosRef.current, springVelRef.current, lensSpringRef.current);

      const posSettled =
        Math.abs(targetPosRef.current - springPosRef.current) < 0.001 &&
        Math.abs(springVelRef.current) < 0.005;
      const lensSettled =
        Math.abs(targetLensRef.current - lensSpringRef.current) < 0.002 &&
        Math.abs(lensVelRef.current) < 0.005;

      if (!isDraggingRef.current && posSettled && lensSettled) {
        springPosRef.current = targetPosRef.current;
        springVelRef.current = 0;
        lensSpringRef.current = targetLensRef.current;
        lensVelRef.current = 0;
        applyPillTransform(springPosRef.current, 0, lensSpringRef.current);
        rafIdRef.current = null;
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(step);
    };

    rafIdRef.current = window.requestAnimationFrame(step);
  };

  // Initialize exact resting pill position on mount & cleanup rAF on unmount
  useEffect(() => {
    springPosRef.current = activeIndex;
    targetPosRef.current = activeIndex;
    applyPillTransform(activeIndex, 0, 0);
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (deflateTimerRef.current) clearTimeout(deflateTimerRef.current);
    };
  }, []);

  if (pathname.startsWith(STUDIO_ROUTE_PATH)) return null;

  const computeFloatIndexFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return activeIndex;
    const rect = el.getBoundingClientRect();
    const pad = 6;
    const innerWidth = Math.max(1, rect.width - pad * 2);
    const tabWidth = innerWidth / items.length;
    const relX = clientX - rect.left - pad - tabWidth / 2;
    const rawIdx = relX / tabWidth;
    // Soft rubber-band overscroll at left/right ends (just like iOS Liquid Glass!)
    if (rawIdx < 0) return rawIdx * 0.22;
    if (rawIdx > items.length - 1) return items.length - 1 + (rawIdx - (items.length - 1)) * 0.22;
    return rawIdx;
  };

  const scheduleDeflate = (delayMs = 260) => {
    if (deflateTimerRef.current) clearTimeout(deflateTimerRef.current);
    deflateTimerRef.current = setTimeout(() => {
      targetLensRef.current = 0;
      setIsEngaged(false);
      kickSpringLoop();
    }, delayMs);
  };

  const commitNavigation = (targetIdx: number, fromDrag = false) => {
    const targetItem = items[targetIdx];
    if (!targetItem) return;
    setOptimisticIndex(targetIdx);
    setHoveredIndex(null);
    targetPosRef.current = targetIdx;
    // Keep the Liquid Glass bubble inflated briefly while gliding to the tapped tab, then softly deflate!
    targetLensRef.current = 1;
    setIsEngaged(true);
    kickSpringLoop();
    scheduleDeflate(fromDrag ? 110 : 280);
    triggerNavHaptic(ImpactStyle.Light);
    startTransition(() => {
      void navigate({ to: targetItem.to });
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (deflateTimerRef.current) clearTimeout(deflateTimerRef.current);
    pointerDownXRef.current = e.clientX;
    isDraggingRef.current = false;
    lastHapticIdxRef.current = activeIndex;

    // Immediately bloom the Liquid Glass lens bubble on touch-down!
    targetLensRef.current = 1;
    setIsEngaged(true);
    kickSpringLoop();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerDownXRef.current === null) return;
    const deltaX = Math.abs(e.clientX - pointerDownXRef.current);

    if (!isDraggingRef.current && deltaX > 5) {
      isDraggingRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (isDraggingRef.current) {
      const floatIdx = computeFloatIndexFromClientX(e.clientX);
      targetPosRef.current = floatIdx;
      targetLensRef.current = 1;
      kickSpringLoop();

      const nearest = Math.max(0, Math.min(items.length - 1, Math.round(floatIdx)));
      setHoveredIndex(nearest);
      if (nearest !== lastHapticIdxRef.current) {
        lastHapticIdxRef.current = nearest;
        triggerNavHaptic(ImpactStyle.Light);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerDownXRef.current === null) return;
    const wasDragging = isDraggingRef.current;
    const floatIdx = computeFloatIndexFromClientX(e.clientX);
    const targetIdx = Math.max(0, Math.min(items.length - 1, Math.round(floatIdx)));

    pointerDownXRef.current = null;
    isDraggingRef.current = false;

    commitNavigation(targetIdx, wasDragging);
  };

  const handlePointerCancel = () => {
    pointerDownXRef.current = null;
    isDraggingRef.current = false;
    setHoveredIndex(null);
    targetPosRef.current = activeIndex;
    targetLensRef.current = 0;
    setIsEngaged(false);
    kickSpringLoop();
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3.5 pt-2 pb-2.5">
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="glass-panel relative mx-auto flex max-w-md select-none touch-none items-center justify-between rounded-full p-1.5"
      >
        {/* Sliding Spring-Physics Liquid Glass Lens Pill (GPU composited, blooms slightly beyond dock while engaged!) */}
        <div
          ref={pillRef}
          aria-hidden="true"
          style={{
            width: `calc((100% - 0.75rem) / ${items.length})`,
          }}
          className="nav-glass-pill pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 z-20 rounded-full will-change-transform"
        >
          {/* Floating Liquid Glass Optical Lens Rim (fades in smoothly when pressed / dragging / gliding) */}
          <div
            ref={lensRimRef}
            style={{ opacity: 0 }}
            className="nav-liquid-lens absolute inset-0 rounded-full"
          />
        </div>

        {items.map(({ to, label, icon: Icon }, idx) => {
          const isCurrent = idx === effectiveIndex;
          return (
            <button
              key={to}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={(e) => {
                if (e.detail === 0) commitNavigation(idx, false);
              }}
              className={cn(
                "relative z-10 flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-all duration-200",
                isCurrent ? "text-primary" : "text-muted-foreground hover:text-foreground/85",
              )}
              style={{
                transform:
                  isCurrent && isEngaged ? "scale(1.1)" : isCurrent ? "scale(1.03)" : "scale(1)",
                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <span className="relative">
                <Icon
                  size={19}
                  strokeWidth={isCurrent ? 2.3 : 1.85}
                  className="transition-transform duration-200"
                />
                {label === "Faves" && count > 0 && (
                  <span className="absolute -top-1 -right-2.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent px-1 text-[8px] font-bold text-accent-foreground shadow-sm">
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
