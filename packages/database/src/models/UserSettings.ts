import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  // ─── Flujos Automáticos ───────────────────────────────────────────────────
  autoGenerateFichasObrasSociales: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    autoGenerateFichasObrasSociales: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserSettings = mongoose.models.UserSettings
  ? (mongoose.models.UserSettings as mongoose.Model<IUserSettings>)
  : mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
