import { WorkOS } from '@workos-inc/node';
import { SignJWT, jwtVerify } from 'jose';

export const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const getClientId = () => {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) throw new Error('WORKOS_CLIENT_ID is not set');
  return clientId;
};

const secret = new TextEncoder().encode(process.env.WORKOS_COOKIE_PASSWORD);

export async function createSession(user: any) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(secret);
  return token;
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.user;
  } catch (e) {
    return null;
  }
}
