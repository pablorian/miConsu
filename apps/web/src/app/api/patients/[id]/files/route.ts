import { NextRequest, NextResponse } from 'next/server';
import { Patient, PatientFile } from '@repo/database';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id: patientId } = await params;

    const patient = await Patient.findOne({ _id: patientId, userId: user._id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const files = await PatientFile.find({ patientId }).sort({ createdAt: -1 });
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id: patientId } = await params;

    if (!user.googleCalendarAccessToken) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const patient = await Patient.findOne({ _id: patientId, userId: user._id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
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

    const getOrCreateFolder = async (name: string, parentId?: string) => {
      const escapedName = name.replace(/'/g, "\\'");
      const q = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;

      const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
      }

      const folderMetadata: any = { name, mimeType: 'application/vnd.google-apps.folder' };
      if (parentId) folderMetadata.parents = [parentId];

      const folder = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
      return folder.data.id;
    };

    const appFolderId = await getOrCreateFolder('MiConsu');
    const patientFolderId = await getOrCreateFolder(patient.name, appFolderId!);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type,
        parents: [patientFolderId!]
      },
      media: { mimeType: file.type, body: stream },
      fields: 'id, name, webViewLink, iconLink, mimeType'
    });

    const uploadedFile = driveResponse.data;

    const patientFile = await PatientFile.create({
      patientId,
      userId: user._id,
      fileId: uploadedFile.id,
      name: uploadedFile.name,
      mimeType: uploadedFile.mimeType,
      webViewLink: uploadedFile.webViewLink,
      iconLink: uploadedFile.iconLink,
    });

    return NextResponse.json({ file: patientFile });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    if (error.code === 401 || (error.response && error.response.status === 401)) {
      return NextResponse.json({ error: 'Google Auth Expired. Please reconnect.' }, { status: 401 });
    }
    // TODO [SECURITY - HIGH]: Error message disclosure — error.message concatenated into the
    // response body exposes internal Google API error details, stack hints, file paths, or
    // auth token fragments to the client. Always return a generic message to end users.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
