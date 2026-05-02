import { NextRequest, NextResponse } from 'next/server';
import { User } from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json({ timezone: user.timezone || 'America/Argentina/Buenos_Aires' });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const { timezone } = await request.json();
    if (!timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 });
    }

    await User.findByIdAndUpdate(user._id, { timezone });
    return NextResponse.json({ success: true, timezone });
  } catch (error) {
    console.error('Failed to update timezone', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
