import { NextRequest, NextResponse } from 'next/server';
import { DentalRecord } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const body = await req.json();

    const record = await DentalRecord.findById(id).populate('patientId');
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // @ts-ignore
    if (record.patientId.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // TODO [SECURITY - CRITICAL]: Mass assignment — the entire request body is passed directly
    // to findByIdAndUpdate with no field whitelist. An attacker can overwrite any field,
    // including patientId (to reassign the record to a different patient), or inject
    // arbitrary MongoDB operators like $set/$unset affecting other documents.
    // Fix: explicitly pick only the fields that should be updatable, e.g.:
    //   const { date, notes, treatment, tooth } = body;
    //   await DentalRecord.findByIdAndUpdate(id, { date, notes, treatment, tooth }, { new: true });
    const updatedRecord = await DentalRecord.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json({ record: updatedRecord });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;

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
