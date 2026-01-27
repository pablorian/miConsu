import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // Verify user session
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify session (WorkOS user object has 'id', not 'userId')
  const session: any = await verifySession(token);
  if (!session || !session.id) {
    return NextResponse.redirect(new URL('/login', request.url));
  };

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    await connectToDatabase();

    // Update user using WorkOS ID
    await User.findOneAndUpdate(
      { workosId: session.id },
      {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarTokenExpiry: new Date(tokens.expiry_date || Date.now() + 3500 * 1000),
      }
    );

    // Redirect back to calendar dashboard
    return NextResponse.redirect(new URL('/dashboard/calendar', request.url));

  } catch (error) {
    console.error('Google Callback Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
