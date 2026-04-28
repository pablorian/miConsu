import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@repo/database';
import { OAuthAuthCode, OAuthToken } from '@repo/database';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

    if (grant_type !== 'authorization_code') {
      return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
    }

    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing required parameters' }, { status: 400 });
    }

    await connectToDatabase();

    const authCode = await OAuthAuthCode.findOne({ code, used: false });

    if (!authCode) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid or expired code' }, { status: 400 });
    }

    if (authCode.expiresAt < new Date()) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Code expired' }, { status: 400 });
    }

    if (authCode.redirectUri !== redirect_uri) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' }, { status: 400 });
    }

    if (!verifyPKCE(code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 });
    }

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
    });
  } catch (error) {
    console.error('OAuth token error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
