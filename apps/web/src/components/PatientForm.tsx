'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DentalRecordList from './DentalRecord/DentalRecordList';
import DentalRecordForm from './DentalRecord/DentalRecordForm';
import ServiceRecordList from './ServiceRecord/ServiceRecordList';
import ServiceRecordForm from './ServiceRecord/ServiceRecordForm';
import FileList from './Files/FileList';
import AntecedentesForm from './Patient/AntecedentesForm';
import TreatmentPlanList from './TreatmentPlan/TreatmentPlanList';
import TreatmentPlanForm from './TreatmentPlan/TreatmentPlanForm';
import PatientAppointmentList from './Patient/PatientAppointmentList';
import Periodontogram from './Periodontogram/Periodontogram';
import PatientWallet from './Patient/PatientWallet';

interface Patient {
  _id?: string;
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  personalInfo?: {
    dni?: string;
    sex?: string;
    age?: number;
    birthDate?: string;
    maritalStatus?: string;
    nationality?: string;
    address?: string;
    neighborhood?: string;
    profession?: string;
  };
  medicalCoverage?: {
    name?: string;
    plan?: string;
    affiliateNumber?: string;
    holderName?: string;
    holderWorkplace?: string;
  };
  pathologies?: Record<string, any>;
  odontogram?: any[];
  periodontogram?: Record<string, any>;
}

interface PatientFormProps {
  initialData?: any;
}

type TabId = 'info' | 'antecedentes' | 'evolucion' | 'odontogram' | 'tratamientos' | 'periodontogram' | 'files' | 'turnos' | 'billetera';

const TABS: { id: TabId; label: string }[] = [
  { id: 'info', label: 'Información' },
  { id: 'antecedentes', label: 'Antecedentes' },
  { id: 'evolucion', label: 'Evolución' },
  { id: 'odontogram', label: 'Odontograma' },
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'periodontogram', label: 'Periodontograma' },
  { id: 'files', label: 'Archivos' },
  { id: 'turnos', label: 'Turnos' },
  { id: 'billetera', label: 'Billetera' },
];

export default function PatientForm({ initialData }: PatientFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [obrasSociales, setObrasSociales] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/obras-sociales')
      .then(r => r.json())
      .then(d => setObrasSociales((d.items || []).map((i: any) => i.name)))
      .catch(() => {});
  }, []);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabId[] = ['info', 'antecedentes', 'evolucion', 'odontogram', 'tratamientos', 'periodontogram', 'files', 'turnos', 'billetera'];
    return (validTabs.includes(tabParam as TabId) ? tabParam : 'info') as TabId;
  });

  // Sub-form states
  const [editingRecord, setEditingRecord] = useState<any>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingServiceRecord, setEditingServiceRecord] = useState<any>(undefined);
  const [refreshServiceTrigger, setRefreshServiceTrigger] = useState(0);
  const [editingTreatmentPlan, setEditingTreatmentPlan] = useState<any>(undefined);
  const [refreshTreatmentTrigger, setRefreshTreatmentTrigger] = useState(0);

  const [formData, setFormData] = useState<Patient>({
    name: initialData?.name || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    personalInfo: {
      dni: initialData?.personalInfo?.dni || '',
      sex: initialData?.personalInfo?.sex || '',
      age: initialData?.personalInfo?.age || '',
      birthDate: initialData?.personalInfo?.birthDate
        ? new Date(initialData.personalInfo.birthDate).toISOString().split('T')[0]
        : '',
      maritalStatus: initialData?.personalInfo?.maritalStatus || '',
      nationality: initialData?.personalInfo?.nationality || '',
      address: initialData?.personalInfo?.address || '',
      neighborhood: initialData?.personalInfo?.neighborhood || '',
      profession: initialData?.personalInfo?.profession || '',
    },
    medicalCoverage: {
      name: initialData?.medicalCoverage?.name || '',
      plan: initialData?.medicalCoverage?.plan || '',
      affiliateNumber: initialData?.medicalCoverage?.affiliateNumber || '',
      holderName: initialData?.medicalCoverage?.holderName || '',
      holderWorkplace: initialData?.medicalCoverage?.holderWorkplace || '',
    },
    pathologies: initialData?.pathologies || {},
    odontogram: initialData?.odontogram || [],
    periodontogram: initialData?.periodontogram || {},
  });

  const handleChange = (field: keyof Patient, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section: 'personalInfo' | 'medicalCoverage', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as any), [field]: value },
    }));
  };

  const handlePathologyChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      pathologies: { ...(prev.pathologies || {}), [field]: value },
    }));
  };

  const handleCategoryCommentChange = (category: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pathologies: {
        ...(prev.pathologies || {}),
        categoryComments: {
          ...((prev.pathologies?.categoryComments as Record<string, string>) || {}),
          [category]: value,
        },
      },
    }));
  };

  const handlePeriodontogramChange = (data: Record<string, any>) => {
    setFormData(prev => ({ ...prev, periodontogram: data }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const url = initialData?._id ? `/api/patients/${initialData._id}` : '/api/patients';
      const method = initialData?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      if (!initialData?._id && data._id) {
        router.replace(`/dashboard/patients/${data._id}`);
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm";
  const labelClass = "block text-sm font-medium text-muted-foreground mb-1";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
            ✓ Cambios guardados correctamente
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ==================== INFORMACIÓN ==================== */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Datos Personales */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Datos Personales</h4>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Apellido</label>
                      <input type="text" value={formData.lastName || ''} onChange={(e) => handleChange('lastName', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>DNI / Documento</label>
                      <input type="text" value={formData.personalInfo?.dni || ''} onChange={(e) => handleNestedChange('personalInfo', 'dni', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha de Nacimiento</label>
                      <input type="date" value={formData.personalInfo?.birthDate || ''} onChange={(e) => handleNestedChange('personalInfo', 'birthDate', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Sexo</label>
                      <select value={formData.personalInfo?.sex || ''} onChange={(e) => handleNestedChange('personalInfo', 'sex', e.target.value)} className={inputClass + ' bg-white dark:bg-zinc-900'}>
                        <option value="">Seleccionar</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Contacto</h4>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Teléfono</label>
                      <input type="tel" value={formData.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className={inputClass} placeholder="Ej: 3518119413" />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Dirección</label>
                      <input type="text" value={formData.personalInfo?.address || ''} onChange={(e) => handleNestedChange('personalInfo', 'address', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Barrio</label>
                      <input type="text" value={formData.personalInfo?.neighborhood || ''} onChange={(e) => handleNestedChange('personalInfo', 'neighborhood', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Obra Social */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Obra Social</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Nombre</label>
                    <input
                      type="text"
                      list="obras-sociales-list"
                      value={formData.medicalCoverage?.name || ''}
                      onChange={(e) => handleNestedChange('medicalCoverage', 'name', e.target.value)}
                      className={inputClass}
                      placeholder="Particular, OSDE, Swiss Medical…"
                      autoComplete="off"
                    />
                    <datalist id="obras-sociales-list">
                      {obrasSociales.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>Plan</label>
                    <input type="text" value={formData.medicalCoverage?.plan || ''} onChange={(e) => handleNestedChange('medicalCoverage', 'plan', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Número de Afiliado</label>
                    <input type="text" value={formData.medicalCoverage?.affiliateNumber || ''} onChange={(e) => handleNestedChange('medicalCoverage', 'affiliateNumber', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Titular</label>
                    <input type="text" value={formData.medicalCoverage?.holderName || ''} onChange={(e) => handleNestedChange('medicalCoverage', 'holderName', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Lugar de Trabajo del Titular</label>
                    <input type="text" value={formData.medicalCoverage?.holderWorkplace || ''} onChange={(e) => handleNestedChange('medicalCoverage', 'holderWorkplace', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          )}

          {/* ==================== ANTECEDENTES ==================== */}
          {activeTab === 'antecedentes' && (
            <div>
              <AntecedentesForm
                data={formData.pathologies || {}}
                onChange={handlePathologyChange}
                onCommentChange={handleCategoryCommentChange}
              />
              <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* ==================== EVOLUCIÓN ==================== */}
          {activeTab === 'evolucion' && (
            <div>
              {editingServiceRecord !== undefined ? (
                <ServiceRecordForm
                  patientId={initialData?._id}
                  initialData={editingServiceRecord === 'new' ? undefined : editingServiceRecord}
                  onClose={() => setEditingServiceRecord(undefined)}
                  onSave={() => {
                    setEditingServiceRecord(undefined);
                    setRefreshServiceTrigger(prev => prev + 1);
                  }}
                />
              ) : (
                <ServiceRecordList
                  patientId={initialData?._id}
                  onEdit={(record) => setEditingServiceRecord(record)}
                  onNew={() => setEditingServiceRecord('new')}
                  refreshTrigger={refreshServiceTrigger}
                />
              )}
            </div>
          )}

          {/* ==================== ODONTOGRAMA ==================== */}
          {activeTab === 'odontogram' && (
            <div>
              {editingRecord !== undefined ? (
                <DentalRecordForm
                  patientId={initialData?._id}
                  initialData={editingRecord === 'new' ? undefined : editingRecord}
                  onClose={() => setEditingRecord(undefined)}
                  onSave={() => {
                    setEditingRecord(undefined);
                    setRefreshTrigger(prev => prev + 1);
                  }}
                />
              ) : (
                <DentalRecordList
                  patientId={initialData?._id}
                  onEdit={(record) => setEditingRecord(record)}
                  onNew={() => setEditingRecord('new')}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>
          )}

          {/* ==================== TRATAMIENTOS ==================== */}
          {activeTab === 'tratamientos' && (
            <div>
              {initialData?._id ? (
                editingTreatmentPlan !== undefined ? (
                  <TreatmentPlanForm
                    patientId={initialData._id}
                    initialData={editingTreatmentPlan === 'new' ? undefined : editingTreatmentPlan}
                    onClose={() => setEditingTreatmentPlan(undefined)}
                    onSave={() => {
                      setEditingTreatmentPlan(undefined);
                      setRefreshTreatmentTrigger(prev => prev + 1);
                    }}
                  />
                ) : (
                  <TreatmentPlanList
                    patientId={initialData._id}
                    onEdit={(plan) => setEditingTreatmentPlan(plan)}
                    onNew={() => setEditingTreatmentPlan('new')}
                    refreshTrigger={refreshTreatmentTrigger}
                  />
                )
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Guardá el paciente primero para agregar planes de tratamiento.
                </div>
              )}
            </div>
          )}

          {/* ==================== PERIODONTOGRAMA ==================== */}
          {activeTab === 'periodontogram' && (
            <div>
              <Periodontogram
                initialData={formData.periodontogram}
                onChange={handlePeriodontogramChange}
              />
              <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Guardar Periodontograma'}
                </button>
              </div>
            </div>
          )}

          {/* ==================== ARCHIVOS ==================== */}
          {activeTab === 'files' && (
            <FileList patientId={initialData?._id} />
          )}

          {/* ==================== TURNOS ==================== */}
          {activeTab === 'turnos' && (
            <div>
              {initialData?._id ? (
                <PatientAppointmentList patientId={initialData._id} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Guardá el paciente primero para ver sus turnos.
                </div>
              )}
            </div>
          )}

        </form>

        {/* ==================== BILLETERA ==================== */}
        {/* Fuera del <form> para evitar formularios anidados (HTML no permite forms dentro de forms) */}
        {activeTab === 'billetera' && (
          <div>
            {initialData?._id ? (
              <PatientWallet patientId={initialData._id} />
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                Guardá el paciente primero para ver su billetera.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
