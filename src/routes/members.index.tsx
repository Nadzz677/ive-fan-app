import { createFileRoute } from "@tanstack/react-router";
import { useCatalog } from "@/lib/catalog";
import { MemberCard } from "@/components/MemberCard";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/members/")({
  head: () => ({
    meta: [
      { title: "IVE Members — Dive Archive" },
      {
        name: "description",
        content: "Meet the six members of IVE: Yujin, Gaeul, Rei, Wonyoung, Liz and Leeseo.",
      },
      { property: "og:title", content: "IVE Members — Dive Archive" },
      {
        property: "og:description",
        content: "Profiles for all six IVE members with positions and highlights.",
      },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const { members } = useCatalog();
  return (
    <div className="pb-6">
      <PageHeader
        title="Members"
        subtitle="Select a photocard to open the editorial profile and solo spotlight."
      />
      <div className="grid grid-cols-2 gap-3.5 px-5 sm:grid-cols-3">
        {members.map((member, i) => (
          <MemberCard key={member.id} member={member} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
