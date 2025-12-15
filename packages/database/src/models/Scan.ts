import mongoose, { Schema, Document } from 'mongoose';

export interface IScan extends Document {
  qrCodeId: mongoose.Schema.Types.ObjectId;
  ip: string;
  userAgent: string;
  device?: string; // Mobile, Tablet, Desktop
  os?: string;
  browser?: string;
  country?: string;
  city?: string;
  createdAt: Date;
}

const ScanSchema: Schema = new Schema({
  qrCodeId: { type: Schema.Types.ObjectId, ref: 'QRCode', required: true },
  ip: { type: String },
  userAgent: { type: String },
  device: { type: String },
  os: { type: String },
  browser: { type: String },
  country: { type: String },
  city: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Scan = mongoose.models.Scan || mongoose.model<IScan>('Scan', ScanSchema);
