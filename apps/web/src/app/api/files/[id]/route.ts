import { NextRequest, NextResponse } from 'next/server';
import { PatientFile } from '@repo/database';
import { google } from 'googleapis';
import { requireUser } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

    const file = await PatientFile.findById(id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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

    try {
      await drive.files.delete({ fileId: file.fileId });
    } catch (driveError) {
      // Best-effort cleanup: file may already be deleted on Drive; continue with DB removal.
      console.error("Error deleting from drive (might already be deleted):", driveError);
    }

    await PatientFile.findByIdAndDelete(id);
    return NextResponse.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
