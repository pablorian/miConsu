import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User } from '@repo/database';

export type RequireUserResult =
  | { user: any; error: null }
  | { user: null; error: NextResponse };

export async function requireUser(): Promise<RequireUserResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const session = await verifySession(token.value);
  if (!session) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  await connectToDatabase();
  const user = await User.findOne({ workosId: (session as any).id });
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }
  return { user, error: null };
}
