export const env = {
  MONGODB_URI: process.env.MONGODB_URI!,
  WORKOS_API_KEY: process.env.WORKOS_API_KEY!,
  WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID!,
  WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD!,
  WORKOS_REDIRECT_URI: process.env.WORKOS_REDIRECT_URI!,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
  NODE_ENV: process.env.NODE_ENV || 'development', // Keeping NODE_ENV with its default as it was in the original
};

// Simple check to ensure required variables provided at build/runtime
Object.entries(env).forEach(([key, value]) => {
  // NODE_ENV has a default, so it's not strictly required to be in process.env
  if (key !== 'NODE_ENV' && !value) {
    throw new Error(`Missing environment variable: ${key} `);
  }
});
