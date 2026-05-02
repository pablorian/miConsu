import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, OAuthClient } from '@repo/database';
import { OAuthAuthCode } from '@repo/database';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = body;

    if (!client_id || !redirect_uri || !code_challenge) {
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

    const oauthClient = await OAuthClient.findOne({ clientId: client_id });
    if (!oauthClient) {
      return NextResponse.json({ error: 'invalid_client', error_description: 'Cliente no registrado' }, { status: 400 });
    }

    if (!oauthClient.redirectUris.includes(redirect_uri)) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri no autorizada para este cliente' }, { status: 400 });
    }

    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', error_description: 'User not found' }, { status: 401 });
    }

    const code = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
