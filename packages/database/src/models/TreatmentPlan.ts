import mongoose, { Schema, Document } from 'mongoose';

export interface ITreatmentPlan extends Document {
  patientId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  professional: string;
  status: 'En Progreso' | 'Finalizado' | 'Cancelado';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TreatmentPlanSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  professional: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['En Progreso', 'Finalizado', 'Cancelado'],
    default: 'En Progreso'
  },
  notes: { type: String },
}, {
  timestamps: true
});

TreatmentPlanSchema.index({ patientId: 1, userId: 1 });

export const TreatmentPlan = mongoose.models.TreatmentPlan || mongoose.model<ITreatmentPlan>('TreatmentPlan', TreatmentPlanSchema);
