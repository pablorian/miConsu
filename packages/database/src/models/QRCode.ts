import mongoose, { Schema, Document } from 'mongoose';

export interface IQRCode extends Document {
  userId: string;
  url: string;
  shortId: string;
  qrImage: string; // Base64 or URL
  scans: number;
  createdAt: Date;
}

const QRCodeSchema: Schema = new Schema({
  userId: { type: String, required: true },
  url: { type: String, required: true }, // Destination URL
  shortId: { type: String, required: true, unique: true },
  qrImage: { type: String, required: true },
  scans: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const QRCode = mongoose.models.QRCode || mongoose.model<IQRCode>('QRCode', QRCodeSchema);
