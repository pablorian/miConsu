import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ timezone: user.timezone || 'America/Argentina/Buenos_Aires' });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { timezone } = await request.json();

    if (!timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 });
    }

    await connectToDatabase();
    await User.findOneAndUpdate(
      { workosId: session.id },
      { timezone: timezone }
    );

    return NextResponse.json({ success: true, timezone });
  } catch (error) {
    console.error('Failed to update timezone', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
