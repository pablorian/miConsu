import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, BookingPage } from '@repo/database';

/**
 * GET /api/public/u/[handle]/[slug]
 * Returns public info for a specific booking page scoped to a user handle.
 * No auth required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string }> },
) {
  try {
    const { handle, slug } = await params;
    await connectToDatabase();

    const user = await (User as any)
      .findOne({ publicId: handle }, { _id: 1, firstName: 1, lastName: 1 })
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const bp = await (BookingPage as any)
      .findOne({ userId: user._id, publicSlug: slug, isEnabled: true })
      .lean();

    if (!bp) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || handle;

    return NextResponse.json({
      consultorio: {
        _id:                 bp._id,
        name:                displayName,
        description:         '',
        color:               '#6366f1',
        bookingTitle:        bp.bookingTitle || null,
        slotDurationMinutes: bp.slotDurationMinutes ?? 60,
        workingHours:        bp.workingHours ?? {},
        serviceTypes:        bp.serviceTypes ?? [],
        maxAdvanceDays:      bp.maxAdvanceDays  ?? 60,
        minAdvanceHours:     bp.minAdvanceHours ?? 4,
        bufferMinutes:       bp.bufferMinutes   ?? 0,
        maxBookingsPerDay:   bp.maxBookingsPerDay ?? 0,
        _bookingPageId:      bp._id,
        _userId:             user._id,
        _handle:             handle,
        _slug:               slug,
      },
    });
  } catch (e) {
    console.error('[GET /api/public/u/:handle/:slug]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
