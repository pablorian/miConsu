import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId; // optional ref to Appointment
  date: Date;
  professional: string;
  professionalId?: mongoose.Types.ObjectId; // optional ref to Professional model
  service: string;
  price: number;
  paid: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRecordSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
  date: { type: Date, required: true, default: Date.now },
  professional: { type: String, required: true },
  professionalId: { type: Schema.Types.ObjectId, ref: 'Professional', default: null },
  service: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  paid: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

ServiceRecordSchema.index({ patientId: 1, date: -1 });

export const ServiceRecord = mongoose.models.ServiceRecord
  ? (mongoose.models.ServiceRecord as mongoose.Model<IServiceRecord>)
  : mongoose.model<IServiceRecord>('ServiceRecord', ServiceRecordSchema);
