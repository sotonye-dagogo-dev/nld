import { Card, CardTitle } from "@/components/ui/card";
import type { DayCount } from "@/lib/analytics";

// Lightweight CSS bar chart for the analytics dashboard. Server-safe
// (no hooks, no client state) — renders a last-N-days series as proportional
// bars with value labels and sparse day labels so it stays readable at 30 days.

const LABEL_EVERY = 5;

export function AnalyticsBars({
  title,
  hint,
  series,
  barClass,
}: {
  title: string;
  hint?: string;
  series: DayCount[];
  barClass: string;
}) {
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </div>
      <div className="h-32">
        <div className="flex h-full items-end gap-px">
          {series.map((s) => {
            const h = s.count === 0 ? 2 : Math.max(6, Math.round((s.count / max) * 100));
            return (
              <div
                key={s.key}
                title={`${s.label}: ${s.count}`}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-[9px] leading-none text-text-muted">{s.count}</span>
                <div className={`w-full rounded-t ${barClass}`} style={{ height: `${h}%` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-px">
        {series.map((s, i) =>
          i % LABEL_EVERY === 0 || i === series.length - 1 ? (
            <span key={s.key} className="flex-1 text-center text-[9px] text-text-muted">
              {s.label}
            </span>
          ) : (
            <span key={s.key} className="flex-1" />
          ),
        )}
      </div>
    </Card>
  );
}