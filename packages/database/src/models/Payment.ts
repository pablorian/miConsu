import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  patientId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  concept?: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'otro';
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  concept: { type: String, trim: true },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'otro'],
    default: 'efectivo',
  },
  currency: { type: String, default: 'ARS' },
}, { timestamps: true });

PaymentSchema.index({ patientId: 1, userId: 1, date: -1 });

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
