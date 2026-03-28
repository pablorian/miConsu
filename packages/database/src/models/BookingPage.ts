import mongoose, { Schema, Document } from 'mongoose';
import { IWorkingDay, IServiceType } from './Consultorio';

/**
 * A BookingPage represents one public appointment-booking page.
 * Each Consultorio can have multiple BookingPages (e.g. "Consulta general", "Urgencias").
 * The public URL is /book/[publicSlug].
 */
export interface IBookingPage extends Document {
  userId: mongoose.Types.ObjectId;
  consultorioId?: mongoose.Types.ObjectId; // optional — pages can exist without a consultorio
  // ── Identity ────────────────────────────────────────────────────────────────
  name: string;               // internal label shown in the admin list
  publicSlug: string;         // URL: /book/[publicSlug]
  isEnabled: boolean;
  // ── Public display ──────────────────────────────────────────────────────────
  bookingTitle?: string;       // heading shown on the public booking page
  // ── Slot config ─────────────────────────────────────────────────────────────
  slotDurationMinutes: number;
  workingHours: Record<string, IWorkingDay>;
  // ── Scheduling window ───────────────────────────────────────────────────────
  maxAdvanceDays: number;      // 0 = unlimited
  minAdvanceHours: number;
  // ── Appointment settings ────────────────────────────────────────────────────
  bufferMinutes: number;
  maxBookingsPerDay: number;   // 0 = unlimited
  serviceTypes: IServiceType[];
  // ── Google Calendar sync ────────────────────────────────────────────────────
  syncToGoogleCalendar: boolean;
  googleCalendarId?: string;   // which Google Calendar to write events to
  createdAt: Date;
  updatedAt: Date;
}

const WorkingDaySchema = new Schema({
  enabled:   { type: Boolean, default: false },
  startTime: { type: String,  default: '09:00' },
  endTime:   { type: String,  default: '18:00' },
}, { _id: false });

const ServiceTypeSchema = new Schema({
  id:              { type: String, required: true },
  name:            { type: String, required: true, trim: true },
  description:     { type: String, trim: true },
  color:           { type: String },
  durationMinutes: { type: Number },
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

const BookingPageSchema: Schema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User',        required: true },
  consultorioId: { type: Schema.Types.ObjectId, ref: 'Consultorio', required: false, default: null },
  name:          { type: String, required: true, trim: true },
  publicSlug:    { type: String, required: true, trim: true, lowercase: true },
  isEnabled:     { type: Boolean, default: true },
  bookingTitle:  { type: String, trim: true, default: null },
  slotDurationMinutes: { type: Number, default: 60 },
  workingHours: {
    type: {
      0: { type: WorkingDaySchema },
      1: { type: WorkingDaySchema },
      2: { type: WorkingDaySchema },
      3: { type: WorkingDaySchema },
      4: { type: WorkingDaySchema },
      5: { type: WorkingDaySchema },
      6: { type: WorkingDaySchema },
    },
    default: defaultWorkingHours,
  },
  maxAdvanceDays:    { type: Number, default: 60 },
  minAdvanceHours:   { type: Number, default: 4 },
  bufferMinutes:     { type: Number, default: 0 },
  maxBookingsPerDay: { type: Number, default: 0 },
  serviceTypes: { type: [ServiceTypeSchema], default: [] },
  // Google Calendar sync
  syncToGoogleCalendar: { type: Boolean, default: false },
  googleCalendarId:     { type: String, default: null },
}, { timestamps: true });

// Slug is unique per user, not globally — allows different users to use the same slug
BookingPageSchema.index({ userId: 1, publicSlug: 1 }, { unique: true });

export const BookingPage = mongoose.models.BookingPage
  ? (mongoose.models.BookingPage as mongoose.Model<IBookingPage>)
  : mongoose.model<IBookingPage>('BookingPage', BookingPageSchema);
