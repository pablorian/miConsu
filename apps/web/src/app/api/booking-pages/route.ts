import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Consultorio, BookingPage } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

/** GET /api/booking-pages — list all booking pages for the current user */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pages = await (BookingPage as any)
      .find({ userId: user._id })
      .sort({ createdAt: 1 })
      .lean();

    // Also fetch consultorios so the client can show names/colors
    const consultorios = await (Consultorio as any)
      .find({ userId: user._id }, { name: 1, color: 1 })
      .lean();

    return NextResponse.json({ pages, consultorios, publicId: user.publicId ?? null });
  } catch (e) {
    console.error('[GET /api/booking-pages]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** POST /api/booking-pages — create a new booking page */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      name,
      publicSlug,
      isEnabled,
      bookingTitle,
      slotDurationMinutes,
      workingHours,
      maxAdvanceDays,
      minAdvanceHours,
      bufferMinutes,
      maxBookingsPerDay,
      serviceTypes,
      syncToGoogleCalendar,
      googleCalendarId,
    } = body;

    if (!name || !publicSlug) {
      return NextResponse.json({ error: 'name y publicSlug son requeridos' }, { status: 400 });
    }

    // Check slug uniqueness per user (not globally)
    const slugClean = String(publicSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const conflict = await (BookingPage as any).findOne({ userId: user._id, publicSlug: slugClean });
    if (conflict) {
      return NextResponse.json({ error: 'Ya tenés una página con ese slug' }, { status: 409 });
    }

    const page = await (BookingPage as any).create({
      userId: user._id,
      name: name.trim(),
      publicSlug: slugClean,
      isEnabled:           isEnabled           ?? true,
      bookingTitle:        bookingTitle         ?? null,
      slotDurationMinutes: slotDurationMinutes  ?? 60,
      workingHours:        workingHours         ?? undefined,
      maxAdvanceDays:      maxAdvanceDays       ?? 60,
      minAdvanceHours:     minAdvanceHours      ?? 4,
      bufferMinutes:       bufferMinutes        ?? 0,
      maxBookingsPerDay:   maxBookingsPerDay    ?? 0,
      serviceTypes:        serviceTypes         ?? [],
      syncToGoogleCalendar: syncToGoogleCalendar ?? false,
      googleCalendarId:    googleCalendarId     ?? null,
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (e: any) {
    if (e.code === 11000) {
      return NextResponse.json({ error: 'Ya tenés una página con ese slug' }, { status: 409 });
    }
    console.error('[POST /api/booking-pages]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
