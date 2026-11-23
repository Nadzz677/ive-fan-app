import { createFileRoute, notFound } from "@tanstack/react-router";
import { Disc } from "lucide-react";
import { getMember as getStaticMember } from "@/data/members";
import { useCatalog } from "@/lib/catalog";
import { ArtworkImage } from "@/components/ArtworkImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { BackLink } from "@/components/BackLink";
import { SongCard } from "@/components/SongCard";
import { formatReleaseDate } from "@/lib/format";

export const Route = createFileRoute("/members/$memberId")({
  head: ({ params }) => {
    const member = getStaticMember(params.memberId);
    const title = member ? `${member.name} — IVE: Dive Archive` : "Member — IVE: Dive Archive";
    const description = member?.tagline ?? "IVE member profile.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: MemberDetail,
  notFoundComponent: () => (
    <div className="px-5 pt-10">
      <BackLink to="/members" label="Members" />
      <h1 className="font-editorial mt-6 text-3xl font-semibold">Member not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This profile isn&apos;t in the archive yet.</p>
    </div>
  ),
});

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="editorial-rule border-b py-2.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function MemberDetail() {
  const { memberId } = Route.useParams();
  const { tracks, members, getMember } = useCatalog();
  const member = getMember(memberId);
  if (!member) throw notFound();

  const memberIndex = members.findIndex((m) => m.id === member.id) + 1;
  const memberSolos = tracks.filter((t) => t.isSolo && t.member === member.id);

  return (
    <div className="pb-10">
      {/* Full-Bleed Editorial Portrait Header */}
      <div className="relative h-[62vh] max-h-[520px] w-full overflow-hidden bg-surface">
        <ArtworkImage
          src={member.image}
          alt={`${member.name} portrait artwork`}
          kind="member"
          width={768}
          height={1024}
          fallbackIconSize={72}
          className="h-full w-full object-cover object-top"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--background) 2%, color-mix(in oklab, var(--background) 50%, transparent) 36%, transparent 72%)",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 top-5 flex items-center justify-between px-5">
          <BackLink to="/members" label="Members" />
          <span className="rounded-full bg-background/60 px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/90 backdrop-blur-md">
            NO. {String(memberIndex).padStart(2, "0")} // IVE
          </span>
        </div>

        <div className="fade-up absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-5">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              {member.position}
            </p>
            <h1 className="font-editorial mt-1 truncate text-[2.9rem] font-semibold leading-[0.95]">
              {member.name}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {member.koreanName} · b. {member.birthYear}
            </p>
          </div>
          <FavoriteButton kind="member" id={member.id} size="lg" />
        </div>
      </div>

      {/* Editorial Magazine Spread Body (open hairlines, no repetitive boxes) */}
      <div className="fade-up mt-4 space-y-8 px-5">
        {/* Pull-Quote Tagline */}
        <p className="font-editorial italic text-2xl leading-snug text-primary/95">
          &ldquo;{member.tagline}&rdquo;
        </p>

        {/* Solo Track Spotlight */}
        {memberSolos.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Disc size={14} className="text-primary" />
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">
                Solo Spotlight
              </h2>
            </div>
            <div className="space-y-2">
              {memberSolos.map((solo) => (
                <SongCard key={solo.id} track={solo} />
              ))}
            </div>
          </section>
        )}

        {/* Profile Archival Specs */}
        <section>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">
            Profile Dossier
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-5">
            <SpecRow label="Stage Name" value={member.name} />
            {member.fullName && <SpecRow label="Full Name" value={member.fullName} />}
            <SpecRow label="Korean" value={member.koreanName} />
            <SpecRow label="Position" value={member.position} />
            {member.birthday && (
              <SpecRow label="Birthday" value={formatReleaseDate(member.birthday)} />
            )}
            {member.nationality && <SpecRow label="Nationality" value={member.nationality} />}
          </dl>
        </section>

        {/* Editorial Bio */}
        <section className="editorial-rule border-t pt-6">
          <h2 className="font-editorial text-2xl font-semibold">About</h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
        </section>

        {/* IVE Journey */}
        {member.journey && (
          <section className="editorial-rule border-t pt-6">
            <h2 className="font-editorial text-2xl font-semibold">IVE Journey</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{member.journey}</p>
          </section>
        )}

        {/* Numbered Archival Notes */}
        {member.facts && member.facts.length > 0 && (
          <section className="editorial-rule border-t pt-6">
            <h2 className="font-editorial text-2xl font-semibold">Archive Notes</h2>
            <ul className="mt-3.5 space-y-3">
              {member.facts.map((fact, idx) => (
                <li key={fact} className="flex items-baseline gap-3.5 text-sm text-muted-foreground">
                  <span className="font-mono text-[10px] font-semibold text-primary">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{fact}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
