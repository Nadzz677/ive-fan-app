import { useId, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

interface CurvedProgressProps {
  progress: number; // in seconds
  total: number; // in seconds
  onSeek: (seconds: number) => void;
  variant?: "compact" | "expanded";
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
    setIsScrubbing(false);
    if (scrubSeconds !== null) {
      onSeek(scrubSeconds);
      setScrubSeconds(null);
    }
  };

  // High-definition organic continuous wave path across 0..1000
  const pathD =
    "M 0 20 C 125 6, 125 34, 250 20 C 375 6, 375 34, 500 20 C 625 6, 625 34, 750 20 C 875 6, 875 34, 1000 20";

  const heightClass = variant === "compact" ? "h-4" : "h-8";
  const strokeWidth = variant === "compact" ? 3.5 : 5.5;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="60%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--highlight)" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation={variant === "compact" ? "3" : "5"} result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Ambient subtle backdrop trace */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={strokeWidth + (variant === "compact" ? 2 : 3)}
          strokeLinecap="round"
          className="opacity-40"
        />

        {/* Inactive Background Track (Curved ribbon) */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="opacity-80 transition-colors"
        />

        {/* Played Active Track with fluid gradient and subtle bloom */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={1000}
          strokeDasharray={1000}
          strokeDashoffset={1000 - (pct / 100) * 1000}
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
