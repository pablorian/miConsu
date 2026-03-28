'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Professional {
  _id: string;
  name: string;
  color?: string;
}

interface ServiceRecordFormProps {
  patientId: string;
  initialData?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ServiceRecordForm({ patientId, initialData, onClose, onSave }: ServiceRecordFormProps) {
  const t = useTranslations('Dashboard.Patients');
  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [formData, setFormData] = useState({
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    professional: initialData?.professional || '',
    professionalId: initialData?.professionalId || '',
    service: initialData?.service || '',
    price: initialData?.price || 0,
    paid: initialData?.paid || 0,
  });

  // Fetch registered professionals for the selector
  useEffect(() => {
    fetch('/api/professionals')
      .then(r => r.json())
      .then(d => setProfessionals(d.professionals || []))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleProfessionalSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === '') {
      // "Sin profesional" selected
      setFormData(prev => ({ ...prev, professionalId: '', professional: '' }));
    } else if (selectedId === '__manual__') {
      // Let the user type manually — keep professionalId empty
      setFormData(prev => ({ ...prev, professionalId: '' }));
    } else {
      const prof = professionals.find(p => p._id === selectedId);
      if (prof) {
        setFormData(prev => ({ ...prev, professionalId: prof._id, professional: prof.name }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData?._id
        ? `/api/service-records/${initialData._id}`
        : `/api/patients/${patientId}/service-records`;

      const method = initialData?._id ? 'PUT' : 'POST';

      // Send professionalId only if set, otherwise null (to allow clearing)
      const payload = {
        ...formData,
        professionalId: formData.professionalId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // Determine current select value
  const selectValue = formData.professionalId
    ? formData.professionalId
    : formData.professional
      ? '__manual__'
      : '';

  const inputClass = 'w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h3 className="text-lg font-medium">{initialData ? t('editServiceRecord') : t('newServiceRecord')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('date')}</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          {/* Professional selector */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t('professional')}
              <span className="ml-1 text-xs text-muted-foreground/60">(opcional)</span>
            </label>
            {professionals.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={selectValue}
                  onChange={handleProfessionalSelect}
                  className={inputClass}
                >
                  <option value="">Sin profesional</option>
                  {professionals.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                  <option value="__manual__">Otro (ingresar manualmente)</option>
                </select>
                {/* Manual text input shown when "Otro" is selected or no match */}
                {(selectValue === '__manual__' || (!formData.professionalId && formData.professional)) && (
                  <input
                    type="text"
                    name="professional"
                    value={formData.professional}
                    onChange={handleChange}
                    placeholder="Nombre del profesional"
                    className={inputClass + ' text-sm'}
                  />
                )}
              </div>
            ) : (
              // No professionals configured — show plain text input
              <input
                type="text"
                name="professional"
                value={formData.professional}
                onChange={handleChange}
                className={inputClass}
                placeholder="Nombre del profesional"
              />
            )}
          </div>

          {/* Service */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('service')}</label>
            <input
              type="text"
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          {/* Price */}
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
                className={inputClass + ' pl-7'}
              />
            </div>
          </div>

          {/* Paid */}
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
                className={inputClass + ' pl-7'}
              />
            </div>
          </div>
        </div>

        {/* Info banner when professional linked */}
        {formData.professionalId && (
          <div className="flex items-start gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-lg text-xs text-violet-700 dark:text-violet-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Este profesional aparecerá en <strong>Liquidación a profesionales</strong> una vez que el paciente complete el pago de la prestación.</span>
          </div>
        )}

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
