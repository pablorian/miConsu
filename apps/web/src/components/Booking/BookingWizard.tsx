'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingWizardProps {
  userId: string;
  userPublicId: string;
  calendarId: string;
  calendarSlug: string;
  userTimezone?: string;
}

export default function BookingWizard({ userId, userPublicId, calendarId, calendarSlug, userTimezone }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    reason: 'Primera Consulta'
  });

  // Step 1: Fetch Slots when date changes
  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setAvailableSlots([]);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/booking/slots?userPublicId=${userPublicId}&calendarSlug=${calendarSlug}&date=${formattedDate}`);

      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        if (data.slots && data.slots.length === 0) {
          console.log("No slots returned");
        }
      } else {
        console.error("Failed to fetch slots");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Refactor needed: The component props don't match API needs perfectly.
  // I'll assume for this draft I have them.
  // But wait, I can just Fix the Page to pass them.

  return (
    <div className="min-h-[400px]">
      {/* Progress Bar */}
      <div className="flex items-center justify-center mb-8 space-x-4">
        <div className={`h-2 w-1/3 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`h-2 w-1/3 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`h-2 w-1/3 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">1. Selecciona un Horario</h2>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Simple Date Picker (Native for MVP) */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(e.target.valueAsDate || new Date())}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Slots Grid */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Horarios Disponibles</label>
              {loadingSlots ? (
                <div className="animate-pulse text-sm text-gray-500">Buscando horarios...</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.length > 0 ? availableSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 text-sm rounded border ${selectedSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:border-blue-400'}`}
                    >
                      {slot}
                    </button>
                  )) : (
                    <p className="text-sm text-gray-500 col-span-3">No hay horarios disponibles para esta fecha.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedSlot}
              className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">2. Completa tus Datos</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre Completo *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Motivo *</label>
              <select
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full p-2 border rounded mt-1"
              >
                <option>Primera Consulta</option>
                <option>Implante</option>
                <option>Otros</option>
              </select>
            </div>
          </div>
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(1)} className="text-gray-600 hover:underline">Atrás</button>
            <button
              onClick={() => setStep(3)}
              disabled={!formData.fullName || !formData.phone}
              className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">3. Confirmar Reserva</h2>

          <div className="bg-gray-50 p-4 rounded-lg border space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-medium">{format(selectedDate, 'EEEE d MMMM, yyyy', { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hora:</span>
              <span className="font-medium">{selectedSlot}</span>
            </div>
            <div className="border-t pt-2"></div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paciente:</span>
              <span className="font-medium">{formData.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono:</span>
              <span className="font-medium">{formData.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Motivo:</span>
              <span className="font-medium">{formData.reason}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setStep(2)} className="text-gray-600 hover:underline">Atrás</button>
            <button
              // Call Create API
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
