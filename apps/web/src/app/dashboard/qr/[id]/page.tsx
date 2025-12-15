'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen p-8 md:p-24 bg-gray-50 dark:bg-zinc-900 text-foreground">
      <button
        onClick={() => router.back()}
        className="mb-8 px-4 py-2 text-sm bg-gray-200 dark:bg-zinc-800 rounded hover:bg-gray-300 dark:hover:bg-zinc-700 transition"
      >
        ← Back to Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md flex flex-col items-center">
          <img src={qr.qrImage} alt="QR Code" className="w-64 h-64 mb-4 border rounded" />
          <h2 className="text-xl font-bold mb-2">{qr.shortId}</h2>
          <p className="text-sm text-gray-500 break-all">{qr.url}</p>
          <div className="mt-4 flex gap-2">
            <a
              href={qr.qrImage}
              download={`qr-${qr.shortId}.png`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Download PNG
            </a>
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6">Analytics Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Scans</p>
              <p className="text-3xl font-bold">{qr.scans}</p>
            </div>
            {/* Add more metrics here later if needed */}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Scan History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b dark:border-zinc-700">
                <th className="pb-3 font-semibold">Time</th>
                <th className="pb-3 font-semibold">Device</th>
                <th className="pb-3 font-semibold">OS</th>
                <th className="pb-3 font-semibold">Location</th>
                <th className="pb-3 font-semibold">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">No scans yet</td>
                </tr>
              ) : (
                scans.map((scan) => (
                  <tr key={scan._id} className="border-b dark:border-zinc-700 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                    <td className="py-3">
                      {new Date(scan.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3">{scan.device || 'Unknown'}</td>
                    <td className="py-3">{scan.os || 'Unknown'}</td>
                    <td className="py-3">{scan.city ? `${scan.city}, ${scan.country}` : 'Unknown'}</td>
                    <td className="py-3 font-mono text-sm">{scan.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
