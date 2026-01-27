import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, Patient, PatientFile } from '@repo/database';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    const { id: patientId } = await params;

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
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    const { id: patientId } = await params;

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

    // Check for Google Token
    if (!user.googleCalendarAccessToken) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Need patient details for folder name
    const patient = await Patient.findOne({ _id: patientId, userId: user._id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Setup Google Auth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken
    });

    // Create Drive Service
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Helper to get or create folder
    const getOrCreateFolder = async (name: string, parentId?: string) => {
      // Escape single quotes in name for query
      const escapedName = name.replace(/'/g, "\\'");
      const q = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;

      const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
      }

      const folderMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentId) {
        folderMetadata.parents = [parentId];
      }

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      return folder.data.id;
    };

    // 1. Get or Create App Root Folder "MiConsu"
    const appFolderId = await getOrCreateFolder('MiConsu');

    // 2. Get or Create Patient Folder
    const patientFolderId = await getOrCreateFolder(patient.name, appFolderId!);

    // Stream the file
    // Convert File to Buffer/Stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type,
        parents: [patientFolderId!] // Upload to patient folder
      },
      media: {
        mimeType: file.type,
        body: stream
      },
      fields: 'id, name, webViewLink, iconLink, mimeType'
    });

    const uploadedFile = driveResponse.data;

    // Save metadata to DB
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
    return NextResponse.json({ error: 'Internal Server Error' + error.message }, { status: 500 });
  }
}
