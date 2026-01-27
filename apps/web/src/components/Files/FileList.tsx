'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

interface FileListProps {
  patientId: string;
}

export default function FileList({ patientId }: FileListProps) {
  const t = useTranslations('Dashboard.Patients');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [patientId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${patientId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to fetch files', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        fetchFiles();
      } else {
        const data = await res.json();
        if (res.status === 401 && data.error.includes('Google Auth')) {
          setError(t('connectGoogleDrive'));
        } else {
          setError(data.error || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Upload error', error);
      setError('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteFileConfirm'))) return;

    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f._id !== id));
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  const getIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    return '📁';
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{t('files')}</h3>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
            ) : (
              <span>☁️</span>
            )}
            {uploading ? t('uploading') : t('uploadFile')}
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          {error === t('connectGoogleDrive') && (
            <a href="/api/auth/google-calendar/connect" className="underline font-bold">Connect</a>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground">
          {t('noFiles')}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {files.map(file => (
            <div key={file._id} className="group relative p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition flex items-start gap-3">
              <div className="text-2xl pt-1">{getIcon(file.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="font-medium text-sm truncate block hover:underline text-primary">
                  {file.name}
                </a>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(file.createdAt), 'dd/MM/yyyy')}
                </div>
              </div>
              <button
                onClick={() => handleDelete(file._id)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-2"
                title={t('delete')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
