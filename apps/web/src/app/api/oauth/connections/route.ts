import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, OAuthToken, OAuthClient } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token.value);
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Active (non-expired) tokens for this user
  const tokens = await OAuthToken.find({
    userId: user._id,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean() as any[];

  // Bulk-resolve client names
  const clientIds = Array.from(new Set(tokens.map(t => t.clientId).filter(Boolean)));
  const clients = clientIds.length
    ? (await OAuthClient.find({ clientId: { $in: clientIds } }).lean() as any[])
    : [];
  const nameByClientId = new Map(clients.map(c => [c.clientId, c.clientName]));

  const connections = tokens.map(t => ({
    _id: String(t._id),
    clientId: t.clientId || null,
    clientName: (t.clientId && nameByClientId.get(t.clientId)) || 'MCP Client',
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    lastUsedAt: t.lastUsedAt || null,
  }));

  return NextResponse.json({ connections });
}
