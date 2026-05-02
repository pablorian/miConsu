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

// TODO [SECURITY - MEDIUM]: Plain PKCE method is accepted (fallback when method !== 'S256').
// This allows the code_verifier to equal the code_challenge in plaintext, removing the
// cryptographic protection PKCE provides. Fix: reject any method other than 'S256'.
function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const computed = Buffer.from(hash).toString('base64url');
    return computed === codeChallenge;
  }
  return codeVerifier === codeChallenge;
}

// TODO [SECURITY - HIGH]: No rate limiting on this endpoint. An attacker can brute-force
// authorization codes or make unlimited token exchange attempts.
// Fix: add IP-based rate limiting (e.g. 10 req/min per IP) using a middleware or
// an in-memory store like Upstash Ratelimit.
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

    // TODO [SECURITY - LOW]: Distinct error messages ("Invalid or expired code" vs "Code expired")
    // allow attackers to distinguish valid but expired codes from invalid ones, enabling
    // code enumeration attacks. Fix: return a single generic 'invalid_grant' message for both.
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
      clientId: authCode.clientId,
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
