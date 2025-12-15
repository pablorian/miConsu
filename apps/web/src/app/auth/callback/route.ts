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

    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';

    const response = NextResponse.redirect(url);

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Callback Error:', error);
    return NextResponse.json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
