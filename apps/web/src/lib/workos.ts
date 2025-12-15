import { WorkOS } from '@workos-inc/node';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env';

export const workos = new WorkOS(env.WORKOS_API_KEY);

export const clientId = env.WORKOS_CLIENT_ID;

const getSecret = () => new TextEncoder().encode(env.WORKOS_COOKIE_PASSWORD);

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
