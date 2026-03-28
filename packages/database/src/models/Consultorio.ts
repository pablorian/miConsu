import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkingDay {
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface IServiceType {
  id: string;              // client-generated UUID
  name: string;
  description?: string;
  color?: string;
  durationMinutes?: number;
}

export interface IConsultorio extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  hourlyRate: number;
  color: string;
  googleCalendarId?: string;
  googleSyncToken?: string;
  // ── Public booking config ─────────────────────────────────────
  bookingEnabled: boolean;
  publicSlug?: string;
  bookingTitle?: string;          // shown on the public booking page
  slotDurationMinutes: number;
  workingHours: {
    0: IWorkingDay; // Sun
    1: IWorkingDay; // Mon
    2: IWorkingDay; // Tue
    3: IWorkingDay; // Wed
    4: IWorkingDay; // Thu
    5: IWorkingDay; // Fri
    6: IWorkingDay; // Sat
  };
  // ── Scheduling window ─────────────────────────────────────────
  maxAdvanceDays: number;         // how far ahead can patients book (0 = unlimited)
  minAdvanceHours: number;        // minimum notice required in hours
  // ── Appointment settings ──────────────────────────────────────
  bufferMinutes: number;          // gap between consecutive appointments
  maxBookingsPerDay: number;      // 0 = unlimited
  serviceTypes: IServiceType[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkingDaySchema = new Schema({
  enabled:   { type: Boolean, default: false },
  startTime: { type: String, default: '09:00' },
  endTime:   { type: String, default: '18:00' },
}, { _id: false });

const defaultWorkingHours = () => ({
  0: { enabled: false, startTime: '09:00', endTime: '18:00' },
  1: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  2: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  3: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  4: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  5: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  6: { enabled: false, startTime: '09:00', endTime: '18:00' },
});

const ServiceTypeSchema = new Schema({
  id:              { type: String, required: true },
  name:            { type: String, required: true, trim: true },
  description:     { type: String, trim: true },
  color:           { type: String },
  durationMinutes: { type: Number },
}, { _id: false });

const ConsultorioSchema: Schema = new Schema({
  userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:             { type: String, required: true, trim: true },
  description:      { type: String, trim: true },
  hourlyRate:       { type: Number, required: true, default: 0 },
  color:            { type: String, default: '#6366f1' },
  googleCalendarId: { type: String, default: null },
  googleSyncToken:  { type: String, default: null },
  // ── Public booking ────────────────────────────────────────────
  bookingEnabled:       { type: Boolean, default: false },
  publicSlug:           { type: String, trim: true, lowercase: true, default: null },
  bookingTitle:         { type: String, trim: true, default: null },
  slotDurationMinutes:  { type: Number, default: 60 },
  workingHours: {
    type: {
      0: { type: WorkingDaySchema, default: () => ({ enabled: false, startTime: '09:00', endTime: '18:00' }) },
      1: { type: WorkingDaySchema, default: () => ({ enabled: true,  startTime: '09:00', endTime: '18:00' }) },
      2: { type: WorkingDaySchema, default: () => ({ enabled: true,  startTime: '09:00', endTime: '18:00' }) },
      3: { type: WorkingDaySchema, default: () => ({ enabled: true,  startTime: '09:00', endTime: '18:00' }) },
      4: { type: WorkingDaySchema, default: () => ({ enabled: true,  startTime: '09:00', endTime: '18:00' }) },
      5: { type: WorkingDaySchema, default: () => ({ enabled: true,  startTime: '09:00', endTime: '18:00' }) },
      6: { type: WorkingDaySchema, default: () => ({ enabled: false, startTime: '09:00', endTime: '18:00' }) },
    },
    default: defaultWorkingHours,
  },
  // ── Scheduling window ─────────────────────────────────────────
  maxAdvanceDays:  { type: Number, default: 60 },
  minAdvanceHours: { type: Number, default: 4 },
  // ── Appointment settings ──────────────────────────────────────
  bufferMinutes:     { type: Number, default: 0 },
  maxBookingsPerDay: { type: Number, default: 0 },
  serviceTypes: { type: [ServiceTypeSchema], default: [] },
}, { timestamps: true });

ConsultorioSchema.index({ userId: 1, name: 1 });
ConsultorioSchema.index({ publicSlug: 1 }, { sparse: true });

export const Consultorio = mongoose.models.Consultorio
  ? (mongoose.models.Consultorio as mongoose.Model<IConsultorio>)
  : mongoose.model<IConsultorio>('Consultorio', ConsultorioSchema);
