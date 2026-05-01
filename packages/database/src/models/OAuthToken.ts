import mongoose, { Schema, Document } from 'mongoose';

export interface IOAuthToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  clientId?: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

const OAuthTokenSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  clientId: { type: String, index: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
});

OAuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthToken = mongoose.models.OAuthToken || mongoose.model<IOAuthToken>('OAuthToken', OAuthTokenSchema);
