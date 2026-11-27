import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Copyright,
  FileText,
  HelpCircle,
  Lock,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { FAQ_ITEMS, LEGAL_DOCUMENTS, LEGAL_META, type LegalDocId } from "@/data/legal";
import { cn } from "@/lib/utils";

interface LegalInfoModalProps {
  docId: LegalDocId | null;
  onClose: () => void;
}

export function LegalInfoModal({ docId, onClose }: LegalInfoModalProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  useEffect(() => {
    if (!docId) return;

    const handleAndroidBack = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("ive:android-back", handleAndroidBack);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("ive:android-back", handleAndroidBack);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [docId, onClose]);

  if (!docId) return null;

  const isFaq = docId === "faq";
  const doc = isFaq ? null : LEGAL_DOCUMENTS[docId];

  const headerEyebrow = isFaq ? "HELP CENTER" : doc!.eyebrow;
  const headerTitle = isFaq ? "Frequently Asked Questions" : doc!.title;
  const headerSubtitle = isFaq
    ? "Everything you need to know about IVE: Dive Archive, media sources, and support."
    : doc!.subtitle;

  const HeaderIcon =
    docId === "developer"
      ? Sparkles
      : docId === "faq"
        ? HelpCircle
        : docId === "copyright"
          ? Copyright
          : docId === "terms"
            ? FileText
            : Lock;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass-panel relative flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-glass-border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header */}
        <div className="editorial-rule flex shrink-0 items-start justify-between gap-3 border-b px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em] text-primary">
              <HeaderIcon size={12} />
              <span>{headerEyebrow}</span>
              <span className="opacity-45">·</span>
              <span className="text-muted-foreground">{LEGAL_META.lastUpdated}</span>
            </div>
            <h2
              id="legal-modal-title"
              className="font-editorial mt-1.5 text-2xl font-semibold leading-tight text-foreground"
            >
              {headerTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="press grid h-8 w-8 shrink-0 place-items-center rounded-full border border-glass-border bg-background/70 text-foreground backdrop-blur-md"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isFaq ? (
            <div className="space-y-2.5">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "overflow-hidden rounded-2xl border transition-colors",
                      isOpen
                        ? "border-primary/45 bg-primary/[0.08]"
                        : "editorial-rule bg-surface/45",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="flex min-w-0 items-baseline gap-2.5">
                        <span className="font-mono text-[10px] font-semibold text-primary">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[13px] font-semibold leading-snug text-foreground">
                          {item.question}
                        </span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={cn(
                          "shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180 text-primary",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-white/[0.08] px-4 pt-2.5 pb-3.5">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {item.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {doc!.sections.map((section, idx) => (
                <section key={section.title} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] font-semibold text-primary">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-editorial text-xl font-semibold leading-snug text-foreground">
                      {section.title}
                    </h3>
                  </div>

                  {section.paragraphs?.map((para, pIdx) => (
                    <p key={pIdx} className="text-xs leading-relaxed text-foreground/85">
                      {para}
                    </p>
                  ))}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-1.5 pt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {section.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* Direct Creator, GitHub & Contact Card */}
          <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Developer &amp; Contact
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                  @{LEGAL_META.creator} · {LEGAL_META.contactEmail}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={LEGAL_META.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex items-center gap-1 rounded-full border border-glass-border bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-foreground backdrop-blur-md"
                >
                  GitHub <ArrowUpRight size={11} />
                </a>
                <a
                  href={`mailto:${LEGAL_META.contactEmail}?subject=IVE%20Dive%20Archive%20Inquiry`}
                  className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm"
                >
                  <Mail size={12} />
                  Email
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="editorial-rule flex shrink-0 items-center justify-between border-t px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {LEGAL_META.appName} · V{LEGAL_META.version}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="press rounded-full border border-glass-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
