const requiredEnvVar = (key: string, value?: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  WORKOS_API_KEY: requiredEnvVar('WORKOS_API_KEY', process.env.WORKOS_API_KEY),
  WORKOS_CLIENT_ID: requiredEnvVar('WORKOS_CLIENT_ID', process.env.WORKOS_CLIENT_ID),
  WORKOS_COOKIE_PASSWORD: requiredEnvVar('WORKOS_COOKIE_PASSWORD', process.env.WORKOS_COOKIE_PASSWORD),
  WORKOS_REDIRECT_URI: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  MONGODB_URI: requiredEnvVar('MONGODB_URI', process.env.MONGODB_URI),
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
