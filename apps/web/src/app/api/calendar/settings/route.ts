import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Convert DB Array to API Object (Dictionary)
  // DB: [{ calendarId: 'a', visible: true }, { calendarId: 'b', visible: false }]
  // API: { 'a': { visible: true, isPublic: false, publicSlug: 'slug' }, ... }
  const calendars: Record<string, { visible: boolean; isPublic: boolean; publicSlug: string }> = {};
  if (user.calendarPreferences?.calendars) {
    user.calendarPreferences.calendars.forEach((cal: any) => {
      calendars[cal.calendarId] = {
        visible: cal.visible,
        isPublic: cal.isPublic || false,
        publicSlug: cal.publicSlug || ''
      };
    });
  }

  return NextResponse.json({
    timezone: user.timezone || 'America/Argentina/Buenos_Aires',
    view: user.calendarPreferences?.view || 'week',
    calendars: calendars,
    publicId: user.publicId
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    await connectToDatabase();

    const user = await User.findOne({ workosId: session.id });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (body.timezone) user.timezone = body.timezone;

    if (!user.calendarPreferences) {
      user.calendarPreferences = { view: 'week', calendars: [] };
    }

    if (body.view !== undefined) {
      user.calendarPreferences.view = body.view;
    }

    // Handle dictionary updates by syncing array
    if (body.calendars) {
      if (!user.calendarPreferences.calendars) {
        user.calendarPreferences.calendars = [];
      }

      // We are receiving a partial dictionary: { "cal_id": { visible: true }, ... }
      // We need to update the matching item in the array or add it.
      Object.keys(body.calendars).forEach(calId => {
        const settings = body.calendars[calId];

        const existingIndex = user.calendarPreferences.calendars.findIndex((c: any) => c.calendarId === calId);

        if (existingIndex > -1) {
          // Update existing
          if (settings.visible !== undefined) user.calendarPreferences.calendars[existingIndex].visible = settings.visible;
          if (settings.isPublic !== undefined) user.calendarPreferences.calendars[existingIndex].isPublic = settings.isPublic;
          if (settings.publicSlug !== undefined) user.calendarPreferences.calendars[existingIndex].publicSlug = settings.publicSlug;
        } else {
          // Add new
          user.calendarPreferences.calendars.push({
            calendarId: calId,
            visible: settings.visible !== undefined ? settings.visible : true,
            isPublic: settings.isPublic || false,
            publicSlug: settings.publicSlug || ''
          });
        }
      });
    }

    await user.save();

    // Convert back to dict for response
    const calendars: Record<string, any> = {};
    if (user.calendarPreferences?.calendars) {
      user.calendarPreferences.calendars.forEach((cal: any) => {
        calendars[cal.calendarId] = {
          visible: cal.visible,
          isPublic: cal.isPublic || false,
          publicSlug: cal.publicSlug || ''
        };
      });
    }

    return NextResponse.json({
      success: true,
      timezone: user.timezone,
      view: user.calendarPreferences?.view,
      calendars: calendars
    });
  } catch (error) {
    console.error('Failed to update calendar settings', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
