import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env';

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
  const { payload } = await jwtVerify(token, getSecret());
  return payload.user;
}
