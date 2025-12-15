import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import QRCodePackage from 'qrcode';
import connectToDatabase, { QRCode, User } from '@repo/database';
import { verifySession } from '@/lib/workos';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifySession(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const shortId = nanoid(8); // Generate short ID
    // Dynamic URL
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUrl = `${origin}/r/${shortId}`;

    const qrImage = await QRCodePackage.toDataURL(redirectUrl);

    await connectToDatabase();

    const newQR = await QRCode.create({
      userId: user.id || user.sub,
      url, // The final destination
      shortId,
      qrImage,
    });

    return NextResponse.json(newQR);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifySession(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const qrs = await QRCode.find({ userId: user.id || user.sub }).sort({ createdAt: -1 });

    return NextResponse.json(qrs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
