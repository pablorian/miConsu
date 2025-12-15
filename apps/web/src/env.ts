const requiredEnvVar = (key: string, value?: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  get WORKOS_API_KEY() { return requiredEnvVar('WORKOS_API_KEY', process.env.WORKOS_API_KEY); },
  get WORKOS_CLIENT_ID() { return requiredEnvVar('WORKOS_CLIENT_ID', process.env.WORKOS_CLIENT_ID); },
  get WORKOS_COOKIE_PASSWORD() { return requiredEnvVar('WORKOS_COOKIE_PASSWORD', process.env.WORKOS_COOKIE_PASSWORD); },
  get WORKOS_REDIRECT_URI() { return process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/auth/callback'; },
  get MONGODB_URI() { return requiredEnvVar('MONGODB_URI', process.env.MONGODB_URI); },
  get NEXT_PUBLIC_APP_URL() { return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; },
  get NODE_ENV() { return process.env.NODE_ENV || 'development'; },
};
