import mongoose, { Schema, Document } from 'mongoose';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  boardId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  /** References TaskBoard.statuses._id (stored as string) */
  statusId: string;
  priority: TaskPriority;
  dueDate?: Date;
  /** Sort order within the status column (lower = top) */
  order: number;
  // ─── Ficha / Obra Social metadata (populated when created from a completed appointment) ───
  patientId?: mongoose.Types.ObjectId;
  patientName?: string;
  prestacion?: string;
  obraSocial?: string;
  sourceAppointmentId?: mongoose.Types.ObjectId;
  sourceServiceRecordId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema<ITask>({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  boardId:     { type: Schema.Types.ObjectId, ref: 'TaskBoard', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  statusId:    { type: String, required: true },
  priority:    { type: String, enum: ['none', 'low', 'medium', 'high', 'urgent'], default: 'none' },
  dueDate:     { type: Date, default: null },
  order:       { type: Number, default: 0 },
  // Ficha metadata
  patientId:            { type: Schema.Types.ObjectId, ref: 'Patient', default: null },
  patientName:          { type: String, trim: true },
  prestacion:           { type: String, trim: true },
  obraSocial:           { type: String, trim: true },
  sourceAppointmentId:  { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
  sourceServiceRecordId:{ type: Schema.Types.ObjectId, ref: 'ServiceRecord', default: null },
}, { timestamps: true });

TaskSchema.index({ boardId: 1, statusId: 1, order: 1 });
TaskSchema.index({ userId: 1, boardId: 1 });

export const Task = mongoose.models.Task ||
  mongoose.model<ITask>('Task', TaskSchema);
