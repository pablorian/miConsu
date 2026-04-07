import mongoose, { Schema, Document } from 'mongoose';

export interface IObraSocialPercentage {
  obraSocialId: string;
  name: string;
  percentage: number;
}

export interface IProfessional extends Document {
  name: string;
  email?: string;
  color?: string;
  percentage?: number; // porcentaje de liquidación genérico (0-100)
  obraSocialPercentages?: IObraSocialPercentage[]; // overrides por obra social
  consultorioId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ObraSocialPercentageSchema = new Schema({
  obraSocialId: { type: String, required: true },
  name:         { type: String, required: true },
  percentage:   { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const ProfessionalSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  color: { type: String, default: '#6366f1' },
  percentage: { type: Number, default: 0, min: 0, max: 100 },
  obraSocialPercentages: { type: [ObraSocialPercentageSchema], default: [] },
  consultorioId: { type: Schema.Types.ObjectId, ref: 'Consultorio', default: null },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

ProfessionalSchema.index({ userId: 1 });

export const Professional = mongoose.models.Professional ||
  mongoose.model<IProfessional>('Professional', ProfessionalSchema);
