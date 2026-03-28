'use client';

interface DataPoint {
  date: string;
  ingresos: number;
  egresos: number;
}

interface LineChartProps {
  data: DataPoint[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function LineChart({ data }: LineChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos en el período seleccionado
      </div>
    );
  }

  const W = 800, H = 220, PAD = { top: 20, right: 20, bottom: 40, left: 70 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.ingresos, d.egresos, d.ingresos - d.egresos]), 1);
  const minVal = 0;

  const xScale = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

  const linePath = (key: 'ingresos' | 'egresos' | 'ganancia') => {
    const pts = data.map((d, i) => {
      const v = key === 'ganancia' ? d.ingresos - d.egresos : d[key];
      return `${xScale(i)},${yScale(v)}`;
    });
    return `M ${pts.join(' L ')}`;
  };

  const areaPath = (key: 'ingresos') => {
    const pts = data.map((d, i) => `${xScale(i)},${yScale(d[key])}`);
    const bottom = `${xScale(data.length - 1)},${yScale(0)} ${xScale(0)},${yScale(0)}`;
    return `M ${pts.join(' L ')} L ${bottom} Z`;
  };

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: minVal + t * maxVal, y: yScale(minVal + t * maxVal) }));

  // X axis labels (show at most 6)
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="ingresosGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"/>
            <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.5">
              {formatCurrency(t.v)}
            </text>
          </g>
        ))}

        {/* Area under ingresos */}
        {data.length > 1 && <path d={areaPath('ingresos')} fill="url(#ingresosGrad)"/>}

        {/* Lines */}
        {data.length > 1 && (
          <>
            <path d={linePath('ingresos')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d={linePath('egresos')} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3"/>
            <path d={linePath('ganancia')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}

        {/* Dots for single points */}
        {data.length === 1 && (
          <>
            <circle cx={xScale(0)} cy={yScale(data[0].ingresos)} r="4" fill="#3b82f6"/>
            <circle cx={xScale(0)} cy={yScale(data[0].egresos)} r="4" fill="#ef4444"/>
          </>
        )}

        {/* X axis labels */}
        {xLabels.map((d, i) => {
          const idx = data.indexOf(d);
          return (
            <text key={i} x={xScale(idx)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-1 justify-center">
        {[
          { color: '#3b82f6', label: 'Ingresos' },
          { color: '#ef4444', label: 'Egresos' },
          { color: '#10b981', label: 'Ganancia' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }}/>
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
