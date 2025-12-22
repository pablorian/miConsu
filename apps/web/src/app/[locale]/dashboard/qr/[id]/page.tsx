'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

interface Scan {
  _id: string;
  qrCodeId: string;
  ip: string;
  userAgent: string;
  device: string;
  os: string;
  browser: string;
  country?: string;
  city?: string;
  createdAt: string;
}

interface QRCodeData {
  _id: string;
  url: string;
  shortId: string;
  qrImage: string;
  scans: number;
  createdAt: string;
}

export default function QRDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations('Dashboard.QRDetails');
  const locale = useLocale();
  const [qr, setQr] = useState<QRCodeData | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/qr/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
      })
      .then((data) => {
        setQr(data.qr);
        setScans(data.scans || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!qr) return <div className="p-8">QR Code not found</div>;

  return (
    <div className="min-h-screen text-foreground space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          {t('backToDashboard')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: QR Code & Main Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm mb-6">
                <img src={qr.qrImage} alt="QR Code" className="w-56 h-56 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-center mb-1">{qr.shortId}</h1>
              <p className="text-sm text-gray-500 break-all text-center mb-6 px-4">{qr.url}</p>

              <a
                href={qr.qrImage}
                download={`qr-${qr.shortId}.png`}
                className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all active:scale-95"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                {t('downloadPNG')}
              </a>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-900/50 p-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">
                {t('createdOn')} {new Date(qr.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Analytics & History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('totalScans')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{qr.scans}</p>
                </div>
              </div>
            </div>
            {/* Placeholders for future metrics */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 opacity-50 grayscale">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('topLocation')}</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 opacity-50 grayscale">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('topDevice')}</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scan History Table */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('scanHistory')}</h2>
              <span className="text-xs font-medium bg-gray-100 dark:bg-zinc-700 px-2.5 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{scans.length} {t('events')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-zinc-900/30 border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3 font-semibold">{t('time')}</th>
                    <th className="px-6 py-3 font-semibold">{t('device')}</th>
                    <th className="px-6 py-3 font-semibold">{t('os')}</th>
                    <th className="px-6 py-3 font-semibold">{t('location')}</th>
                    <th className="px-6 py-3 font-semibold">{t('ipAddress')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {scans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <p>{t('noHistory')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    scans.map((scan) => (
                      <tr key={scan._id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                          {new Date(scan.createdAt).toLocaleString(locale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{scan.device || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{scan.os || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{scan.city ? `${scan.city}, ${scan.country}` : '-'}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{scan.ip}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
