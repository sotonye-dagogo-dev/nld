export default function AdminPanelLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded bg-border/60" />
      <div className="h-4 w-64 rounded bg-border/40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface p-4">
            <div className="h-6 w-16 rounded bg-border/50 mx-auto" />
            <div className="mt-3 h-3 w-24 rounded bg-border/30 mx-auto" />
          </div>
        ))}
      </div>
      <div className="h-48 rounded-xl border border-border bg-surface" />
    </div>
  );
}
