'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

interface DentalRecordListProps {
  patientId: string;
  onEdit: (record: any) => void;
  onNew: () => void;
  refreshTrigger: number;
}

export default function DentalRecordList({ patientId, onEdit, onNew, refreshTrigger }: DentalRecordListProps) {
  const t = useTranslations('Dashboard.Patients');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [patientId, refreshTrigger]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${patientId}/records`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
      }
    } catch (error) {
      console.error('Failed to fetch records', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteRecord'))) return;

    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRecords();
      }
    } catch (error) {
      console.error('Failed to delete', error);
    }
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">{t('loading')}...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{t('clinicalRecords')}</h3>
        <button
          onClick={onNew}
          type="button"
          className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition"
        >
          {t('newRecord')}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground">
          {t('noRecords')}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('date')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('reason')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('diagnosis')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">{format(new Date(record.date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">{record.reason || '-'}</td>
                  <td className="px-4 py-3">{record.diagnosis || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="text-primary hover:underline"
                    >
                      {t('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(record._id)}
                      className="text-red-500 hover:underline"
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
