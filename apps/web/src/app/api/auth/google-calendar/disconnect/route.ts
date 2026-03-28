import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';
import { stopGoogleCalendarWebhook } from '@/lib/google-calendar-sync';

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: any = await verifySession(token);
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ workosId: session.id });
    if (user) {
      // First try to stop the webhook on Google's end
      await stopGoogleCalendarWebhook(user);

      // Now clear out everything from the DB
      user.googleCalendarAccessToken = undefined;
      user.googleCalendarRefreshToken = undefined;
      user.googleCalendarTokenExpiry = undefined;
      user.googleCalendarSyncToken = undefined;
      user.googleChannelId = undefined;
      user.googleChannelResourceId = undefined;
      user.googleChannelExpiration = undefined;

      // Type-safe unset bypass for Mongoose optional model fields via markModified or $unset
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
