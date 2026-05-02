import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  workosId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  publicId?: string; // Unique slug for public profile/booking
  createdAt: Date;
  updatedAt: Date;
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
  googleCalendarTokenExpiry?: Date;
  googleCalendarSyncToken?: string;
  googleChannelId?: string;
  googleChannelResourceId?: string;
  googleChannelExpiration?: string;
  timezone?: string;
  calendarPreferences?: {
    view?: string;
    calendars?: {
      calendarId: string;
      visible: boolean;
      publicSlug?: string; // Slug for this specific calendar
      isPublic?: boolean;  // Whether it accepts bookings
    }[];
  };
}

const UserSchema: Schema = new Schema({
  workosId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  profilePictureUrl: { type: String },
  publicId: { type: String, unique: true, sparse: true, trim: true }, // Sparse allows multiple nulls
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // TODO [SECURITY - HIGH]: Google OAuth tokens stored as plaintext in MongoDB.
  // If the database is compromised, attackers gain full access to users' Google Calendar
  // and Drive accounts, including patient files uploaded to Drive.
  // Fix: encrypt tokens at rest using AES-256-GCM with a key stored in environment
  // variables (not in the DB), and decrypt only when needed for API calls.
  googleCalendarAccessToken: { type: String },
  googleCalendarRefreshToken: { type: String },
  googleCalendarTokenExpiry: { type: Date },
  googleCalendarSyncToken: { type: String },
  googleChannelId: { type: String },
  googleChannelResourceId: { type: String },
  googleChannelExpiration: { type: String },
  timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
  calendarPreferences: {
    view: { type: String, default: 'week' },
    calendars: [{
      _id: false,
      calendarId: { type: String, required: true },
      visible: { type: Boolean, default: true },
      publicSlug: { type: String, trim: true },
      isPublic: { type: Boolean, default: false }
    }]
  },
}, { timestamps: true });

// Ensure we use the 'users' collection as requested
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'users');
