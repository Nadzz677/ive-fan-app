export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="fade-up px-5 pb-5 pt-7">
      {(eyebrow || action) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {eyebrow ? (
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.26em] text-primary">
              {eyebrow}
            </p>
          ) : (
            <span />
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <h1 className="font-editorial text-[2.6rem] font-semibold leading-[1.02] tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
      <div className="editorial-rule mt-5 border-b" aria-hidden="true" />
    </header>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 px-5">
      {eyebrow && (
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-primary/90">
          {eyebrow}
        </p>
      )}
      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <h2 className="font-editorial text-[1.65rem] font-semibold leading-tight">{title}</h2>
        {action}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="fade-up editorial-rule mx-5 flex flex-col items-center rounded-3xl border border-dashed bg-surface/35 px-6 py-11 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-glass-border bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-editorial mt-4 text-2xl font-semibold">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
