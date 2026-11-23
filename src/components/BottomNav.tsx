import { Link, useRouterState } from "@tanstack/react-router";
import { Disc3, Heart, Home, ListMusic, Users } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/members", label: "Members", icon: Users },
  { to: "/discography", label: "Albums", icon: Disc3 },
  { to: "/music", label: "Music", icon: ListMusic },
  { to: "/favorites", label: "Faves", icon: Heart },
] as const;

export function BottomNav() {
  const { count } = useFavorites();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Keep /admin uncluttered and free of fixed backdrop-filter layers during keyboard entry
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-2.5 pt-1">
      <div className="glass-panel mx-auto flex max-w-md items-center justify-between rounded-full px-2 py-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="press group relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-muted-foreground transition-colors data-[status=active]:text-primary"
          >
            <span className="relative">
              <Icon size={18} strokeWidth={1.9} />
              {label === "Faves" && count > 0 && (
                <span className="absolute -right-2.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent px-1 text-[8px] font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </span>
            <span className="text-[9px] font-medium tracking-wide">{label}</span>
            <span
              aria-hidden="true"
              className="mt-0.5 h-1 w-1 rounded-full bg-primary opacity-0 transition-opacity group-data-[status=active]:opacity-100"
            />
          </Link>
        ))}
      </div>
    </nav>
  );
}
