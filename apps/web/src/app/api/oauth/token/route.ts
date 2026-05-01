import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@repo/database';
import { OAuthAuthCode, OAuthToken } from '@repo/database';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const computed = Buffer.from(hash).toString('base64url');
    return computed === codeChallenge;
  }
  return codeVerifier === codeChallenge;
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, string> = {};

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      for (const pair of text.split('&')) {
        const [k, v] = pair.split('=');
        if (k) body[decodeURIComponent(k)] = decodeURIComponent(v || '');
      }
    } else {
      body = await req.json();
    }

    const { grant_type, code, redirect_uri, client_id, code_verifier } = body;

    const err = (msg: string, desc?: string, status = 400) =>
      NextResponse.json({ error: msg, ...(desc ? { error_description: desc } : {}) }, { status, headers: CORS_HEADERS });

    if (grant_type !== 'authorization_code') return err('unsupported_grant_type');
    if (!code || !redirect_uri || !client_id || !code_verifier) return err('invalid_request', 'Missing required parameters');

    await connectToDatabase();

    const authCode = await OAuthAuthCode.findOne({ code, used: false });

    if (!authCode) return err('invalid_grant', 'Invalid or expired code');
    if (authCode.expiresAt < new Date()) return err('invalid_grant', 'Code expired');
    if (authCode.redirectUri !== redirect_uri) return err('invalid_grant', 'redirect_uri mismatch');
    if (!verifyPKCE(code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod)) return err('invalid_grant', 'PKCE verification failed');

    authCode.used = true;
    await authCode.save();

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await OAuthToken.create({
      userId: authCode.userId,
      tokenHash,
      expiresAt,
    });

    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('OAuth token error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: CORS_HEADERS });
  }
}
