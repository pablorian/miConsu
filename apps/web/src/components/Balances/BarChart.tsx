'use client';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  formatValue?: (v: number) => string;
  horizontal?: boolean;
}

function defaultFormat(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export default function BarChart({ data, formatValue = defaultFormat, horizontal = false }: BarChartProps) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Sin datos</div>;
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-xs text-muted-foreground truncate text-right flex-shrink-0">{d.label}</div>
            <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: d.color || '#6366f1' }}
              />
            </div>
            <div className="text-xs font-medium text-foreground w-16 text-right flex-shrink-0">{formatValue(d.value)}</div>
          </div>
        ))}
      </div>
    );
  }

  const W = 500, H = 180, PAD = { top: 16, right: 10, bottom: 32, left: 10 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barW = Math.min(40, innerW / data.length - 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {data.map((d, i) => {
        const bh = (d.value / maxVal) * innerH;
        const x = PAD.left + (i / data.length) * innerW + (innerW / data.length - barW) / 2;
        const y = PAD.top + innerH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill={d.color || '#6366f1'} opacity="0.85"/>
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">
              {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
            </text>
            {bh > 20 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">
                {formatValue(d.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
