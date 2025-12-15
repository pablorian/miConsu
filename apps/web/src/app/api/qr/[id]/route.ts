import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase, { QRCode, Scan } from '@repo/database';
import { verifySession } from '@/lib/workos';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifySession(token) as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const qr = await QRCode.findOne({ _id: id, userId: user.id || user.sub });

    if (!qr) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    const scans = await Scan.find({ qrCodeId: qr._id }).sort({ createdAt: -1 });

    return NextResponse.json({ qr, scans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifySession(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await connectToDatabase();

    // Verify ownership and delete
    const result = await QRCode.findOneAndDelete({
      _id: id,
      userId: user.id || user.sub,
    });

    if (!result) {
      return NextResponse.json({ error: 'QR Code not found or unauthorized' }, { status: 404 });
    }

    // Optional: Delete associated scans to clean up
    await Scan.deleteMany({ qrCodeId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
