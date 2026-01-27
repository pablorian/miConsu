'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import DentalRecordList from './DentalRecord/DentalRecordList';
import DentalRecordForm from './DentalRecord/DentalRecordForm';
import ServiceRecordList from './ServiceRecord/ServiceRecordList';
import ServiceRecordForm from './ServiceRecord/ServiceRecordForm';

interface Patient {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  personalInfo?: {
    dni?: string;
    age?: number;
    birthDate?: string; // string for input date type
    maritalStatus?: string;
    nationality?: string;
    address?: string;
    neighborhood?: string;
    profession?: string;
  };
  medicalCoverage?: {
    plan?: string;
    affiliateNumber?: string;
    holderName?: string;
    holderWorkplace?: string;
  };
  pathologies?: {
    diabetes?: boolean;
    hiv?: boolean;
    allergies?: boolean;
    rheumaticFever?: boolean;
    heartProblems?: boolean;
    pacemaker?: boolean;
    hypertension?: boolean;
    kidneyProblems?: boolean;
    tuberculosis?: boolean;
    chagas?: boolean;
    hepatitis?: boolean;
    venerealDiseases?: boolean;
    gastritis?: boolean;
    eatingDisorders?: boolean;
    bloodDisorders?: boolean;
    bloodTransfusion?: boolean;
    chemotherapy?: boolean;
    radiotherapy?: boolean;
    thyroid?: boolean;
    other?: boolean;
    smokes?: boolean;
    drinksAlcohol?: boolean;
    bruxism?: boolean;
    observations?: string;
  };
  odontogram?: any[];
}

interface PatientFormProps {
  initialData?: any; // strict typing difficult with loose recursive types, matching standard Patient interface roughly
}

export default function PatientForm({ initialData }: PatientFormProps) {
  const t = useTranslations('Dashboard.Patients');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'contact' | 'personal' | 'medical' | 'pathologies' | 'odontogram' | 'registry'>('contact');
  const [editingRecord, setEditingRecord] = useState<any | 'new' | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingServiceRecord, setEditingServiceRecord] = useState<any | 'new' | undefined>(undefined);
  const [refreshServiceTrigger, setRefreshServiceTrigger] = useState(0);

  const [formData, setFormData] = useState<Patient>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    personalInfo: {
      dni: initialData?.personalInfo?.dni || '',
      age: initialData?.personalInfo?.age || '',
      birthDate: initialData?.personalInfo?.birthDate ? new Date(initialData.personalInfo.birthDate).toISOString().split('T')[0] : '',
      maritalStatus: initialData?.personalInfo?.maritalStatus || '',
      nationality: initialData?.personalInfo?.nationality || '',
      address: initialData?.personalInfo?.address || '',
      neighborhood: initialData?.personalInfo?.neighborhood || '',
      profession: initialData?.personalInfo?.profession || '',
    },
    medicalCoverage: {
      plan: initialData?.medicalCoverage?.plan || '',
      affiliateNumber: initialData?.medicalCoverage?.affiliateNumber || '',
      holderName: initialData?.medicalCoverage?.holderName || '',
      holderWorkplace: initialData?.medicalCoverage?.holderWorkplace || '',
    },
    pathologies: {
      diabetes: initialData?.pathologies?.diabetes || false,
      hiv: initialData?.pathologies?.hiv || false,
      allergies: initialData?.pathologies?.allergies || false,
      rheumaticFever: initialData?.pathologies?.rheumaticFever || false,
      heartProblems: initialData?.pathologies?.heartProblems || false,
      pacemaker: initialData?.pathologies?.pacemaker || false,
      hypertension: initialData?.pathologies?.hypertension || false,
      kidneyProblems: initialData?.pathologies?.kidneyProblems || false,
      tuberculosis: initialData?.pathologies?.tuberculosis || false,
      chagas: initialData?.pathologies?.chagas || false,
      hepatitis: initialData?.pathologies?.hepatitis || false,
      venerealDiseases: initialData?.pathologies?.venerealDiseases || false,
      gastritis: initialData?.pathologies?.gastritis || false,
      eatingDisorders: initialData?.pathologies?.eatingDisorders || false,
      bloodDisorders: initialData?.pathologies?.bloodDisorders || false,
      bloodTransfusion: initialData?.pathologies?.bloodTransfusion || false,
      chemotherapy: initialData?.pathologies?.chemotherapy || false,
      radiotherapy: initialData?.pathologies?.radiotherapy || false,
      thyroid: initialData?.pathologies?.thyroid || false,
      other: initialData?.pathologies?.other || false,
      smokes: initialData?.pathologies?.smokes || false,
      drinksAlcohol: initialData?.pathologies?.drinksAlcohol || false,
      bruxism: initialData?.pathologies?.bruxism || false,
      observations: initialData?.pathologies?.observations || '',
    },
    odontogram: initialData?.odontogram || []
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNestedChange = (section: keyof Patient, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section] as any,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = initialData?._id
        ? `/api/patients/${initialData._id}`
        : '/api/patients';
      const method = initialData?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      router.push('/dashboard/patients');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'contact', label: t('title') },
    { id: 'personal', label: t('personalInfo') },
    { id: 'medical', label: t('medicalCoverage') },
    { id: 'pathologies', label: t('pathologies') },
    { id: 'odontogram', label: t('clinicalRecords') },
    { id: 'registry', label: t('registry') },
  ];

  return (
    <div className="max-w-4xl bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* CONTACT INFO */}
        <div className={activeTab === 'contact' ? 'block' : 'hidden'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('email')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('phone')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* PERSONAL INFO */}
        <div className={activeTab === 'personal' ? 'block' : 'hidden'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('dni')}</label>
              <input
                type="text"
                value={formData.personalInfo?.dni || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'dni', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('age')}</label>
              <input
                type="number"
                value={formData.personalInfo?.age || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'age', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('birthDate')}</label>
              <input
                type="date"
                value={formData.personalInfo?.birthDate || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'birthDate', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('maritalStatus')}</label>
              <input
                type="text"
                value={formData.personalInfo?.maritalStatus || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'maritalStatus', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('nationality')}</label>
              <input
                type="text"
                value={formData.personalInfo?.nationality || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'nationality', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('profession')}</label>
              <input
                type="text"
                value={formData.personalInfo?.profession || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'profession', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('address')}</label>
              <input
                type="text"
                value={formData.personalInfo?.address || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'address', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('neighborhood')}</label>
              <input
                type="text"
                value={formData.personalInfo?.neighborhood || ''}
                onChange={(e) => handleNestedChange('personalInfo', 'neighborhood', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* MEDICAL COVERAGE */}
        <div className={activeTab === 'medical' ? 'block' : 'hidden'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('plan')}</label>
              <input
                type="text"
                value={formData.medicalCoverage?.plan || ''}
                onChange={(e) => handleNestedChange('medicalCoverage', 'plan', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('affiliateNumber')}</label>
              <input
                type="text"
                value={formData.medicalCoverage?.affiliateNumber || ''}
                onChange={(e) => handleNestedChange('medicalCoverage', 'affiliateNumber', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('holderName')}</label>
              <input
                type="text"
                value={formData.medicalCoverage?.holderName || ''}
                onChange={(e) => handleNestedChange('medicalCoverage', 'holderName', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('holderWorkplace')}</label>
              <input
                type="text"
                value={formData.medicalCoverage?.holderWorkplace || ''}
                onChange={(e) => handleNestedChange('medicalCoverage', 'holderWorkplace', e.target.value)}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* PATHOLOGIES */}
        <div className={activeTab === 'pathologies' ? 'block' : 'hidden'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {Object.keys(formData.pathologies || {}).map((key) => {
              if (key === 'observations') return null;
              return (
                <label key={key} className="flex items-center gap-2 cursor-pointer p-2 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={(formData.pathologies as any)[key] || false}
                    onChange={(e) => handleNestedChange('pathologies', key, e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-foreground">{t(key)}</span>
                </label>
              );
            })}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('observations')}</label>
            <textarea
              value={formData.pathologies?.observations || ''}
              onChange={(e) => handleNestedChange('pathologies', 'observations', e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>



        {/* ODONTOGRAM */}
        {/* RECORDS (FICHAS) */}
        <div className={activeTab === 'odontogram' ? 'block' : 'hidden'}>
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

        {/* SERVICE REGISTRY */}
        <div className={activeTab === 'registry' ? 'block' : 'hidden'}>
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

        <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? t('save') + '...' : t('save')}
          </button>
        </div>
      </form >
    </div >
  );
}
