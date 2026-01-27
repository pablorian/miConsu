
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User } from '@repo/database';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

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

    return NextResponse.json({
      settings: user.calComSettings || { username: '', connected: false }
    });
  } catch (error) {
    console.error('Error fetching Cal.com settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(token.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await req.json();

    if (!username || typeof username !== 'string' || !username.trim()) {
      // Disconnecting or Invalid
      await connectToDatabase();
      await User.findOneAndUpdate(
        { workosId: (session as any).id },
        {
          $set: {
            'calComSettings.username': '',
            'calComSettings.connected': false
          }
        }
      );
      return NextResponse.json({ settings: { username: '', connected: false } });
    }

    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { workosId: (session as any).id },
      {
        $set: {
          'calComSettings.username': username.trim(),
          'calComSettings.connected': true
        }
      },
      { new: true }
    );

    return NextResponse.json({
      settings: user?.calComSettings || { username: '', connected: false }
    });
  } catch (error) {
    console.error('Error updating Cal.com settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
