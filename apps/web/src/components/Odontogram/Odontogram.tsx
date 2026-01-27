'use client';

import React, { useState, useEffect } from 'react';
import Tooth from './Tooth';
import Toolbar from './Toolbar';
import { useTranslations } from 'next-intl';

interface OdontogramProps {
  initialData?: any[];
  onChange: (data: any[]) => void;
}

const Odontogram: React.FC<OdontogramProps> = ({ initialData = [], onChange }) => {
  const t = useTranslations('Dashboard.Patients');
  const [activeTool, setActiveTool] = useState('caries');
  const [recordState, setRecordState] = useState<'done' | 'todo'>('todo');
  const [teethData, setTeethData] = useState<any[]>(initialData || []);

  // Standard Permanent Dentition: 18-11, 21-28, 48-41, 31-38
  // We'll render: Top Arc (18-11 | 21-28) and Bottom Arc (48-41 | 31-38)
  const topRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const topLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const bottomRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const bottomLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  const getToothData = (id: number) => {
    return teethData.find(t => t.toothNumber === id) || {
      toothNumber: id,
      status: 'present',
      surfaces: {}
    };
  };

  const updateToothData = (id: number, updates: any) => {
    const index = teethData.findIndex(t => t.toothNumber === id);
    let newData;

    if (index >= 0) {
      newData = [...teethData];
      newData[index] = { ...newData[index], ...updates };
    } else {
      newData = [...teethData, { toothNumber: id, status: 'present', surfaces: {}, ...updates }];
    }

    setTeethData(newData);
    onChange(newData);
  };

  const handleSurfaceClick = (id: number, surface: string) => {
    const currentTooth = getToothData(id);

    // If tool is meant for whole tooth status (missing)
    if (activeTool === 'missing') {
      updateToothData(id, {
        status: currentTooth.status === 'missing' ? 'present' : 'missing'
      });
      return;
    }

    // Surface tools
    const currentSurfaces = { ...currentTooth.surfaces };
    if (activeTool === 'healthy') {
      delete currentSurfaces[surface as keyof typeof currentSurfaces];
    } else {
      // Store composite value: tool:state (e.g., caries:todo)
      currentSurfaces[surface as keyof typeof currentSurfaces] = `${activeTool}:${recordState}`;
    }

    updateToothData(id, { surfaces: currentSurfaces });
  };

  const handleToothClick = (id: number) => {
    if (activeTool === 'missing') {
      const currentTooth = getToothData(id);
      updateToothData(id, {
        status: currentTooth.status === 'missing' ? 'present' : 'missing'
      });
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Toolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        recordState={recordState}
        onSelectState={setRecordState}
      />

      <div className="grid gap-8 p-4 overflow-x-auto max-w-full">
        {/* Top Arch */}
        <div className="flex gap-1 md:gap-4 justify-center border-b pb-4">
          <div className="flex gap-1 md:gap-2">
            {topRight.map(id => (
              <Tooth key={id} id={id} data={getToothData(id)} onSurfaceClick={handleSurfaceClick} onToothClick={handleToothClick} />
            ))}
          </div>
          <div className="w-4 border-l border-gray-300"></div>
          <div className="flex gap-1 md:gap-2">
            {topLeft.map(id => (
              <Tooth key={id} id={id} data={getToothData(id)} onSurfaceClick={handleSurfaceClick} onToothClick={handleToothClick} />
            ))}
          </div>
        </div>

        {/* Bottom Arch */}
        <div className="flex gap-1 md:gap-4 justify-center pt-4">
          <div className="flex gap-1 md:gap-2">
            {bottomRight.map(id => (
              <Tooth key={id} id={id} data={getToothData(id)} onSurfaceClick={handleSurfaceClick} onToothClick={handleToothClick} />
            ))}
          </div>
          <div className="w-4 border-l border-gray-300"></div>
          <div className="flex gap-1 md:gap-2">
            {bottomLeft.map(id => (
              <Tooth key={id} id={id} data={getToothData(id)} onSurfaceClick={handleSurfaceClick} onToothClick={handleToothClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Odontogram;
