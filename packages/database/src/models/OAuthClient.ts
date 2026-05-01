import mongoose, { Schema, Document } from 'mongoose';

export interface IOAuthClient extends Document {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: Date;
}

const OAuthClientSchema: Schema = new Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  clientName: { type: String, default: 'MCP Client' },
  redirectUris: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const OAuthClient =
  mongoose.models.OAuthClient ||
  mongoose.model<IOAuthClient>('OAuthClient', OAuthClientSchema);
