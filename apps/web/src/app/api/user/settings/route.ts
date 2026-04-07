import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, UserSettings } from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  const session: any = await verifySession(token);
  if (!session?.id) return null;
  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id }).lean() as any;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await UserSettings.findOne({ userId: user._id }).lean() as any;

  return NextResponse.json({
    autoGenerateFichasObrasSociales: settings?.autoGenerateFichasObrasSociales ?? false,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { autoGenerateFichasObrasSociales } = body;

  const updated = await UserSettings.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        ...(typeof autoGenerateFichasObrasSociales === 'boolean' && { autoGenerateFichasObrasSociales }),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    autoGenerateFichasObrasSociales: updated.autoGenerateFichasObrasSociales,
  });
}
