import { NextRequest, NextResponse } from 'next/server';
import { User } from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json({ error: 'Public ID is required' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(publicId)) {
      return NextResponse.json({ error: 'Invalid ID format. Use lowercase letters, numbers, and hyphens.' }, { status: 400 });
    }

    const existing = await User.findOne({ publicId, _id: { $ne: user._id } });
    if (existing) {
      return NextResponse.json({ error: 'This ID is already taken.' }, { status: 409 });
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, { publicId }, { new: true });

    return NextResponse.json({ success: true, publicId: updatedUser.publicId });
  } catch (error) {
    console.error('Failed to update profile', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json({ publicId: user.publicId });
}
