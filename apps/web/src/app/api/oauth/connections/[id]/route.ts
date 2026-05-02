import { NextRequest, NextResponse } from 'next/server';
import { OAuthToken } from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await requireUser();
  if (error) return error;

  const result = await OAuthToken.findOneAndDelete({ _id: id, userId: user._id });
  if (!result) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
