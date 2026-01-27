'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC'
];

interface CalendarSettingsProps {
  onTimezoneChange: (timezone: string) => void;
}

export default function CalendarSettings({ onTimezoneChange }: CalendarSettingsProps) {
  const t = useTranslations('Dashboard.Settings');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [publicId, setPublicId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch Timezone
      const tzRes = await fetch('/api/user/timezone');
      if (tzRes.ok) {
        const data = await tzRes.json();
        if (data.timezone) {
          setTimezone(data.timezone);
          onTimezoneChange(data.timezone);
        }
      }

      // Fetch Public ID
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.publicId) {
          setPublicId(data.publicId);
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const handleSaveTimezone = async (newTz: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/user/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: newTz }),
      });

      if (res.ok) {
        setTimezone(newTz);
        onTimezoneChange(newTz);
        setMessage(t('saved'));
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      console.error('Failed to save timezone', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePublicId = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(t('saved'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || t('error'));
      }
    } catch (e) {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
      <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('title')}
      </h3>

      {/* Timezone */}
      <div className="space-y-2">
        <label className="text-sm text-gray-700 dark:text-gray-200 block">
          {t('timezone')}
        </label>
        <select
          value={timezone}
          onChange={(e) => handleSaveTimezone(e.target.value)}
          disabled={loading}
          className="w-full rounded text-sm border-gray-300 dark:border-gray-600 dark:bg-zinc-700 bg-white"
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Public Profile ID */}
      <div className="space-y-2">
        <label className="text-sm text-gray-700 dark:text-gray-200 block">
          {t('publicIdLabel')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            placeholder={t('publicIdPlaceholder')}
            className="flex-1 rounded text-sm border-gray-300 dark:border-gray-600 dark:bg-zinc-700 bg-white"
          />
          <button
            onClick={handleSavePublicId}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('saving') : t('save')}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {message && <p className="text-xs text-green-600 animate-pulse">{message}</p>}
        <p className="text-xs text-gray-400">
          mi-consu.com/{publicId || '...'}
        </p>
      </div>
    </div>
  );
}
