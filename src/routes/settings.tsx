import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import {
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Heart,
  History,
  ListMusic,
  Palette,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/PageHeader";
import { BackLink } from "@/components/BackLink";
import { useTheme } from "@/lib/theme";
import { useSettings } from "@/lib/settings";
import { useFavorites } from "@/lib/favorites";
import { useAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { clearRecentlyPlayed, useRecentlyPlayed } from "@/lib/recently-played";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — IVE: Dive Archive" },
      {
        name: "description",
        content:
          "Choose an album theme, tune playback behaviour and manage your saved IVE library.",
      },
      { property: "og:title", content: "Settings — IVE: Dive Archive" },
      {
        property: "og:description",
        content: "Album themes, playback preferences and library controls for IVE: Dive Archive.",
      },
    ],
  }),
  component: SettingsPage,
});

const APP_VERSION = "5.4.0";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="press flex w-full items-center gap-4 py-3.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform duration-200",
            checked ? "translate-x-[1.4rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function SettingsPage() {
  const { theme, setTheme, themes } = useTheme();
  const { settings, setSetting } = useSettings();
  const { count } = useFavorites();
  const {
    uid,
    isCloudEnabled,
    isPreviewingFanApp,
    loading: authLoading,
    error: authError,
    replayOnboarding,
  } = useAuth();
  const recent = useRecentlyPlayed();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="PREFERENCES"
        title="Settings"
        subtitle="Select an IVE album era to recolor the entire archive, or manage playback & sync."
        action={<BackLink to="/" label="Home" />}
      />

      {/* Album Era Themes */}
      <section className="mt-2">
        <SectionHeader
          eyebrow={`${themes.length} PALETTES`}
          title="Album Era Themes"
          action={<Palette size={15} className="text-primary" />}
        />
        <div className="space-y-2 px-5">
          {themes.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                onClick={(e) => {
                  const isKeyboard = e.clientX === 0 && e.clientY === 0;
                  if (isKeyboard) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTheme(t.id, {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                    });
                  } else {
                    setTheme(t.id, { x: e.clientX, y: e.clientY });
                  }
                }}
                aria-pressed={active}
                className={cn(
                  "press flex w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10 shadow-[var(--shadow-card)]"
                    : "editorial-rule bg-surface/45 hover:border-primary/30",
                )}
              >
                <span className="flex shrink-0 items-center -space-x-2">
                  {t.swatch.map((c) => (
                    <span
                      key={c}
                      className="h-6 w-6 rounded-full border border-white/20"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-editorial block text-xl font-semibold leading-tight">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {t.description}
                  </span>
                </span>
                {active && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Playback (Hairline Grouped) */}
      <section className="mt-9">
        <SectionHeader eyebrow="PLAYER ENGINE" title="Playback" />
        <div className="px-5">
          <div className="editorial-rule divide-y divide-white/[0.08] border-y">
            <ToggleRow
              label="Autoplay"
              description="Continue to the next song in the queue automatically."
              checked={settings.autoplay}
              onChange={(v) => setSetting("autoplay", v)}
            />
            <ToggleRow
              label="Remember last session"
              description="Reopen the app with your last song ready in the player."
              checked={settings.rememberPlayback}
              onChange={(v) => setSetting("rememberPlayback", v)}
            />
            <ToggleRow
              label="Track recently played"
              description="Save the last 15 songs you played to your history."
              checked={settings.trackRecentlyPlayed}
              onChange={(v) => setSetting("trackRecentlyPlayed", v)}
            />
          </div>
        </div>
      </section>

      {/* Library (Hairline Grouped) */}
      <section className="mt-9">
        <SectionHeader eyebrow="YOUR ARCHIVE" title="Library" />
        <div className="px-5">
          <div className="editorial-rule divide-y divide-white/[0.08] border-y">
            <Link to="/favorites" className="press flex items-center gap-3.5 py-3.5">
              <Heart size={16} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Favorites</span>
                <span className="block text-xs text-muted-foreground">{count} saved items</span>
              </span>
              <ChevronRight size={15} className="text-muted-foreground" />
            </Link>

            <div className="flex items-center gap-3.5 py-3.5">
              <History size={16} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Recently played</span>
                <span className="block text-xs text-muted-foreground">
                  {recent.length} songs in history
                </span>
              </span>
              <button
                type="button"
                onClick={clearRecentlyPlayed}
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-glass-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <Trash2 size={11} /> Clear
              </button>
            </div>

            <Link to="/music" className="press flex items-center gap-3.5 py-3.5">
              <ListMusic size={16} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Music library</span>
                <span className="block text-xs text-muted-foreground">Browse songs and eras</span>
              </span>
              <ChevronRight size={15} className="text-muted-foreground" />
            </Link>

            <button
              type="button"
              onClick={() => {
                replayOnboarding();
                void navigate({ to: "/" });
              }}
              className="press flex w-full items-center gap-3.5 py-3.5 text-left"
            >
              <Sparkles size={16} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Replay welcome tour</span>
                <span className="block text-xs text-muted-foreground">
                  View the 4-page DIVE Archive introduction again
                </span>
              </span>
              <ChevronRight size={15} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </section>

      {/* Cloud Sync & Database — Preserved exclusively for Desktop Admin Preview */}
      {!isNative && isPreviewingFanApp && (
        <section className="mt-9">
          <SectionHeader eyebrow="FIREBASE" title="Cloud Sync" />
          <div className="px-5">
            <div className="editorial-rule border-y py-4">
              <div className="flex items-center gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-glass-border bg-primary/10 text-primary">
                  {isCloudEnabled ? <Cloud size={16} /> : <CloudOff size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {isCloudEnabled
                      ? "Live Archive & Sync Active (Admin Preview)"
                      : isFirebaseConfigured && authLoading
                        ? "Connecting to Firebase..."
                        : "Local-Only Mode"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isCloudEnabled && uid
                      ? `Admin Session ID: ${uid.slice(0, 10)}… · Live catalog synced`
                      : authError
                        ? authError
                        : "Favorites, era theme, and history are saved on your device."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About Footer */}
      <section className="mt-9 px-5">
        <p className="font-editorial text-xl font-semibold">IVE: Dive Archive</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          A fan-made editorial archive of IVE&apos;s members, discography, lyrics, and music.
          Streams play via official YouTube embeds and linked cloud audio sources.
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
          V{APP_VERSION} · Not affiliated with IVE or Starship Entertainment
        </p>
      </section>
    </div>
  );
}
