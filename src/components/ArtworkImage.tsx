import { useEffect, useState } from "react";
import { Disc3, Music, Sparkles, User } from "lucide-react";
import { sanitizeHttpsUrl } from "@/lib/url-security";
import { cn } from "@/lib/utils";

export interface ArtworkImageProps {
  src?: string | null;
  alt: string;
  kind?: "album" | "member" | "song" | "news";
  className?: string;
  containerClassName?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fallbackIconSize?: number;
  showEmptyLabel?: boolean;
}

export function ArtworkImage({
  src,
  alt,
  kind = "album",
  className,
  containerClassName,
  width = 1024,
  height = 1024,
  loading = "lazy",
  fallbackIconSize,
  showEmptyLabel = false,
}: ArtworkImageProps) {
  const [hasError, setHasError] = useState(false);
  const safeSrc = sanitizeHttpsUrl(src, { allowRelative: true });

  // Reset error status if the source URL changes
  useEffect(() => {
    setHasError(false);
  }, [safeSrc]);

  const hasValidImage = Boolean(safeSrc && !hasError);

  if (hasValidImage && safeSrc) {
    return (
      <img
        src={safeSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  // Clean neutral empty artwork state (NO placeholder/AI artwork)
  const defaultIconSize =
    fallbackIconSize ?? (kind === "member" ? 34 : kind === "news" ? 22 : kind === "song" ? 20 : 28);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center bg-card/60 text-muted-foreground/40 select-none",
        containerClassName,
      )}
      aria-label={alt}
    >
      {kind === "member" ? (
        <User size={defaultIconSize} strokeWidth={1.5} className="text-muted-foreground/35" />
      ) : kind === "news" ? (
        <Sparkles size={defaultIconSize} strokeWidth={1.5} className="text-muted-foreground/35" />
      ) : kind === "song" ? (
        <Music size={defaultIconSize} strokeWidth={1.5} className="text-muted-foreground/35" />
      ) : (
        <Disc3 size={defaultIconSize} strokeWidth={1.5} className="text-muted-foreground/35" />
      )}
      {showEmptyLabel && (
        <span className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
          No Artwork
        </span>
      )}
    </div>
  );
}
