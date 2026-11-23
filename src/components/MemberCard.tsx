import { Link } from "@tanstack/react-router";
import type { Member } from "@/types";
import { ArtworkImage } from "./ArtworkImage";
import { FavoriteButton } from "./FavoriteButton";

export function MemberCard({
  member,
  compact = false,
  index,
}: {
  member: Member;
  compact?: boolean;
  index?: number;
}) {
  const badge = index !== undefined ? `NO. ${String(index).padStart(2, "0")}` : undefined;

  return (
    <div className={compact ? "relative w-28 shrink-0 snap-start" : "relative"}>
      <Link
        to="/members/$memberId"
        params={{ memberId: member.id }}
        aria-label={`Open ${member.name}'s profile`}
        className="press group relative block h-full overflow-hidden rounded-2xl border border-glass-border bg-surface shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
      >
        <div className={compact ? "aspect-[3/4.2]" : "aspect-[3/4.3]"}>
          <ArtworkImage
            src={member.image}
            alt={`${member.name} portrait artwork`}
            kind="member"
            loading="lazy"
            width={768}
            height={1024}
            className="object-top transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        </div>

        {/* Subtle photocard inner frame & foil corner sheen */}
        <div
          className="photocard-foil pointer-events-none absolute inset-0 opacity-75"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-[5px] rounded-[0.8rem] border border-white/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, color-mix(in oklab, var(--background) 92%, black) 0%, color-mix(in oklab, var(--background) 38%, transparent) 38%, transparent 65%)",
          }}
          aria-hidden="true"
        />

        {badge && (
          <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-background/70 px-2 py-0.5 font-mono text-[8px] font-semibold tracking-[0.2em] text-foreground/90 backdrop-blur-md">
            {badge}
          </span>
        )}

        <div className={compact ? "absolute inset-x-0 bottom-0 p-2.5" : "absolute inset-x-0 bottom-0 p-3.5"}>
          <p
            className={
              compact
                ? "font-editorial truncate text-lg font-semibold leading-tight"
                : "font-editorial truncate text-[1.45rem] font-semibold leading-none"
            }
          >
            {member.name}
          </p>
          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {compact ? member.koreanName : `${member.koreanName} · ${member.position.split(",")[0]}`}
          </p>
        </div>
      </Link>

      {!compact && (
        <div className="absolute right-2.5 top-2.5 z-10">
          <FavoriteButton kind="member" id={member.id} size="sm" />
        </div>
      )}
    </div>
  );
}
