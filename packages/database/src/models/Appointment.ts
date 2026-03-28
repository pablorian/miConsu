import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  userId: mongoose.Types.ObjectId;
  calendarId: string;
  googleEventId?: string;
  start: Date;
  end: Date;
  patientId?: mongoose.Types.ObjectId;
  patientName: string;
  patientEmail?: string;
  patientPhone: string;
  reason: string; // Changed to string to be more flexible with Cal.com titles
  status: 'pending' | 'confirmed' | 'user confirmed' | 'user waiting' | 'done' | 'cancelled';
  solicitudDismissed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  calendarId: { type: String, required: true },
  googleEventId: { type: String },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String },
  patientPhone: { type: String }, // Made optional if we link to Patient, but kept for now
  reason: {
    type: String,
    required: true,
    default: 'Primera Consulta' // Default for external events
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'user confirmed', 'user waiting', 'done', 'cancelled'],
    default: 'pending'
  },
  solicitudDismissed: { type: Boolean, default: false },
}, { timestamps: true });

// Index for efficient querying by user/date
AppointmentSchema.index({ userId: 1, start: 1 });
AppointmentSchema.index({ googleEventId: 1 });

export const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
