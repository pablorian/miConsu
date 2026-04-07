import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, PrestacionTemplate } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

/** GET /api/prestaciones — list all templates for the current user */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const items = await (PrestacionTemplate as any)
      .find({ userId: user._id })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[GET /api/prestaciones]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** POST /api/prestaciones — create a new template */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, price, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const item = await (PrestacionTemplate as any).create({
      userId: user._id,
      name: name.trim(),
      price: Number(price) || 0,
      description: description?.trim() || '',
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/prestaciones]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
