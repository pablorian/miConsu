import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, PatientFile } from '@repo/database';
import { google } from 'googleapis';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    const { id } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(token.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const file = await PatientFile.findById(id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Connect to Drive
    if (!user.googleCalendarAccessToken) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Delete from Drive
    try {
      await drive.files.delete({
        fileId: file.fileId
      });
    } catch (driveError) {
      console.error("Error deleting from drive (might already be deleted):", driveError);
      // Continue to delete from DB even if drive fails? 
      // Best effort: if 404, proceed. If 403/401, maybe stop.
    }

    // Delete from DB
    await PatientFile.findByIdAndDelete(id);

    return NextResponse.json({ message: 'File deleted' });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
