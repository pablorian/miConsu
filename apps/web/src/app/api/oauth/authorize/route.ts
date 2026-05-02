import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User } from '@repo/database';
import { OAuthAuthCode } from '@repo/database';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = body;

    // TODO [SECURITY - HIGH]: Sensitive OAuth parameters logged in plaintext. Remove or
    // replace with a structured audit log that redacts code_challenge and state values.
    // Risk: server logs accessible to attackers expose authorization flow details.
    console.log('[oauth/authorize] request:', { client_id, redirect_uri, code_challenge_method, state });

    // TODO [SECURITY - CRITICAL]: redirect_uri is accepted without whitelist validation.
    // An attacker can craft an authorization URL with redirect_uri pointing to their server,
    // steal the authorization code and exchange it for a token.
    // Fix: validate redirect_uri against the OAuthClient.redirectUris registered for client_id.
    if (!redirect_uri || !code_challenge) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing required parameters' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json({ error: 'unauthorized', error_description: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(token.value);
    if (!session) {
      return NextResponse.json({ error: 'unauthorized', error_description: 'Invalid session' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', error_description: 'User not found' }, { status: 401 });
    }

    const code = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // TODO [SECURITY - CRITICAL]: client_id is never validated against registered clients.
    // Any arbitrary string is accepted and stored, allowing impersonation of legitimate clients
    // and bypassing access control. Fix: look up client_id in OAuthClient collection and reject
    // unknown clients before creating the authorization code.
    await OAuthAuthCode.create({
      userId: user._id,
      code,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method || 'S256',
      redirectUri: redirect_uri,
      clientId: client_id,
      state,
      expiresAt,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return NextResponse.json({ redirect_to: redirectUrl.toString() });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
