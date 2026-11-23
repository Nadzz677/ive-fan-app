import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Cake, ChevronRight, Sparkles } from "lucide-react";
import { members as staticMembers } from "@/data/members";
import { useCatalog } from "@/lib/catalog";
import { ArtworkImage } from "./ArtworkImage";
import type { Member } from "@/types";

interface UpcomingBirthdayInfo {
  member: Member;
  birthDateFormatted: string;
  daysRemaining: number;
  isToday: boolean;
  ageTurning: number;
  nextDate: Date;
}

export function getUpcomingBirthdays(memberList: Member[] = staticMembers): UpcomingBirthdayInfo[] {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const results: UpcomingBirthdayInfo[] = memberList
    .filter((m) => !!m.birthday)
    .map((member) => {
      const parts = member.birthday!.split("-");
      const birthYear = parseInt(parts[0] ?? "2000", 10);
      const birthMonth = parseInt(parts[1] ?? "1", 10) - 1;
      const birthDay = parseInt(parts[2] ?? "1", 10);

      let targetYear = now.getFullYear();
      let nextDate = new Date(targetYear, birthMonth, birthDay);

      if (nextDate.getTime() < todayMidnight.getTime()) {
        targetYear += 1;
        nextDate = new Date(targetYear, birthMonth, birthDay);
      }

      const diffMs = nextDate.getTime() - todayMidnight.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isToday = daysRemaining === 0;
      const ageTurning = targetYear - birthYear;

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const birthDateFormatted = `${monthNames[birthMonth]} ${birthDay}`;

      return {
        member,
        birthDateFormatted,
        daysRemaining,
        isToday,
        ageTurning,
        nextDate,
      };
    });

  results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return results;
}

export function BirthdayCountdown() {
  const { members } = useCatalog();
  const upcomingList = useMemo(() => getUpcomingBirthdays(members), [members]);
  const nextBirthday = upcomingList[0];
  const followingBirthday = upcomingList[1];

  if (!nextBirthday) return null;

  const { member, birthDateFormatted, daysRemaining, isToday, ageTurning } = nextBirthday;

  return (
    <div className="px-5">
      <div className="editorial-rule border-y py-4">
        <Link
          to="/members/$memberId"
          params={{ memberId: member.id }}
          className="press group flex items-center gap-3.5"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-primary/40 bg-surface p-0.5">
            <div className="h-full w-full overflow-hidden rounded-full">
              <ArtworkImage
                src={member.image}
                alt={`${member.name} portrait`}
                kind="member"
                loading="lazy"
                width={80}
                height={80}
                className="object-top"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
              <Cake size={11} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary"
              suppressHydrationWarning
            >
              {birthDateFormatted} · Turning {ageTurning}
            </p>
            <h3 className="font-editorial mt-0.5 truncate text-2xl font-semibold leading-tight group-hover:text-primary transition-colors">
              {member.name}{" "}
              <span className="font-sans text-xs font-normal text-muted-foreground">
                {member.koreanName}
              </span>
            </h3>
          </div>

          <div className="shrink-0 text-right">
            {isToday ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground glow">
                <Sparkles size={12} /> Today!
              </span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span
                  className="font-editorial text-4xl font-semibold leading-none text-primary"
                  suppressHydrationWarning
                >
                  {daysRemaining}
                </span>
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground"
                  suppressHydrationWarning
                >
                  {daysRemaining === 1 ? "day" : "days"}
                </span>
              </div>
            )}
          </div>
        </Link>

        {followingBirthday && !isToday && (
          <Link
            to="/members/$memberId"
            params={{ memberId: followingBirthday.member.id }}
            className="mt-3 flex items-center justify-between pt-2.5 text-[11px] text-muted-foreground editorial-rule border-t"
          >
            <span className="truncate">
              Next up:{" "}
              <strong className="font-medium text-foreground">
                {followingBirthday.member.name}
              </strong>{" "}
              ({followingBirthday.birthDateFormatted})
            </span>
            <span
              className="ml-2 inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-primary"
              suppressHydrationWarning
            >
              in {followingBirthday.daysRemaining}d <ChevronRight size={12} />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
