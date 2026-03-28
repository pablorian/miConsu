'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  isConnected: boolean;
  onDisconnect?: () => Promise<void>;
}

export default function GoogleCalendarIntegration({ isConnected, onDisconnect }: Props) {
  const t = useTranslations('Dashboard.Settings');
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    window.location.href = '/api/auth/google-calendar/connect';
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google-calendar/disconnect', { method: 'DELETE' });
      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Failed to disconnect');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
      <div className="flex items-center space-x-4 mb-4 sm:mb-0">
        <div className="p-2 border rounded-md">
          <svg className="h-6 w-6" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
        </div>
        <div>
          <h3 className="font-semibold">Google Calendar</h3>
          {isConnected ? (
             <p className="text-sm text-green-600 dark:text-green-400 font-medium">Connected</p>
          ) : (
             <p className="text-sm text-muted-foreground">Not connected</p>
          )}
        </div>
      </div>
      
      <div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-4 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Calendar'}
          </button>
        )}
      </div>
    </div>
  );
}
