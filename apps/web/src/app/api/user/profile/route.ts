import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json({ error: 'Public ID is required' }, { status: 400 });
    }

    // Basic validation for slug format (alphanumeric + hyphens)
    if (!/^[a-z0-9-]+$/.test(publicId)) {
      return NextResponse.json({ error: 'Invalid ID format. Use lowercase letters, numbers, and hyphens.' }, { status: 400 });
    }

    await connectToDatabase();

    // Check uniqueness
    const existing = await User.findOne({ publicId, workosId: { $ne: session.id } });
    if (existing) {
      return NextResponse.json({ error: 'This ID is already taken.' }, { status: 409 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { workosId: session.id },
      { publicId },
      { new: true }
    );

    return NextResponse.json({ success: true, publicId: updatedUser.publicId });
  } catch (error) {
    console.error('Failed to update profile', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ publicId: user.publicId });
}
