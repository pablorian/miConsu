import mongoose, { Schema, Document } from 'mongoose';

export interface IPatientFile extends Document {
  patientId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientFileSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  mimeType: { type: String, required: true },
  webViewLink: { type: String, required: true },
  iconLink: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

PatientFileSchema.index({ patientId: 1, createdAt: -1 });

export const PatientFile = mongoose.models.PatientFile || mongoose.model<IPatientFile>('PatientFile', PatientFileSchema);
