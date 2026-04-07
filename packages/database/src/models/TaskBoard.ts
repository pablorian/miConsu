import mongoose, { Schema, Document } from 'mongoose';

export interface IBoardStatus {
  _id?: string;
  name: string;
  color: string;   // hex
  order: number;
}

export interface ITaskBoard extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  statuses: IBoardStatus[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BoardStatusSchema = new Schema<IBoardStatus>({
  name:  { type: String, required: true, trim: true },
  color: { type: String, required: true, default: '#6366f1' },
  order: { type: Number, required: true, default: 0 },
}, { _id: true });

const TaskBoardSchema: Schema = new Schema<ITaskBoard>({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  statuses:    { type: [BoardStatusSchema], default: [] },
  isDefault:   { type: Boolean, default: false },
}, { timestamps: true });

TaskBoardSchema.index({ userId: 1 });

export const TaskBoard = mongoose.models.TaskBoard ||
  mongoose.model<ITaskBoard>('TaskBoard', TaskBoardSchema);
