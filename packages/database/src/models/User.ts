import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  workosId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  workosId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  profilePictureUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Ensure we use the 'users' collection as requested
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'users');
