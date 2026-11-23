import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function BackLink({ to, label }: { to: "/" | "/members" | "/discography"; label: string }) {
  return (
    <Link
      to={to}
      className="press glass-panel inline-flex items-center gap-1.5 rounded-full py-2 pl-2 pr-3.5 text-xs font-medium"
    >
      <ChevronLeft size={15} />
      {label}
    </Link>
  );
}
