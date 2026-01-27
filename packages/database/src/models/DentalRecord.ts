import mongoose, { Schema, Document } from 'mongoose';

export interface IDentalRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  date: Date;
  reason?: string;
  treatment?: string;
  diagnosis?: string;
  observations?: string;
  hasTartar: boolean;
  hasPeriodontalDisease: boolean;
  odontogram: {
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
  createdAt: Date;
  updatedAt: Date;
}

const DentalRecordSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, required: true, default: Date.now },
  reason: String,
  treatment: String,
  diagnosis: String,
  observations: String,
  hasTartar: { type: Boolean, default: false },
  hasPeriodontalDisease: { type: Boolean, default: false },

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

DentalRecordSchema.index({ patientId: 1, date: -1 });

export const DentalRecord = mongoose.models.DentalRecord || mongoose.model<IDentalRecord>('DentalRecord', DentalRecordSchema);
