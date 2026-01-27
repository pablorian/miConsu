'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface Calendar {
  id: string;
  summary: string;
  backgroundColor: string;
  foregroundColor: string;
  primary?: boolean;
}

interface CalendarListProps {
  preferences: Record<string, { visible: boolean; isPublic?: boolean; publicSlug?: string }>;
  onToggle: (id: string, visible: boolean) => void;
  onUpdateSettings: (id: string, updates: { isPublic?: boolean; publicSlug?: string; visible?: boolean }) => void;
  userPublicId?: string;
}

export default function CalendarList({ preferences, onToggle, onUpdateSettings, userPublicId }: CalendarListProps) {
  const t = useTranslations('Dashboard.CalendarList');
  const activeLocale = useLocale();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    try {
      const res = await fetch('/api/calendar/list');
      if (res.ok) {
        const data: Calendar[] = await res.json();
        setCalendars(data);
      }
    } catch (e) {
      console.error('Failed to list calendars', e);
    } finally {
      setLoading(false);
    }
  };

  const isVisible = (id: string) => {
    if (preferences && preferences[id] && preferences[id].visible !== undefined) {
      return preferences[id].visible;
    }
    return true;
  };

  const getSettings = (id: string) => {
    return preferences[id] || {};
  };

  const handleCheckboxChange = (id: string) => {
    const current = isVisible(id);
    onToggle(id, !current);
    // If we toggle visibility off, should we close expansion? Maybe not.
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    onUpdateSettings(id, { [field]: value });
  };

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-md"></div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('myCalendars')}
      </h3>
      <div className="space-y-2">
        {calendars.map(cal => (
          <div key={cal.id} className="flex flex-col gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={cal.id}
                checked={isVisible(cal.id)}
                onChange={() => handleCheckboxChange(cal.id)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                style={{ color: cal.backgroundColor }}
              />
              <label
                htmlFor={cal.id}
                className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none truncate flex-1"
              >
                {cal.summary}
              </label>

              <button
                onClick={() => setExpandedId(expandedId === cal.id ? null : cal.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={t('configure')}
              >
                {/* Simple Gear Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>

              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cal.backgroundColor }}
              />
            </div>

            {/* Expansion Panel for Settings */}
            {expandedId === cal.id && (
              <div className="pl-6 pr-2 py-2 space-y-3 bg-gray-50 dark:bg-zinc-900/50 rounded text-xs border-l-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`public-${cal.id}`}
                    checked={getSettings(cal.id).isPublic || false}
                    onChange={(e) => handleUpdate(cal.id, 'isPublic', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-200"
                  />
                  <label htmlFor={`public-${cal.id}`} className="text-gray-600 dark:text-gray-300 select-none">
                    {t('acceptBookings')}
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 dark:text-gray-400 block">{t('publicSlug')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getSettings(cal.id).publicSlug || ''}
                      onChange={(e) => handleUpdate(cal.id, 'publicSlug', e.target.value)}
                      placeholder="consultas"
                      className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-400"
                    />
                    {getSettings(cal.id).isPublic && userPublicId && getSettings(cal.id).publicSlug && (
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/${activeLocale}/${userPublicId}/calendar/${getSettings(cal.id).publicSlug}`;
                          navigator.clipboard.writeText(url);
                          alert('Link copiado al portapapeles!');
                        }}
                        className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-2 rounded hover:bg-blue-200 transition-colors"
                        title="Copiar Link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
