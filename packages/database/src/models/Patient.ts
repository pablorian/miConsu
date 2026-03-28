import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  personalInfo?: {
    dni?: string;
    sex?: string;
    age?: number;
    birthDate?: Date;
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
  pathologies?: {
    // Aparato Cardiovascular
    arrhythmia?: boolean;
    ischemicHeartDisease?: boolean;
    bacterialEndocarditis?: boolean;
    hypertension?: boolean;
    hypotension?: boolean;
    heartFailure?: boolean;
    pacemaker?: boolean;
    valvulopathies?: boolean;
    heartProblems?: boolean;
    // Aparato Respiratorio
    asthma?: boolean;
    bronchitis?: boolean;
    dyspnea?: boolean;
    // Aparato Urinario
    dialysis?: boolean;
    renalInsufficiency?: boolean;
    renalTransplant?: boolean;
    kidneyProblems?: boolean;
    // Aparato Digestivo y Hepático
    cirrhosis?: boolean;
    gastritis?: boolean;
    hematemesis?: boolean;
    hepatitis?: boolean;
    jaundice?: boolean;
    hepaticInsufficiency?: boolean;
    melena?: boolean;
    pyrosis?: boolean;
    ulcers?: boolean;
    // Sistema Osteoarticular
    arthritis?: boolean;
    arthrosis?: boolean;
    pain?: boolean;
    osteoporosis?: boolean;
    // Sistema Hematopoyético
    anemia?: boolean;
    coagulopathies?: boolean;
    hemorrhages?: boolean;
    bloodTransfusion?: boolean;
    bloodDisorders?: boolean;
    // Sistema Endocrino y Metabólico
    diabetes?: boolean;
    hyperthyroidism?: boolean;
    hypothyroidism?: boolean;
    thyroid?: boolean;
    // Sistema Nervioso
    emotionalDisorders?: boolean;
    convulsions?: boolean;
    fainting?: boolean;
    epilepsy?: boolean;
    // Alergias
    allergies?: boolean;
    analgesicsAllergy?: boolean;
    anesthesiaAllergy?: boolean;
    antibioticsAllergy?: boolean;
    antiInflammatoryAllergy?: boolean;
    // Enfermedades Infectocontagiosas
    hiv?: boolean;
    hepatitisB?: boolean;
    syphilis?: boolean;
    tuberculosis?: boolean;
    chagas?: boolean;
    venerealDiseases?: boolean;
    // Otras Patologías
    tumors?: boolean;
    eatingDisorders?: boolean;
    rheumaticFever?: boolean;
    chemotherapy?: boolean;
    radiotherapy?: boolean;
    other?: boolean;
    // Estilo de Vida
    smokes?: boolean;
    drinksAlcohol?: boolean;
    drugs?: boolean;
    tattoos?: boolean;
    bruxism?: boolean;
    // Comentarios por categoría
    categoryComments?: {
      cardiovascular?: string;
      respiratory?: string;
      urinary?: string;
      digestive?: string;
      osteoarticular?: string;
      hematologic?: string;
      endocrine?: string;
      nervous?: string;
      allergiesComment?: string;
      infectious?: string;
      other?: string;
      lifestyle?: string;
    };
    observations?: string;
  };
  odontogram?: {
    toothNumber: number;
    status: string;
    surfaces?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
      center?: string;
    };
    notes?: string;
  }[];
  periodontogram?: Record<string, any>;
}

const PatientSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, sparse: true, trim: true, lowercase: true },
  phone: { type: String, sparse: true, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  personalInfo: {
    dni: String,
    sex: String,
    age: Number,
    birthDate: Date,
    maritalStatus: String,
    nationality: String,
    address: String,
    neighborhood: String,
    profession: String
  },

  medicalCoverage: {
    name: String,
    plan: String,
    affiliateNumber: String,
    holderName: String,
    holderWorkplace: String
  },

  pathologies: {
    // Cardiovascular
    arrhythmia: { type: Boolean, default: false },
    ischemicHeartDisease: { type: Boolean, default: false },
    bacterialEndocarditis: { type: Boolean, default: false },
    hypertension: { type: Boolean, default: false },
    hypotension: { type: Boolean, default: false },
    heartFailure: { type: Boolean, default: false },
    pacemaker: { type: Boolean, default: false },
    valvulopathies: { type: Boolean, default: false },
    heartProblems: { type: Boolean, default: false },
    // Respiratory
    asthma: { type: Boolean, default: false },
    bronchitis: { type: Boolean, default: false },
    dyspnea: { type: Boolean, default: false },
    // Urinary
    dialysis: { type: Boolean, default: false },
    renalInsufficiency: { type: Boolean, default: false },
    renalTransplant: { type: Boolean, default: false },
    kidneyProblems: { type: Boolean, default: false },
    // Digestive
    cirrhosis: { type: Boolean, default: false },
    gastritis: { type: Boolean, default: false },
    hematemesis: { type: Boolean, default: false },
    hepatitis: { type: Boolean, default: false },
    jaundice: { type: Boolean, default: false },
    hepaticInsufficiency: { type: Boolean, default: false },
    melena: { type: Boolean, default: false },
    pyrosis: { type: Boolean, default: false },
    ulcers: { type: Boolean, default: false },
    // Osteoarticular
    arthritis: { type: Boolean, default: false },
    arthrosis: { type: Boolean, default: false },
    pain: { type: Boolean, default: false },
    osteoporosis: { type: Boolean, default: false },
    // Hematologic
    anemia: { type: Boolean, default: false },
    coagulopathies: { type: Boolean, default: false },
    hemorrhages: { type: Boolean, default: false },
    bloodTransfusion: { type: Boolean, default: false },
    bloodDisorders: { type: Boolean, default: false },
    // Endocrine
    diabetes: { type: Boolean, default: false },
    hyperthyroidism: { type: Boolean, default: false },
    hypothyroidism: { type: Boolean, default: false },
    thyroid: { type: Boolean, default: false },
    // Nervous
    emotionalDisorders: { type: Boolean, default: false },
    convulsions: { type: Boolean, default: false },
    fainting: { type: Boolean, default: false },
    epilepsy: { type: Boolean, default: false },
    // Allergies
    allergies: { type: Boolean, default: false },
    analgesicsAllergy: { type: Boolean, default: false },
    anesthesiaAllergy: { type: Boolean, default: false },
    antibioticsAllergy: { type: Boolean, default: false },
    antiInflammatoryAllergy: { type: Boolean, default: false },
    // Infectious
    hiv: { type: Boolean, default: false },
    hepatitisB: { type: Boolean, default: false },
    syphilis: { type: Boolean, default: false },
    tuberculosis: { type: Boolean, default: false },
    chagas: { type: Boolean, default: false },
    venerealDiseases: { type: Boolean, default: false },
    // Other
    tumors: { type: Boolean, default: false },
    eatingDisorders: { type: Boolean, default: false },
    rheumaticFever: { type: Boolean, default: false },
    chemotherapy: { type: Boolean, default: false },
    radiotherapy: { type: Boolean, default: false },
    other: { type: Boolean, default: false },
    // Lifestyle
    smokes: { type: Boolean, default: false },
    drinksAlcohol: { type: Boolean, default: false },
    drugs: { type: Boolean, default: false },
    tattoos: { type: Boolean, default: false },
    bruxism: { type: Boolean, default: false },
    // Comments per category
    categoryComments: {
      cardiovascular: String,
      respiratory: String,
      urinary: String,
      digestive: String,
      osteoarticular: String,
      hematologic: String,
      endocrine: String,
      nervous: String,
      allergiesComment: String,
      infectious: String,
      other: String,
      lifestyle: String,
    },
    observations: String
  },

  odontogram: [{
    toothNumber: { type: Number, required: true },
    status: { type: String, default: 'present' },
    surfaces: {
      top: String,
      bottom: String,
      left: String,
      right: String,
      center: String
    },
    notes: String
  }],

  periodontogram: { type: Schema.Types.Mixed, default: {} },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

PatientSchema.index({ userId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
PatientSchema.index({ userId: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true } } });

export const Patient = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
