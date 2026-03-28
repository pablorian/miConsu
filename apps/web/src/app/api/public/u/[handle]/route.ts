import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, BookingPage } from '@repo/database';

/**
 * GET /api/public/u/[handle]
 * Returns the public profile and all enabled booking pages for a user.
 * No auth required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    await connectToDatabase();

    const user = await (User as any)
      .findOne({ publicId: handle }, { firstName: 1, lastName: 1, profilePictureUrl: 1, publicId: 1 })
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const pages = await (BookingPage as any)
      .find({ userId: user._id, isEnabled: true })
      .select({ name: 1, publicSlug: 1, bookingTitle: 1, serviceTypes: 1, slotDurationMinutes: 1 })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      profile: {
        handle:            user.publicId,
        firstName:         user.firstName || '',
        lastName:          user.lastName  || '',
        displayName:       [user.firstName, user.lastName].filter(Boolean).join(' ') || handle,
        profilePictureUrl: user.profilePictureUrl || null,
      },
      pages: pages.map((p: any) => ({
        _id:                p._id,
        name:               p.name,
        publicSlug:         p.publicSlug,
        bookingTitle:       p.bookingTitle || null,
        slotDurationMinutes: p.slotDurationMinutes ?? 60,
        serviceCount:       (p.serviceTypes ?? []).length,
      })),
    });
  } catch (e) {
    console.error('[GET /api/public/u/:handle]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
