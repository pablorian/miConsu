import { NextRequest, NextResponse } from 'next/server';
import { ServiceRecord } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const body = await req.json();

    const record = await ServiceRecord.findById(id).populate('patientId');
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // @ts-ignore
    if (record.patientId.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // TODO [SECURITY - CRITICAL]: Mass assignment — entire request body passed directly to
    // findByIdAndUpdate with no field whitelist. An attacker can overwrite any field including
    // financial data (price, paid, discount), patientId, or userId, corrupting records.
    // Fix: whitelist updatable fields explicitly before the update call.
    const updatedRecord = await ServiceRecord.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json({ record: updatedRecord });
  } catch (error) {
    console.error('Error updating service record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;

    const record = await ServiceRecord.findById(id).populate('patientId');
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // @ts-ignore
    if (record.patientId.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await ServiceRecord.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Error deleting service record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
