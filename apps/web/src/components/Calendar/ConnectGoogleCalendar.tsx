'use client';

export default function ConnectGoogleCalendar() {
  const handleConnect = () => {
    window.location.href = '/api/auth/google-calendar/connect';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Connect your Calendar</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Connect your Google Calendar to synchronize events and manage your availability directly from miConsu.
      </p>
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
        </svg>
        Connect with Google
      </button>
    </div>
  );
}
