import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Disc3, Sparkles, Tag, X } from "lucide-react";
import { useNews } from "@/lib/catalog";
import { formatReleaseDate } from "@/lib/format";
import { ArtworkImage } from "./ArtworkImage";
import type { NewsItem } from "@/types";

export function LatestNewsSection() {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const { data: newsItems } = useNews();

  useEffect(() => {
    if (!selectedNews) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setSelectedNews(null);
    };
    window.addEventListener("ive:android-back", handleBack);
    return () => {
      window.removeEventListener("ive:android-back", handleBack);
    };
  }, [selectedNews]);

  return (
    <div>
      {/* Horizontal swipeable editorial magazine cards */}
      <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {newsItems.map((item) => (
          <article
            key={item.id}
            onClick={() => setSelectedNews(item)}
            className="press group w-[78vw] max-w-[300px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl border border-glass-border bg-surface/80 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface">
              <ArtworkImage
                src={item.image ?? null}
                alt={item.title}
                kind="news"
                loading="lazy"
                width={480}
                height={300}
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, color-mix(in oklab, var(--surface) 88%, black) 0%, transparent 55%)",
                }}
                aria-hidden="true"
              />
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <span className="rounded-full bg-background/75 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur-md">
                  {item.category}
                </span>
              </div>
              <span className="absolute bottom-2.5 left-3 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/80">
                {formatReleaseDate(item.date)}
              </span>
            </div>

            <div className="p-3.5">
              <h3 className="font-editorial line-clamp-2 text-[1.25rem] font-semibold leading-snug group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
              <div className="mt-3 flex items-center justify-between pt-2.5 editorial-rule border-t">
                {item.albumId ? (
                  <Link
                    to="/discography/$albumId"
                    params={{ albumId: item.albumId }}
                    onClick={(e) => e.stopPropagation()}
                    className="press inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-primary"
                  >
                    <Disc3 size={11} /> Release
                  </Link>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    IVE Official
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground/80">
                  Read <ChevronRight size={12} />
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* News Details Modal Dialog */}
      {selectedNews && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="glass-panel relative w-full max-w-lg overflow-hidden rounded-3xl p-5 shadow-2xl border border-glass-border animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedNews(null)}
              aria-label="Close dialog"
              className="press absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur-md"
            >
              <X size={16} />
            </button>

            {selectedNews.image ? (
              <div className="relative -mx-5 -mt-5 mb-4 h-48 overflow-hidden bg-surface">
                <ArtworkImage
                  src={selectedNews.image}
                  alt={selectedNews.title}
                  kind="news"
                  width={600}
                  height={300}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, var(--card) 0%, transparent 70%)",
                  }}
                  aria-hidden="true"
                />
                <span className="absolute bottom-3 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-lg">
                  <Sparkles size={11} /> {selectedNews.category}
                </span>
              </div>
            ) : (
              <div className="mb-3 pt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Sparkles size={11} /> {selectedNews.category}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Calendar size={11} /> {formatReleaseDate(selectedNews.date)}
              {selectedNews.tag && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Tag size={10} /> {selectedNews.tag}
                  </span>
                </>
              )}
            </div>

            <h2
              id="news-modal-title"
              className="font-editorial mt-2 text-2xl font-semibold leading-tight"
            >
              {selectedNews.title}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {selectedNews.summary}
            </p>

            {selectedNews.details && selectedNews.details.length > 0 && (
              <div className="editorial-rule mt-4 space-y-2 border-t pt-3.5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Highlights
                </p>
                <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  {selectedNews.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-[10px] text-primary">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="editorial-rule mt-5 flex items-center justify-between border-t pt-4">
              {selectedNews.albumId ? (
                <Link
                  to="/discography/$albumId"
                  params={{ albumId: selectedNews.albumId }}
                  onClick={() => setSelectedNews(null)}
                  className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground glow"
                >
                  <Disc3 size={13} /> View Release
                </Link>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="press rounded-full border border-glass-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
