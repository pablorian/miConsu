import mongoose, { Schema, Document } from 'mongoose';

export interface IOAuthAuthCode extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  state?: string;
  expiresAt: Date;
  used: boolean;
}

const OAuthAuthCodeSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true, unique: true },
  codeChallenge: { type: String, required: true },
  codeChallengeMethod: { type: String, default: 'S256' },
  redirectUri: { type: String, required: true },
  clientId: { type: String, required: true },
  state: { type: String },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

OAuthAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthAuthCode = mongoose.models.OAuthAuthCode || mongoose.model<IOAuthAuthCode>('OAuthAuthCode', OAuthAuthCodeSchema);
