import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import type { FavoriteKind } from "@/types";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  kind: FavoriteKind;
  id: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizes = {
  sm: { box: "h-8 w-8", icon: 14 },
  md: { box: "h-10 w-10", icon: 18 },
  lg: { box: "h-12 w-12", icon: 22 },
};

export function FavoriteButton({ kind, id, size = "md", className, label }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(kind, id);
  const s = sizes[size];

  return (
    <button
      type="button"
      aria-label={label ?? (active ? "Remove from favorites" : "Add to favorites")}
      aria-pressed={active}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(kind, id);
      }}
      className={cn(
        "press grid shrink-0 place-items-center rounded-full border border-glass-border",
        s.box,
        active
          ? "bg-accent/20 text-accent"
          : "bg-glass text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Heart
        size={s.icon}
        className={cn("transition-transform duration-300", active && "scale-110 fill-current")}
      />
    </button>
  );
}
