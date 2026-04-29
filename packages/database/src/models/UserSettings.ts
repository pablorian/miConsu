import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  // ─── Flujos Automáticos ───────────────────────────────────────────────────
  autoGenerateFichasObrasSociales: boolean;
  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  whatsappReminderTemplate: string;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_WHATSAPP_TEMPLATE = 'Hola {nombre}, te recordamos tu turno el {fecha} a las {hora} hs. ¡Te esperamos! 🗓️';

const UserSettingsSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    autoGenerateFichasObrasSociales: { type: Boolean, default: false },
    whatsappReminderTemplate: { type: String, default: DEFAULT_WHATSAPP_TEMPLATE },
  },
  { timestamps: true }
);

export const UserSettings = mongoose.models.UserSettings
  ? (mongoose.models.UserSettings as mongoose.Model<IUserSettings>)
  : mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
