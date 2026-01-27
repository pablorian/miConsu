'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ServiceRecordFormProps {
  patientId: string;
  initialData?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ServiceRecordForm({ patientId, initialData, onClose, onSave }: ServiceRecordFormProps) {
  const t = useTranslations('Dashboard.Patients');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    professional: initialData?.professional || '',
    service: initialData?.service || '',
    price: initialData?.price || 0,
    paid: initialData?.paid || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Just in case, though we are using onClick handler
    setLoading(true);

    try {
      const url = initialData?._id
        ? `/api/service-records/${initialData._id}`
        : `/api/patients/${patientId}/service-records`;

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
        <h3 className="text-lg font-medium">{initialData ? t('editServiceRecord') : t('newServiceRecord')}</h3>
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
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('professional')}</label>
            <input
              type="text"
              name="professional"
              value={formData.professional}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('service')}</label>
            <input
              type="text"
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('price')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full p-2 pl-7 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('paid')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
              <input
                type="number"
                name="paid"
                value={formData.paid}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full p-2 pl-7 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground"
              />
            </div>
          </div>
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
