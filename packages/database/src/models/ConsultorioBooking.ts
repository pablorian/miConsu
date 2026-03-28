import mongoose, { Schema, Document } from 'mongoose';

export type RecurrenceType = 'once' | 'weekly' | 'biweekly' | 'monthly';

export interface IConsultorioBooking extends Document {
  userId: mongoose.Types.ObjectId;
  consultorioId: mongoose.Types.ObjectId;
  professionalId?: mongoose.Types.ObjectId;
  professionalName: string;
  /** Start date of the booking / recurrence (stored as start-of-day UTC) */
  date: Date;
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
  /** Monthly price for this slot (replaces per-hour calculation) */
  monthlyPrice: number;
  /** Recurrence pattern */
  recurrenceType: RecurrenceType;
  /**
   * Days of the week this booking repeats on (0=Sun … 6=Sat).
   * Used for 'weekly' and 'biweekly' recurrences.
   * Empty / unused for 'once' and 'monthly'.
   */
  daysOfWeek: number[];
  /** Optional end date for the recurrence (inclusive). Null = no end. */
  endDate?: Date;
  notes?: string;
  // Legacy fields kept for backward compatibility
  hours?: number;
  totalCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultorioBookingSchema: Schema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  consultorioId:   { type: Schema.Types.ObjectId, ref: 'Consultorio', required: true },
  professionalId:  { type: Schema.Types.ObjectId, ref: 'Professional', default: null },
  professionalName:{ type: String, required: true, trim: true },
  date:            { type: Date, required: true },
  startTime:       { type: String, required: true },
  endTime:         { type: String, required: true },
  monthlyPrice:    { type: Number, default: 0 },
  recurrenceType:  { type: String, enum: ['once', 'weekly', 'biweekly', 'monthly'], default: 'once' },
  daysOfWeek:      { type: [Number], default: [] },
  endDate:         { type: Date, default: null },
  notes:           { type: String, trim: true },
  // Legacy
  hours:           { type: Number },
  totalCost:       { type: Number },
}, { timestamps: true });

ConsultorioBookingSchema.index({ userId: 1, date: 1 });
ConsultorioBookingSchema.index({ consultorioId: 1, date: 1 });

export const ConsultorioBooking = mongoose.models.ConsultorioBooking
  ? (mongoose.models.ConsultorioBooking as mongoose.Model<IConsultorioBooking>)
  : mongoose.model<IConsultorioBooking>('ConsultorioBooking', ConsultorioBookingSchema);
