import { NextRequest, NextResponse } from 'next/server';
import { workos, clientId, createSession } from '@/lib/workos';
import connectToDatabase, { User } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const errorDescription = request.nextUrl.searchParams.get('error_description');

  if (error || errorDescription) {
    return NextResponse.json({ error, errorDescription }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const { user } = await workos.userManagement.authenticateWithCode({
      clientId,
      code,
    });

    // Sync user to database
    await connectToDatabase();

    // Check if user exists, if not create them
    await User.findOneAndUpdate(
      { workosId: user.id },
      {
        workosId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = await createSession(user);

    const oauthPending = request.cookies.get('oauth_pending')?.value;

    // Build the redirect URL using the public host (devtunnel/prod) instead
    // of `request.nextUrl`, which falls back to the upstream `host` header
    // (`localhost:3000`) when behind a tunnel/proxy. Otherwise the user gets
    // bounced to localhost and loses the cookies set on the public domain.
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl =
      process.env.NEXT_PUBLIC_GOOGLE_WEBHOOK_URL ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin);

    let target: string;
    if (oauthPending) {
      target = `${baseUrl}/oauth/authorize${decodeURIComponent(oauthPending)}`;
    } else {
      target = `${baseUrl}/dashboard`;
    }

    const response = NextResponse.redirect(target);

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    if (oauthPending) {
      response.cookies.delete('oauth_pending');
    }

    return response;
  } catch (error) {
    console.error('Callback Error:', error);
    return NextResponse.json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
