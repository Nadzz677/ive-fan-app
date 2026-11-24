import { cn } from "@/lib/utils";

interface SparklineKpiCardProps {
  valueText: string;
  label: string;
  subtitle: string;
  color: string;
  gradientId: string;
  points: number[];
  panelClass: string;
  headingClass: string;
  subTextClass: string;
  onClick?: () => void;
}

/**
 * Builds a smooth cubic-bezier SVG path from normalized data points (0..100)
 * that bleeds flush edge-to-edge along the bottom of the Apex KPI card.
 */
function buildWavePaths(points: number[], width = 300, height = 74) {
  const safe = points.length >= 2 ? points : [20, 45, 32, 68, 52, 85, 95];
  const min = Math.min(...safe);
  const max = Math.max(...safe, min + 1);

  const coords = safe.map((val, idx) => {
    const x = (idx / (safe.length - 1)) * width;
    const norm = (val - min) / (max - min);
    // Keep wave inside y: 10..62 so peaks and valleys look identical to Apex
    const y = height - 10 - norm * (height - 22);
    return { x, y };
  });

  let lineD = `M ${coords[0]!.x.toFixed(1)},${coords[0]!.y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]!;
    const next = coords[i + 1]!;
    const cpx1 = curr.x + (next.x - curr.x) * 0.45;
    const cpy1 = curr.y;
    const cpx2 = curr.x + (next.x - curr.x) * 0.55;
    const cpy2 = next.y;
    lineD += ` C ${cpx1.toFixed(1)},${cpy1.toFixed(1)} ${cpx2.toFixed(1)},${cpy2.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
  }

  const areaD = `${lineD} L ${width},${height} L 0,${height} Z`;
  return { lineD, areaD };
}

export function SparklineKpiCard({
  valueText,
  label,
  subtitle,
  color,
  gradientId,
  points,
  panelClass,
  headingClass,
  subTextClass,
  onClick,
}: SparklineKpiCardProps) {
  const { lineD, areaD } = buildWavePaths(points);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-lg border text-left transition-transform duration-200 hover:-translate-y-0.5",
        panelClass,
      )}
    >
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-semibold tracking-tight", headingClass)}>
            {valueText}
          </span>
          <span className={cn("text-xs font-medium", subTextClass)}>{label}</span>
        </div>
        <p className={cn("mt-1 truncate text-[11px]", subTextClass)}>{subtitle}</p>
      </div>

      {/* Edge-to-edge bottom Apex area wave */}
      <div className="mt-1 h-[68px] w-full">
        <svg
          viewBox="0 0 300 74"
          preserveAspectRatio="none"
          className="block h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.52" />
              <stop offset="100%" stopColor={color} stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradientId})`} />
          <path
            d={lineD}
            fill="none"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </button>
  );
}
