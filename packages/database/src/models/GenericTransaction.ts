import mongoose, { Schema, Document } from 'mongoose';

export interface IGenericTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'ingreso' | 'egreso';
  date: Date;
  amount: number;
  concept: string;
  category?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GenericTransactionSchema: Schema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, enum: ['ingreso', 'egreso'], required: true },
  date:          { type: Date, required: true, default: Date.now },
  amount:        { type: Number, required: true, min: 0 },
  concept:       { type: String, required: true, trim: true },
  category:      { type: String, trim: true },
  paymentMethod: { type: String, trim: true },
  notes:         { type: String, trim: true },
}, { timestamps: true });

GenericTransactionSchema.index({ userId: 1, date: -1 });

export const GenericTransaction =
  mongoose.models.GenericTransaction ||
  mongoose.model<IGenericTransaction>('GenericTransaction', GenericTransactionSchema);
