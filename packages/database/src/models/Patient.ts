import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  email?: string;
  phone?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  personalInfo?: {
    dni?: string;
    age?: number;
    birthDate?: Date;
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
  odontogram?: {
    toothNumber: number;
    status: string; // 'present', 'missing', 'implant', 'crown'
    surfaces?: {
      top?: string; // vestibular (upper) / lingual (lower)
      bottom?: string; // lingual (upper) / vestibular (lower)
      left?: string; // mesial/distal
      right?: string; // distal/mesial
      center?: string; // occlusal/incisal
    };
    notes?: string;
  }[];
}

const PatientSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, sparse: true, trim: true, lowercase: true },
  phone: { type: String, sparse: true, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  personalInfo: {
    dni: String,
    age: Number,
    birthDate: Date,
    maritalStatus: String,
    nationality: String,
    address: String,
    neighborhood: String,
    profession: String
  },

  medicalCoverage: {
    plan: String,
    affiliateNumber: String,
    holderName: String,
    holderWorkplace: String
  },

  pathologies: {
    diabetes: { type: Boolean, default: false },
    hiv: { type: Boolean, default: false },
    allergies: { type: Boolean, default: false },
    rheumaticFever: { type: Boolean, default: false },
    heartProblems: { type: Boolean, default: false },
    pacemaker: { type: Boolean, default: false },
    hypertension: { type: Boolean, default: false },
    kidneyProblems: { type: Boolean, default: false },
    tuberculosis: { type: Boolean, default: false },
    chagas: { type: Boolean, default: false },
    hepatitis: { type: Boolean, default: false },
    venerealDiseases: { type: Boolean, default: false },
    gastritis: { type: Boolean, default: false },
    eatingDisorders: { type: Boolean, default: false },
    bloodDisorders: { type: Boolean, default: false },
    bloodTransfusion: { type: Boolean, default: false },
    chemotherapy: { type: Boolean, default: false },
    radiotherapy: { type: Boolean, default: false },
    thyroid: { type: Boolean, default: false },
    other: { type: Boolean, default: false },
    smokes: { type: Boolean, default: false },
    drinksAlcohol: { type: Boolean, default: false },
    bruxism: { type: Boolean, default: false },
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

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness per user if needed, or just standard indexes
PatientSchema.index({ userId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true } } });
PatientSchema.index({ userId: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true } } });

export const Patient = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
