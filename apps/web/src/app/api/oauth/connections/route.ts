import { NextRequest, NextResponse } from 'next/server';
import { OAuthToken, OAuthClient } from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const tokens = await OAuthToken.find({
    userId: user._id,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean() as any[];

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
