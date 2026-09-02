export default function RootLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4 animate-pulse" aria-busy="true">
      <div className="h-8 w-56 rounded bg-border/60" />
      <div className="h-4 w-80 rounded bg-border/40" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
