'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ServiceRecord {
  _id: string;
  date: string;
  service: string;
  professional?: string;
  price: number;
  paid: number;
}

interface Payment {
  _id: string;
  date: string;
  amount: number;
  concept?: string;
  paymentMethod: string;
  currency: string;
}

type MovimientoType = 'servicio' | 'pago' | 'pago_prestacion';

interface Movimiento {
  _id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: MovimientoType;
  detail?: string;
  isPaid?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta_debito: 'Tarjeta Débito',
  tarjeta_credito: 'Tarjeta Crédito',
  otro: 'Otro',
};

// ─── Modal Nuevo Pago ────────────────────────────────────────────────────────

interface NuevoPagoModalProps {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

function NuevoPagoModal({ patientId, onClose, onSaved }: NuevoPagoModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    concept: '',
    paymentMethod: 'efectivo',
    currency: 'ARS',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';
  const labelClass = 'block text-sm font-medium text-muted-foreground mb-1';

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-foreground">Agregar Pago a Billetera</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingresá un pago general a la cuenta del paciente.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
          )}

          <div>
            <label className={labelClass}>Fecha de pago</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Monto <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Detalle / Concepto</label>
            <input
              type="text"
              value={form.concept}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
              placeholder="Lo entrego a cuenta"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Método de pago</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className={inputClass + ' bg-white dark:bg-zinc-900'}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Moneda</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className={inputClass + ' bg-white dark:bg-zinc-900'}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface PatientWalletProps {
  patientId: string;
}

export default function PatientWallet({ patientId }: PatientWalletProps) {
  const router = useRouter();
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [showPayments, setShowPayments] = useState(true);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [srRes, payRes] = await Promise.all([
        fetch(`/api/patients/${patientId}/service-records`),
        fetch(`/api/patients/${patientId}/payments`),
      ]);
      if (srRes.ok) {
        const data = await srRes.json();
        setServiceRecords(data.records || []);
      }
      if (payRes.ok) {
        const data = await payRes.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error loading wallet data', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Construir movimientos
  const movimientos: Movimiento[] = [];

  serviceRecords.forEach((sr) => {
    const balance = (sr.price || 0) - (sr.paid || 0);
    const isPaid = balance <= 0;
    if (!isPaid || showPaid) {
      // Fila del servicio: muestra el precio total como cargo
      movimientos.push({
        _id: sr._id,
        date: sr.date,
        description: sr.service,
        amount: -(sr.price || 0),
        currency: 'ARS',
        type: 'servicio',
        detail: sr.professional || '',
        isPaid,
      });
      // Si se abonó algo en la prestación, agregar fila del abono parcial
      if ((sr.paid || 0) > 0) {
        movimientos.push({
          _id: `${sr._id}-abono`,
          date: sr.date,
          description: `Abono en prestación`,
          amount: sr.paid,
          currency: 'ARS',
          type: 'pago_prestacion',
          detail: sr.service,
        });
      }
    }
  });

  if (showPayments) {
    payments.forEach((p) => {
      movimientos.push({
        _id: p._id,
        date: p.date,
        description: p.concept || 'Pago',
        amount: p.amount, // positivo = abono
        currency: p.currency,
        type: 'pago',
      });
    });
  }

  // Ordenar por fecha desc
  movimientos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calcular saldo
  const totalDebt = serviceRecords.reduce((acc, sr) => acc + ((sr.price || 0) - (sr.paid || 0)), 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const saldo = totalDebt - totalPaid;

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      await fetch(`/api/patients/${patientId}/payments/${paymentId}`, { method: 'DELETE' });
      fetchData();
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (!patientId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Guardá el paciente primero para ver la billetera.
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Billetera del Paciente
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gestioná los pagos y el saldo del paciente.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition"
        >
          <span className="text-base leading-none">+</span> Nuevo Pago
        </button>
      </div>

      {/* Saldo */}
      <div className={`inline-flex flex-col px-5 py-3 rounded-xl border ${saldo > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'}`}>
        <span className="text-xs font-medium text-muted-foreground">
          {saldo > 0 ? 'Deuda en Pesos' : 'Saldo a Favor'}
        </span>
        <span className={`text-2xl font-bold mt-0.5 ${saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {saldo > 0 ? '-' : '+'} ${Math.abs(saldo).toFixed(2)}
        </span>
      </div>

      {/* Movimientos */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Toolbar de filtros */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-foreground">Movimientos</span>
          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
              <div
                onClick={() => setShowPaid(!showPaid)}
                className={`w-8 h-4 rounded-full transition-colors relative ${showPaid ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${showPaid ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              Mostrar Servicios Pagados
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
              <div
                onClick={() => setShowPayments(!showPayments)}
                className={`w-8 h-4 rounded-full transition-colors relative ${showPayments ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${showPayments ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              Mostrar Pagos/Abonos
            </label>
          </div>
        </div>

        {movimientos.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No hay movimientos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Detalles</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {movimientos.map((mov) => (
                  <tr key={`${mov.type}-${mov._id}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(mov.date), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-foreground">{mov.description}</td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${mov.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {mov.amount < 0 ? '-' : '+'} {Math.abs(mov.amount).toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{mov.currency}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        mov.type === 'pago'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : mov.type === 'pago_prestacion'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : mov.isPaid
                          ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {mov.type === 'pago' ? 'Pago' : mov.type === 'pago_prestacion' ? 'Abono' : 'Servicio'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{mov.detail || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {mov.type === 'pago' && (
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(mov._id)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totales */}
              <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800/50">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-sm font-semibold text-foreground">Totales</td>
                  <td className={`px-4 py-2 text-right text-sm font-bold ${saldo > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {saldo > 0 ? '-' : '+'} {Math.abs(saldo).toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">ARS</span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NuevoPagoModal
          patientId={patientId}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchData();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
