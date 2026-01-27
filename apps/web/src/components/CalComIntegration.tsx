'use client';

import { useState, useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { useTranslations } from 'next-intl';

interface CalComIntegrationProps {
  initialSettings: {
    username: string;
    connected: boolean;
  };
  userId: string;
}

export default function CalComIntegration({ initialSettings, userId }: CalComIntegrationProps) {
  const t = useTranslations('CalCom');
  const [settings, setSettings] = useState(initialSettings);
  const [username, setUsername] = useState(initialSettings.username || '');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!initialSettings.connected || !initialSettings.username);

  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal("ui", { "styles": { "branding": { "brandColor": "#000000" } }, "hideEventTypeDetails": false, "layout": "month_view" });
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/calcom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving Cal.com settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/calcom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '' }),
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setUsername('');
        setEditing(true);
      }
    } catch (error) {
      console.error('Error disconnecting Cal.com', error);
    } finally {
      setLoading(false);
    }
  };

  const webhookUrlSection = (
    <div className="mb-8">
      <p className="text-lg font-semibold mb-4 text-foreground">Webhook URL</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            URL
          </label>
          <div className="flex items-center gap-2 max-w-xl">
            <code className="flex-1 bg-gray-50 dark:bg-black p-2 rounded border border-gray-200 dark:border-gray-700 text-xs break-all">
              {origin ? `${origin}/api/webhooks/calcom?userId=${userId}` : '.../api/webhooks/calcom'}
            </code>
            <button
              onClick={() => origin && navigator.clipboard.writeText(`${origin}/api/webhooks/calcom?userId=${userId}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
              title="Copy"
              disabled={!origin}
            >
              📋
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Copy this URL and paste it into your Cal.com Webhooks settings to sync bookings.
        </p>
      </div>
    </div>
  );

  if (editing) {
    return (
      <div className="space-y-8">
        {webhookUrlSection}

        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">{t('settings')}</h2>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {t('usernameLabel')}
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500">
                  cal.com/
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('usernamePlaceholder')}
                  className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || !username}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? t('connect') + '...' : t('connect')}
              </button>
              {settings.connected && (
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {t('viewCalendar')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {webhookUrlSection}

      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-sm text-muted-foreground">
            Connected as <span className="font-medium text-foreground">cal.com/{settings.username}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline px-2"
          >
            {t('changeAccount')}
          </button>
          <button
            onClick={handleDisconnect}
            className="text-sm text-red-600 dark:text-red-400 hover:underline px-2"
          >
            {t('disconnect')}
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-zinc-900">
        {settings.username ? (
          <Cal
            calLink={settings.username}
            style={{ width: "100%", height: "100%", overflow: "scroll" }}
            config={{ layout: 'month_view' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
            <p>{t('connect')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
