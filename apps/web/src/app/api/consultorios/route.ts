import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Consultorio } from '@repo/database';

async function getUser(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const consultorios = await Consultorio.find({ userId: user._id }).sort({ name: 1 });
    return NextResponse.json({ consultorios });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { name, description, hourlyRate, color } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const consultorio = await Consultorio.create({
      userId: user._id, name, description, hourlyRate: hourlyRate || 0, color: color || '#6366f1',
    });
    return NextResponse.json({ consultorio });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
