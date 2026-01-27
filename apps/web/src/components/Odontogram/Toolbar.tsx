import React from 'react';
import { useTranslations } from 'next-intl';

interface ToolbarProps {
  activeTool: string;
  onSelectTool: (tool: string) => void;
  recordState: 'done' | 'todo';
  onSelectState: (state: 'done' | 'todo') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool, recordState, onSelectState }) => {
  const t = useTranslations('Dashboard.Patients');

  const tools = [
    { id: 'healthy', color: 'white', label: t('healthy'), border: 'gray' },
    { id: 'caries', color: 'transparent', label: t('caries'), border: 'red', text: 'C' },
    { id: 'filling', color: 'transparent', label: t('filling'), border: 'blue', text: 'O' },
    { id: 'missing', color: 'transparent', label: t('missing'), icon: 'X', border: 'black' },
    { id: 'crown', color: 'transparent', label: t('crown'), border: 'orange', text: 'Co' },
    { id: 'endodontics', color: 'transparent', label: t('endodontics'), border: 'green', text: 'E' },
  ];

  return (
    <div className="flex flex-col gap-4 mb-6 w-full">
      {/* State Selector */}
      <div className="flex gap-4 p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg justify-center">
        <button
          type="button"
          onClick={() => onSelectState('done')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordState === 'done'
            ? 'bg-red-500 text-white'
            : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
            }`}
        >
          {t('realized')} (Red)
        </button>
        <button
          type="button"
          onClick={() => onSelectState('todo')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordState === 'todo'
            ? 'bg-blue-500 text-white'
            : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
            }`}
        >
          {t('todo')} (Blue)
        </button>
      </div>

      {/* Tools */}
      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-zinc-800 justify-center">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${activeTool === tool.id
              ? 'ring-2 ring-offset-2 ring-primary border-transparent'
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            style={{ borderColor: activeTool === tool.id ? undefined : 'transparent' }}
          >
            <div
              className="w-8 h-8 rounded border flex items-center justify-center font-bold text-lg"
              style={{ backgroundColor: tool.color, borderColor: tool.border }}
            >
              {tool.icon || tool.text}
            </div>
            <span className="text-sm font-medium">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Toolbar;
