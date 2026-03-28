'use client';

import { useState } from 'react';

interface PathologiesData {
  [key: string]: boolean | string | undefined | Record<string, string>;
}

interface AntecedentesFormProps {
  data: PathologiesData;
  onChange: (field: string, value: boolean | string) => void;
  onCommentChange: (category: string, value: string) => void;
}

interface CategoryConfig {
  key: string;
  label: string;
  commentKey: string;
  items: { key: string; label: string }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'cardiovascular',
    label: 'Aparato Cardiovascular',
    commentKey: 'cardiovascular',
    items: [
      { key: 'arrhythmia', label: 'Arritmia' },
      { key: 'ischemicHeartDisease', label: 'Cardiopatía Isquémica' },
      { key: 'bacterialEndocarditis', label: 'Endocarditis Bacteriana' },
      { key: 'hypertension', label: 'Hipertensión' },
      { key: 'hypotension', label: 'Hipotensión' },
      { key: 'heartFailure', label: 'Insuficiencia Cardíaca' },
      { key: 'pacemaker', label: 'Marcapasos' },
      { key: 'valvulopathies', label: 'Valvulopatías' },
      { key: 'heartProblems', label: 'Otras' },
    ],
  },
  {
    key: 'respiratory',
    label: 'Aparato Respiratorio',
    commentKey: 'respiratory',
    items: [
      { key: 'asthma', label: 'Asma' },
      { key: 'bronchitis', label: 'Bronquitis' },
      { key: 'dyspnea', label: 'Disnea' },
    ],
  },
  {
    key: 'urinary',
    label: 'Aparato Urinario',
    commentKey: 'urinary',
    items: [
      { key: 'dialysis', label: 'Diálisis' },
      { key: 'renalInsufficiency', label: 'Insuficiencia Renal' },
      { key: 'renalTransplant', label: 'Trasplante Renal' },
      { key: 'kidneyProblems', label: 'Otras' },
    ],
  },
  {
    key: 'digestive',
    label: 'Aparato Digestivo y Hepático',
    commentKey: 'digestive',
    items: [
      { key: 'cirrhosis', label: 'Cirrosis' },
      { key: 'gastritis', label: 'Gastritis' },
      { key: 'hematemesis', label: 'Hematemesis' },
      { key: 'hepatitis', label: 'Hepatitis' },
      { key: 'jaundice', label: 'Ictericia' },
      { key: 'hepaticInsufficiency', label: 'Insuficiencia Hepática' },
      { key: 'melena', label: 'Melena' },
      { key: 'ulcers', label: 'Úlceras' },
      { key: 'pyrosis', label: 'Pirosis' },
    ],
  },
  {
    key: 'osteoarticular',
    label: 'Sistema Osteoarticular',
    commentKey: 'osteoarticular',
    items: [
      { key: 'arthritis', label: 'Artritis' },
      { key: 'arthrosis', label: 'Artrosis' },
      { key: 'pain', label: 'Dolor' },
      { key: 'osteoporosis', label: 'Osteoporosis' },
    ],
  },
  {
    key: 'hematologic',
    label: 'Sistema Hematopoyético',
    commentKey: 'hematologic',
    items: [
      { key: 'anemia', label: 'Anemia' },
      { key: 'coagulopathies', label: 'Coagulopatías' },
      { key: 'hemorrhages', label: 'Hemorragias' },
      { key: 'bloodTransfusion', label: 'Transfusiones' },
      { key: 'bloodDisorders', label: 'Otras' },
    ],
  },
  {
    key: 'endocrine',
    label: 'Sistema Endocrino y Metabólico',
    commentKey: 'endocrine',
    items: [
      { key: 'diabetes', label: 'Diabetes' },
      { key: 'hyperthyroidism', label: 'Hipertiroidismo' },
      { key: 'hypothyroidism', label: 'Hipotiroidismo' },
    ],
  },
  {
    key: 'nervous',
    label: 'Sistema Nervioso',
    commentKey: 'nervous',
    items: [
      { key: 'emotionalDisorders', label: 'Alteraciones Emocionales' },
      { key: 'convulsions', label: 'Convulsiones' },
      { key: 'fainting', label: 'Desmayos' },
      { key: 'epilepsy', label: 'Epilepsia' },
    ],
  },
  {
    key: 'allergies',
    label: 'Alergias',
    commentKey: 'allergiesComment',
    items: [
      { key: 'analgesicsAllergy', label: 'Analgésicos' },
      { key: 'anesthesiaAllergy', label: 'Anestesias' },
      { key: 'antibioticsAllergy', label: 'Antibióticos' },
      { key: 'antiInflammatoryAllergy', label: 'Antiinflamatorios' },
      { key: 'allergies', label: 'Otras' },
    ],
  },
  {
    key: 'infectious',
    label: 'Enfermedades Infectocontagiosas',
    commentKey: 'infectious',
    items: [
      { key: 'hiv', label: 'HIV' },
      { key: 'hepatitisB', label: 'Hepatitis' },
      { key: 'syphilis', label: 'Sífilis' },
      { key: 'tuberculosis', label: 'Tuberculosis' },
      { key: 'chagas', label: 'Chagas' },
      { key: 'venerealDiseases', label: 'Otras' },
    ],
  },
  {
    key: 'otherPathologies',
    label: 'Otras Patologías',
    commentKey: 'other',
    items: [
      { key: 'tumors', label: 'Tumores' },
      { key: 'eatingDisorders', label: 'Trastornos Alimenticios' },
      { key: 'rheumaticFever', label: 'Fiebre Reumática' },
      { key: 'chemotherapy', label: 'Quimioterapia' },
      { key: 'radiotherapy', label: 'Radioterapia' },
      { key: 'bruxism', label: 'Bruxismo' },
      { key: 'other', label: 'Otras' },
    ],
  },
  {
    key: 'lifestyle',
    label: 'Estilo de Vida',
    commentKey: 'lifestyle',
    items: [
      { key: 'smokes', label: 'Tabaco' },
      { key: 'drinksAlcohol', label: 'Alcohol' },
      { key: 'drugs', label: 'Drogas' },
      { key: 'tattoos', label: 'Tatuajes' },
    ],
  },
];

export default function AntecedentesForm({ data, onChange, onCommentChange }: AntecedentesFormProps) {
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const categoryComments = (data.categoryComments as Record<string, string>) || {};

  const toggleComment = (key: string) => {
    setOpenComments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-2">
        Seleccioná los antecedentes que aplican al paciente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <div
            key={category.key}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <h4 className="font-semibold text-sm text-foreground mb-3">{category.label}</h4>

            <div className="space-y-2">
              {category.items.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={!!data[item.key]}
                    onChange={(e) => onChange(item.key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Añadir comentario */}
            <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
              {openComments[category.key] || categoryComments[category.commentKey] ? (
                <textarea
                  value={categoryComments[category.commentKey] || ''}
                  onChange={(e) => onCommentChange(category.commentKey, e.target.value)}
                  placeholder="Añadir comentario..."
                  rows={2}
                  className="w-full text-xs p-2 border border-gray-200 dark:border-gray-700 rounded bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleComment(category.key)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  + Añadir comentario
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Observaciones generales */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Observaciones Generales
        </label>
        <textarea
          value={(data.observations as string) || ''}
          onChange={(e) => onChange('observations', e.target.value)}
          rows={3}
          className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}
