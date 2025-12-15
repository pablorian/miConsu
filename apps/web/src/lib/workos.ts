import { WorkOS } from '@workos-inc/node';
import { SignJWT, jwtVerify } from 'jose';

export const getWorkOS = () => {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) throw new Error('WORKOS_API_KEY is not set');
  return new WorkOS(apiKey);
};

export const getClientId = () => {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) throw new Error('WORKOS_CLIENT_ID is not set');
  return clientId;
};

const getSecret = () => {
  const password = process.env.WORKOS_COOKIE_PASSWORD;
  if (!password) throw new Error('WORKOS_COOKIE_PASSWORD is not set');
  return new TextEncoder().encode(password);
}

export async function createSession(user: any) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(getSecret());
  return token;
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.user;
  } catch (e) {
    return null;
  }
}
