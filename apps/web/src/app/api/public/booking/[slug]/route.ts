import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { BookingPage, Consultorio } from '@repo/database';

/**
 * GET /api/public/booking/[slug]
 * Returns public info for a booking page. No auth required.
 * Looks up BookingPage by publicSlug first; falls back to legacy Consultorio.publicSlug.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    // ── New path: BookingPage ──────────────────────────────────────────────────
    const bp = await (BookingPage as any)
      .findOne({ publicSlug: slug, isEnabled: true })
      .lean();

    if (bp) {
      // Fetch the consultorio for color/name fallback
      const consultorio = await (Consultorio as any)
        .findById(bp.consultorioId, { name: 1, color: 1, description: 1 })
        .lean();

      return NextResponse.json({
        consultorio: {
          _id:                 bp._id,
          name:                consultorio?.name  || bp.name,
          description:         consultorio?.description || '',
          color:               consultorio?.color || '#6366f1',
          bookingTitle:        bp.bookingTitle || null,
          slotDurationMinutes: bp.slotDurationMinutes ?? 60,
          workingHours:        bp.workingHours ?? {},
          serviceTypes:        bp.serviceTypes ?? [],
          maxAdvanceDays:      bp.maxAdvanceDays  ?? 60,
          minAdvanceHours:     bp.minAdvanceHours ?? 4,
          bufferMinutes:       bp.bufferMinutes   ?? 0,
          maxBookingsPerDay:   bp.maxBookingsPerDay ?? 0,
          // Used by slots/book APIs to reference the right calendar
          _bookingPageId:      bp._id,
          _consultorioId:      bp.consultorioId,
        },
      });
    }

    // ── Legacy fallback: Consultorio with publicSlug ───────────────────────────
    const consultorio = await (Consultorio as any)
      .findOne({ publicSlug: slug, bookingEnabled: true })
      .lean();

    if (!consultorio) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      consultorio: {
        _id:                  consultorio._id,
        name:                 consultorio.name,
        description:          consultorio.description || '',
        color:                consultorio.color,
        bookingTitle:         consultorio.bookingTitle || null,
        slotDurationMinutes:  consultorio.slotDurationMinutes ?? 60,
        workingHours:         consultorio.workingHours ?? {},
        serviceTypes:         consultorio.serviceTypes ?? [],
        maxAdvanceDays:       consultorio.maxAdvanceDays  ?? 60,
        minAdvanceHours:      consultorio.minAdvanceHours ?? 4,
        bufferMinutes:        consultorio.bufferMinutes   ?? 0,
        maxBookingsPerDay:    consultorio.maxBookingsPerDay ?? 0,
        _consultorioId:       consultorio._id,
      },
    });
  } catch (e) {
    console.error('[public/booking/slug]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
