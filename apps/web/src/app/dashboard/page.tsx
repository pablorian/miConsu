'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QRCodeData {
  _id: string;
  url: string; // Destination
  shortId: string;
  qrImage: string;
  scans: number;
  createdAt: string;
}

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [qrs, setQrs] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/qr')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setQrs(data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const newQR = await res.json();
      if (res.ok) {
        setQrs([newQR, ...qrs]);
        setUrl('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR Code?')) return;
    try {
      const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQrs(qrs.filter((q) => q._id !== id));
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen p-8 md:p-24 bg-gray-50 dark:bg-zinc-900 text-foreground">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New QR Code</h2>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="url"
            placeholder="Enter URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1 p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qrs.map((qr) => (
          <div key={qr._id} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md flex flex-col items-center relative group">
            <span className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
              Scans: {qr.scans}
            </span>
            <button
              onClick={() => handleDelete(qr._id)}
              className="absolute top-2 left-2 bg-red-100 text-red-800 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
            <Link href={`/dashboard/qr/${qr._id}`} className="flex flex-col items-center w-full cursor-pointer hover:opacity-80 transition">
              <img src={qr.qrImage} alt="QR Code" className="w-48 h-48 mb-4 border" />
              <p className="text-sm text-gray-500 mb-2 truncate max-w-full font-bold">Target: {qr.url}</p>
              <p className="text-xs text-gray-400 mb-2">ID: {qr.shortId}</p>
            </Link>
            <a
              href={qr.qrImage}
              download={`qr-${qr.shortId}.png`}
              className="text-blue-500 hover:underline text-sm z-10"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
