'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Patient {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PatientListProps {
  patients: Patient[];
}

export default function PatientList({ patients }: PatientListProps) {
  const t = useTranslations('Dashboard.Patients');
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigation to details
    e.stopPropagation();

    if (!confirm(t('confirmDelete'))) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Error deleting patient');
    } finally {
      setDeletingId(null);
    }
  };

  if (patients.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        {t('searchPlaceholder')}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {patients.map((patient) => (
        <Link
          href={`/dashboard/patients/${patient._id}`}
          key={patient._id}
          className="group relative block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary transition-colors duration-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-foreground">{patient.name}</h3>
              {patient.email && (
                <p className="text-sm text-muted-foreground">{patient.email}</p>
              )}
              {patient.phone && (
                <p className="text-sm text-muted-foreground">{patient.phone}</p>
              )}
            </div>
          </div>

          {/* Delete button that appears on hover */}
          <button
            onClick={(e) => handleDelete(e, patient._id)}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 z-10"
            title={t('delete')}
            disabled={deletingId === patient._id}
          >
            {deletingId === patient._id ? (
              <span className="block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            )}
          </button>
        </Link>
      ))}
    </div>
  );
}
