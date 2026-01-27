'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Odontogram from '../Odontogram/Odontogram';

interface DentalRecordFormProps {
  patientId: string;
  initialData?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function DentalRecordForm({ patientId, initialData, onClose, onSave }: DentalRecordFormProps) {
  const t = useTranslations('Dashboard.Patients');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    reason: initialData?.reason || '',
    treatment: initialData?.treatment || '',
    diagnosis: initialData?.diagnosis || '',
    observations: initialData?.observations || '',
    hasTartar: initialData?.hasTartar || false,
    hasPeriodontalDisease: initialData?.hasPeriodontalDisease || false,
    odontogram: initialData?.odontogram || []
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData?._id
        ? `/api/records/${initialData._id}`
        : `/api/patients/${patientId}/records`;

      const method = initialData?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSave();
      } else {
        console.error('Error saving record');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h3 className="text-lg font-medium">{initialData ? t('editRecord') : t('newRecord')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('date')}</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
            />
          </div>
          <div className="flex gap-4 items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="hasTartar"
                checked={formData.hasTartar}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium">{t('hasTartar')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="hasPeriodontalDisease"
                checked={formData.hasPeriodontalDisease}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium">{t('hasPeriodontalDisease')}</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('reason')}</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('diagnosis')}</label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              rows={2}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('treatment')}</label>
            <textarea
              name="treatment"
              value={formData.treatment}
              onChange={handleChange}
              rows={2}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-muted-foreground mb-4">{t('odontogram')}</label>
          <Odontogram
            initialData={formData.odontogram}
            onChange={(data) => setFormData(prev => ({ ...prev, odontogram: data }))}
          />
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t('observations')}</label>
          <textarea
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? t('save') + '...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
