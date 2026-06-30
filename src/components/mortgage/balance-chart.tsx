import { formatCurrency, formatDate } from "@/lib/format";
import type { BalancePoint } from "@/lib/mortgage";

// Dependency-free SVG line chart of loan balance over time: a solid line for the
// recorded history and a dashed line for the projection to payoff. Purely
// presentational — it scales whatever points it's given into a fixed viewBox and
// renders responsively (w-full, h-auto).

type Props = {
  actual: BalancePoint[];
  projected: BalancePoint[];
};

const W = 720;
const H = 240;
const PAD = { top: 16, right: 20, bottom: 28, left: 72 };

export function BalanceChart({ actual, projected }: Props) {
  const all = [...actual, ...projected];
  if (all.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Log a repayment to see the balance trend and payoff projection.
      </p>
    );
  }

  const times = all.map((p) => p.date.getTime());
  const minX = Math.min(...times);
  const maxX = Math.max(...times);
  const maxY = Math.max(...all.map((p) => p.balance), 1);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const sx = (t: number) =>
    PAD.left + (maxX === minX ? 0 : ((t - minX) / (maxX - minX)) * innerW);
  const sy = (v: number) => PAD.top + innerH - (v / maxY) * innerH;

  const toPath = (pts: BalancePoint[]) =>
    pts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${sx(p.date.getTime()).toFixed(1)} ${sy(
            p.balance
          ).toFixed(1)}`
      )
      .join(" ");

  const baselineY = sy(0);
  const last = projected[projected.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Loan balance over time with payoff projection"
    >
      {/* y-axis reference lines: 0 and the opening balance */}
      <line
        x1={PAD.left}
        y1={baselineY}
        x2={W - PAD.right}
        y2={baselineY}
        className="stroke-border"
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        y1={sy(maxY)}
        x2={W - PAD.right}
        y2={sy(maxY)}
        className="stroke-border"
        strokeWidth={1}
        strokeDasharray="2 4"
      />

      {/* y-axis labels */}
      <text
        x={PAD.left - 8}
        y={sy(maxY) + 4}
        textAnchor="end"
        className="fill-muted-foreground text-[11px]"
      >
        {formatCurrency(maxY)}
      </text>
      <text
        x={PAD.left - 8}
        y={baselineY + 4}
        textAnchor="end"
        className="fill-muted-foreground text-[11px]"
      >
        {formatCurrency(0)}
      </text>

      {/* x-axis labels: first and last dates */}
      <text
        x={PAD.left}
        y={H - 8}
        textAnchor="start"
        className="fill-muted-foreground text-[11px]"
      >
        {formatDate(new Date(minX))}
      </text>
      <text
        x={W - PAD.right}
        y={H - 8}
        textAnchor="end"
        className="fill-muted-foreground text-[11px]"
      >
        {formatDate(new Date(maxX))}
      </text>

      {/* projected balance (dashed) */}
      <path
        d={toPath(projected)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="5 4"
        className="text-muted-foreground"
      />

      {/* actual balance (solid) */}
      <path
        d={toPath(actual)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* payoff marker */}
      <circle
        cx={sx(last.date.getTime())}
        cy={sy(last.balance)}
        r={3.5}
        className="fill-primary"
      />
    </svg>
  );
}
