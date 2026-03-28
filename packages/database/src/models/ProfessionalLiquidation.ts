import mongoose, { Schema, Document } from 'mongoose';

export interface IProfessionalLiquidation extends Document {
  professionalId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  periodFrom?: Date;
  periodTo?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProfessionalLiquidationSchema: Schema = new Schema({
  professionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  periodFrom: { type: Date },
  periodTo: { type: Date },
  notes: { type: String, trim: true },
}, { timestamps: true });

ProfessionalLiquidationSchema.index({ professionalId: 1, userId: 1, date: -1 });

export const ProfessionalLiquidation =
  mongoose.models.ProfessionalLiquidation ||
  mongoose.model<IProfessionalLiquidation>('ProfessionalLiquidation', ProfessionalLiquidationSchema);
