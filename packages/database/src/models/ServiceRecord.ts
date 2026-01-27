import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  date: Date;
  professional: string;
  service: string;
  price: number;
  paid: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRecordSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, required: true, default: Date.now },
  professional: { type: String, required: true },
  service: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  paid: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

ServiceRecordSchema.index({ patientId: 1, date: -1 });

export const ServiceRecord = mongoose.models.ServiceRecord || mongoose.model<IServiceRecord>('ServiceRecord', ServiceRecordSchema);
