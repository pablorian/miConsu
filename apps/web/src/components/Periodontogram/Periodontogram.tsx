'use client';

import { useState, useCallback } from 'react';

// Teeth rows: upper (1.8 to 2.8) and lower (3.8 to 4.8)
const UPPER_TEETH = ['1.8','1.7','1.6','1.5','1.4','1.3','1.2','1.1','2.1','2.2','2.3','2.4','2.5','2.6','2.7','2.8'];
const LOWER_TEETH = ['4.8','4.7','4.6','4.5','4.4','4.3','4.2','4.1','3.1','3.2','3.3','3.4','3.5','3.6','3.7','3.8'];

type SideData = {
  profundidad: [number, number, number];
  margenGingival: [number, number, number];
  exudado: [boolean, boolean, boolean];
  sangrado: [boolean, boolean, boolean];
  furca: number;
  movilidad: number;
};

type ToothData = {
  vestibular: SideData;
  palatina: SideData;
};

type PeriodontogramData = Record<string, ToothData>;

const defaultSide = (): SideData => ({
  profundidad: [0, 0, 0],
  margenGingival: [0, 0, 0],
  exudado: [false, false, false],
  sangrado: [false, false, false],
  furca: 0,
  movilidad: 0,
});

const defaultTooth = (): ToothData => ({
  vestibular: defaultSide(),
  palatina: defaultSide(),
});

function initData(existing: Record<string, any> | undefined): PeriodontogramData {
  const all = [...UPPER_TEETH, ...LOWER_TEETH];
  const data: PeriodontogramData = {};
  for (const t of all) {
    data[t] = existing?.[t] ?? defaultTooth();
  }
  return data;
}

interface PeriodontogramProps {
  initialData?: Record<string, any>;
  onChange: (data: PeriodontogramData) => void;
}

type RowKey = 'profundidad' | 'margenGingival' | 'exudado' | 'sangrado';

const ROWS: { key: RowKey; label: string; isBoolean: boolean }[] = [
  { key: 'profundidad', label: 'Prof. Sondaje', isBoolean: false },
  { key: 'margenGingival', label: 'Margen Gingival', isBoolean: false },
  { key: 'exudado', label: 'Exudado', isBoolean: true },
  { key: 'sangrado', label: 'Sangrado', isBoolean: true },
];

function PeriodontogramSection({
  title,
  teeth,
  side,
  data,
  onUpdate,
}: {
  title: string;
  teeth: string[];
  side: 'vestibular' | 'palatina';
  data: PeriodontogramData;
  onUpdate: (tooth: string, side: 'vestibular' | 'palatina', key: string, idx: number, value: number | boolean) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[800px]">
          <thead>
            <tr>
              <td className="w-24 px-2 py-1 text-muted-foreground text-right text-xs">Pieza</td>
              {teeth.map((t) => (
                <td key={t} className="text-center font-medium text-foreground py-1 min-w-[52px]">{t}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-2 py-1 text-muted-foreground text-right text-xs whitespace-nowrap">{row.label}</td>
                {teeth.map((tooth) => {
                  const toothData = data[tooth]?.[side] ?? defaultSide();
                  const values = toothData[row.key] as any[];
                  return (
                    <td key={tooth} className="py-0.5">
                      <div className="flex justify-center gap-px">
                        {[0, 1, 2].map((idx) => (
                          row.isBoolean ? (
                            <input
                              key={idx}
                              type="checkbox"
                              checked={!!values[idx]}
                              onChange={(e) => onUpdate(tooth, side, row.key, idx, e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          ) : (
                            <input
                              key={idx}
                              type="number"
                              min={0}
                              max={15}
                              value={values[idx] || 0}
                              onChange={(e) => onUpdate(tooth, side, row.key, idx, parseInt(e.target.value) || 0)}
                              className="w-7 h-6 text-center text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Furca y Movilidad (una sola celda por pieza) */}
            {['furca', 'movilidad'].map((field) => (
              <tr key={field} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-2 py-1 text-muted-foreground text-right text-xs capitalize">{field === 'furca' ? 'Furca' : 'Movilidad'}</td>
                {teeth.map((tooth) => {
                  const toothData = data[tooth]?.[side] ?? defaultSide();
                  return (
                    <td key={tooth} className="py-0.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={3}
                        value={(toothData as any)[field] || 0}
                        onChange={(e) => onUpdate(tooth, side, field, -1, parseInt(e.target.value) || 0)}
                        className="w-7 h-6 text-center text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Periodontogram({ initialData, onChange }: PeriodontogramProps) {
  const [data, setData] = useState<PeriodontogramData>(() => initData(initialData));

  const handleUpdate = useCallback((
    tooth: string,
    side: 'vestibular' | 'palatina',
    key: string,
    idx: number,
    value: number | boolean
  ) => {
    setData((prev) => {
      const updated = { ...prev };
      const toothData = { ...updated[tooth] };
      const sideData = { ...toothData[side] } as any;

      if (idx === -1) {
        sideData[key] = value;
      } else {
        const arr = [...(sideData[key] as any[])];
        arr[idx] = value;
        sideData[key] = arr;
      }

      toothData[side] = sideData;
      updated[tooth] = toothData;
      onChange(updated);
      return updated;
    });
  }, [onChange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Periodontograma</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Registro de profundidad de sondaje y nivel de inserción.</p>
        </div>
      </div>

      {/* MAXILAR SUPERIOR */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 text-center">
          Maxilar Superior
        </h4>
        <PeriodontogramSection
          title="Vestibular"
          teeth={UPPER_TEETH}
          side="vestibular"
          data={data}
          onUpdate={handleUpdate}
        />
        <PeriodontogramSection
          title="Palatina"
          teeth={UPPER_TEETH}
          side="palatina"
          data={data}
          onUpdate={handleUpdate}
        />
      </div>

      {/* MAXILAR INFERIOR */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 text-center">
          Maxilar Inferior
        </h4>
        <PeriodontogramSection
          title="Vestibular"
          teeth={LOWER_TEETH}
          side="vestibular"
          data={data}
          onUpdate={handleUpdate}
        />
        <PeriodontogramSection
          title="Lingual"
          teeth={LOWER_TEETH}
          side="palatina"
          data={data}
          onUpdate={handleUpdate}
        />
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span><strong>Prof. Sondaje</strong>: 0-15 mm</span>
        <span><strong>Margen Gingival</strong>: positivo = recesión, negativo = inflamación</span>
        <span><strong>Furca</strong>: 0-3</span>
        <span><strong>Movilidad</strong>: 0-3</span>
      </div>
    </div>
  );
}
