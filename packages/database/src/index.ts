import mongoose from 'mongoose';



/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}


export * from './models/User';
export * from './models/Appointment';
export * from './models/Patient';
export * from './models/DentalRecord';
export * from './models/ServiceRecord';
export * from './models/PatientFile';
export * from './models/TreatmentPlan';
export * from './models/Payment';
export * from './models/Professional';
export * from './models/ProfessionalLiquidation';
export * from './models/Consultorio';
export * from './models/ConsultorioBooking';
export * from './models/BookingPage';
export * from './models/PrestacionTemplate';
export * from './models/ObraSocial';
export * from './models/TaskBoard';
export * from './models/Task';
export * from './models/UserSettings';
export * from './models/GenericTransaction';
export * from './models/OAuthToken';
export * from './models/OAuthAuthCode';

export default connectToDatabase;
