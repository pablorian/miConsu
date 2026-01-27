import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, DentalRecord } from '@repo/database';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure the record belongs to a patient owned by this user
    // We need to populate patient or fetch it separately to check ownership
    // For optimization, we can assume if we have the ID and the patient owns the record... 
    // Best practice: Find record, check if its patient belongs to user.

    // Aggregate or double query
    const record = await DentalRecord.findById(id).populate('patientId');
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // @ts-ignore
    if (record.patientId.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedRecord = await DentalRecord.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json({ record: updatedRecord });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

    const record = await DentalRecord.findById(id).populate('patientId');
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // @ts-ignore
    if (record.patientId.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await DentalRecord.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Record deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
