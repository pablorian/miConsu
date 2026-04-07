import mongoose, { Schema, Document } from 'mongoose';

export interface IObraSocial extends Document {
  name: string;
  /** Short code / abbreviation */
  code?: string;
  /** Display order (lower = first) */
  order?: number;
  active: boolean;
}

const ObraSocialSchema: Schema = new Schema({
  name:   { type: String, required: true, trim: true, unique: true },
  code:   { type: String, trim: true },
  order:  { type: Number, default: 999 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

ObraSocialSchema.index({ active: 1, order: 1, name: 1 });

export const ObraSocial = mongoose.models.ObraSocial ||
  mongoose.model<IObraSocial>('ObraSocial', ObraSocialSchema);
