import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase, { OAuthClient } from '@repo/database';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * RFC 7591 — Dynamic Client Registration
 *
 * Returns a fresh client_id for any incoming request and persists the client
 * (with its declared name) so we can later show users which apps have
 * connected to their account.
 */
// TODO [SECURITY - HIGH]: No rate limiting on dynamic client registration. An attacker can
// register unlimited clients, polluting the OAuthClient collection and causing storage DoS.
// Fix: add IP-based rate limiting (e.g. 5 registrations/hour per IP).
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const clientId = `mcp_${crypto.randomBytes(16).toString('hex')}`;
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((uri: unknown) => typeof uri === 'string' && isValidRedirectUri(uri))
    : [];
  const clientName = body.client_name || 'MCP Client';

  // Persist so we can show a friendly client name in the user's connections list.
  try {
    await connectToDatabase();
    await OAuthClient.create({ clientId, clientName, redirectUris });
  } catch (err) {
    console.error('[oauth/register] failed to persist client:', err);
    // Non-fatal — registration still succeeds, but the connection list may
    // show a generic name for this client.
  }

  return NextResponse.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    client_name: body.client_name || 'MCP Client',
  }, { status: 201, headers: CORS_HEADERS });
}
