import { NextRequest, NextResponse } from 'next/server';
import { User } from '@repo/database';
import { stopGoogleCalendarWebhook } from '@/lib/google-calendar-sync';
import { requireUser } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    await stopGoogleCalendarWebhook(user);

    await User.updateOne({ _id: user._id }, {
      $unset: {
        googleCalendarAccessToken: "",
        googleCalendarRefreshToken: "",
        googleCalendarTokenExpiry: "",
        googleCalendarSyncToken: "",
        googleChannelId: "",
        googleChannelResourceId: "",
        googleChannelExpiration: ""
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
