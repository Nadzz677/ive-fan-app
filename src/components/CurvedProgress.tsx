import { useId, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

interface CurvedProgressProps {
  progress: number; // in seconds
  total: number; // in seconds
  onSeek: (seconds: number) => void;
  variant?: "compact" | "docked" | "expanded";
  className?: string;
}

export function CurvedProgress({
  progress,
  total,
  onSeek,
  variant = "compact",
  className = "",
}: CurvedProgressProps) {
  const gradId = useId();
  const auraGradId = useId();
  const glowId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState<number | null>(null);

  const safeTotal = total > 0 ? total : 1;
  const currentSeconds = isScrubbing && scrubSeconds !== null ? scrubSeconds : progress;
  const clampedSeconds = Math.max(0, Math.min(safeTotal, currentSeconds));
  const pct = Math.max(0, Math.min(100, (clampedSeconds / safeTotal) * 100));

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * safeTotal;
    setIsScrubbing(true);
    setScrubSeconds(targetSec);
    containerRef.current.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing || !containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubSeconds(ratio * safeTotal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    let finalSec = scrubSeconds;
    if (containerRef.current && Number.isFinite(e.clientX)) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        finalSec = ratio * safeTotal;
      }
    }
    setIsScrubbing(false);
    setScrubSeconds(null);
    if (finalSec !== null) {
      onSeek(finalSec);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    setIsScrubbing(false);
    setScrubSeconds(null);
  };

  // High-definition organic continuous wave path across 0..1000
  const pathD =
    variant === "docked"
      ? "M 0 20 C 100 7, 100 33, 200 20 C 300 7, 300 33, 400 20 C 500 7, 500 33, 600 20 C 700 7, 700 33, 800 20 C 900 7, 900 33, 1000 20"
      : "M 0 20 C 125 6, 125 34, 250 20 C 375 6, 375 34, 500 20 C 625 6, 625 34, 750 20 C 875 6, 875 34, 1000 20";

  const heightClass =
    variant === "docked" ? "h-3.5" : variant === "compact" ? "h-4" : "h-8";
  const strokeWidth =
    variant === "docked" ? 3.4 : variant === "compact" ? 3.6 : 5.5;
  const dashOffset = 1000 - (pct / 100) * 1000;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`group relative w-full select-none cursor-pointer touch-none flex items-center ${heightClass} ${className}`}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={Math.round(clampedSeconds)}
      aria-valuetext={`${formatDuration(clampedSeconds)} of ${formatDuration(safeTotal)}`}
    >
      <svg
        viewBox="0 0 1000 40"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          {/* Vivid multi-color core gradient */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="32%" stopColor="oklch(0.78 0.22 332)" />
            <stop offset="66%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--highlight)" />
          </linearGradient>

          {/* Soft outer aura bloom gradient */}
          <linearGradient id={auraGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
            <stop offset="40%" stopColor="oklch(0.76 0.24 325)" stopOpacity="0.95" />
            <stop offset="75%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--highlight)" stopOpacity="0.95" />
          </linearGradient>

          {/* Dual-stage Gaussian glow aura filter */}
          <filter id={glowId} x="-25%" y="-120%" width="150%" height="340%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={variant === "expanded" ? "7" : "4.8"}
              result="wideAura"
            />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={variant === "expanded" ? "2.6" : "1.8"}
              result="innerBloom"
            />
            <feMerge>
              <feMergeNode in="wideAura" />
              <feMergeNode in="innerBloom" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inactive Background Track (Curved ribbon) */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="opacity-65 transition-colors"
        />

        {/* Wide Colorful Aura Emission Layer (Underneath active wave) */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${auraGradId})`}
          strokeWidth={strokeWidth * 2.5}
          strokeLinecap="round"
          pathLength={1000}
          strokeDasharray={1000}
          strokeDashoffset={dashOffset}
          className="opacity-65 blur-[3px] transition-[stroke-dashoffset] duration-150 ease-out"
        />

        {/* Played Active Track with multi-color gradient and dual bloom filter */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={1000}
          strokeDasharray={1000}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-150 ease-out"
          filter={`url(#${glowId})`}
        />
      </svg>

      {/* Accessible Hidden Range Input */}
      <input
        type="range"
        min={0}
        max={safeTotal}
        value={clampedSeconds}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
