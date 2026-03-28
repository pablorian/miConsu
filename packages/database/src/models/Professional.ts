import mongoose, { Schema, Document } from 'mongoose';

export interface IProfessional extends Document {
  name: string;
  email?: string;
  color?: string;
  percentage?: number; // porcentaje de liquidación (0-100)
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProfessionalSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  color: { type: String, default: '#6366f1' },
  percentage: { type: Number, default: 0, min: 0, max: 100 },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

ProfessionalSchema.index({ userId: 1 });

export const Professional = mongoose.models.Professional ||
  mongoose.model<IProfessional>('Professional', ProfessionalSchema);
