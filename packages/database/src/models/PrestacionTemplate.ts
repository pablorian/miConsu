import mongoose, { Schema, Document } from 'mongoose';

export interface IPrestacionTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrestacionTemplateSchema: Schema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  price:       { type: Number, required: true, default: 0, min: 0 },
  description: { type: String, trim: true, default: '' },
}, { timestamps: true });

PrestacionTemplateSchema.index({ userId: 1, name: 1 });

export const PrestacionTemplate = mongoose.models.PrestacionTemplate ||
  mongoose.model<IPrestacionTemplate>('PrestacionTemplate', PrestacionTemplateSchema);
