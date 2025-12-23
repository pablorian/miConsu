'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import DownloadOptions from './DownloadOptions';


interface QRCodeData {
  _id: string;
  url: string; // Destination
  shortId: string;
  qrImage: string;
  scans: number;
  createdAt: string;
}

export default function DashboardClient() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const [url, setUrl] = useState('');
  const [qrs, setQrs] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch('/api/qr')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setQrs(data);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR Code?')) return;
    try {
      const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQrs(qrs.filter((q) => q.shortId !== id));
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data) {
        setQrs([data, ...qrs]);
        setUrl('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track your QR codes</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('createNew')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-zinc-900 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:text-white transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : null}
            {loading ? t('generating') : t('generate')}
          </button>
        </form>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {initialLoading ? (
          // Skeleton Loader
          [...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5 shadow-sm h-[200px]">
              <div className="flex gap-4 mb-4">
                <div className="h-24 w-24 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/4 ml-auto"></div>
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/3 ml-auto"></div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : qrs.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="bg-gray-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{t('noQRCodes')}</p>
            <p className="text-sm text-gray-500 max-w-sm mt-1">Get started by creating your first QR code above.</p>
          </div>
        ) : (
          qrs.map((qr) => (
            <div
              key={qr._id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700 bg-white p-1">
                    <img src={qr.qrImage} alt="QR Code" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      {qr.scans} {t('scans')}
                    </span>
                    <span className="text-xs text-gray-400 text-right">
                      {new Date(qr.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={qr.url}>
                    {qr.url}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-mono">ID: {qr.shortId}</p>
                </div>
              </div>

              <div className="flex items-center border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900/50 px-5 py-3 gap-3">
                <Link
                  href={`/dashboard/qr/${qr.shortId}`}
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('details')}
                </Link>
                <div className="flex-1">
                  <DownloadOptions url={qr.url} fileName={`qr-${qr.shortId}`} />
                </div>
                <button
                  onClick={() => handleDelete(qr.shortId)}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
