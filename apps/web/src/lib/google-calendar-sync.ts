import { google, calendar_v3 } from 'googleapis';
import { User, IUser } from '@repo/database';

/** Returns a configured OAuth2 client with the user's stored tokens. */
export const getGoogleAuthClient = (user: IUser) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  );

  oauth2Client.setCredentials({
    access_token:  user.googleCalendarAccessToken,
    refresh_token: user.googleCalendarRefreshToken,
    expiry_date:   user.googleCalendarTokenExpiry ? user.googleCalendarTokenExpiry.getTime() : undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) user.googleCalendarRefreshToken = tokens.refresh_token;
    user.googleCalendarAccessToken = tokens.access_token || undefined;
    if (tokens.expiry_date) user.googleCalendarTokenExpiry = new Date(tokens.expiry_date);
    await user.save();
  });

  return oauth2Client;
};

export const getGoogleCalendarClient = (user: IUser) => {
  return google.calendar({ version: 'v3', auth: getGoogleAuthClient(user) });
};

export const registerGoogleCalendarWebhook = async (user: IUser) => {
  if (!user.googleCalendarRefreshToken) {
    return false;
  }

  const calendar = getGoogleCalendarClient(user);
  
  // We need a unique channel ID
  const channelId = `webhook-${user._id}-${Date.now()}`;
  
  try {
    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_GOOGLE_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhook/google-calendar`,
      }
    });

    user.googleChannelId = channelId;
    if (response.data.resourceId) {
      user.googleChannelResourceId = response.data.resourceId;
    }
    if (response.data.expiration) {
      user.googleChannelExpiration = response.data.expiration;
    }
    await user.save();
    console.log(`[Webhook Registration] Successfully registered channel ${channelId} for user ${user.email}`);
    return true;
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      console.error('[Webhook Registration] Mongoose Validation Error:', error.message);
    } else {
      console.error('[Webhook Registration] Failed to register Google Calendar webhook:', error.response?.data || error.message || error);
    }
    return false;
  }
};

export const stopGoogleCalendarWebhook = async (user: IUser) => {
  if (!user.googleCalendarRefreshToken || !user.googleChannelId) {
    return false;
  }

  const calendar = getGoogleCalendarClient(user);

  try {
    await calendar.channels.stop({
      requestBody: {
        id: user.googleChannelId,
        resourceId: user.googleChannelResourceId || user.googleCalendarSyncToken, // Needs exact resourceId from watch response
      }
    });
    console.log(`[Webhook Registration] Successfully stopped channel ${user.googleChannelId} for user ${user.email}`);
    return true;
  } catch (error: any) {
    console.error(`[Webhook Registration] Failed to stop Google Calendar webhook for channel ${user.googleChannelId}:`, error.response?.data || error.message || error);
    // Even if it fails on Google's side (e.g., already expired), we still want to proceed with local cleanup.
    return false;
  }
};
