import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, OAuthToken } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token.value);
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const result = await OAuthToken.findOneAndDelete({ _id: id, userId: user._id });
  if (!result) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
