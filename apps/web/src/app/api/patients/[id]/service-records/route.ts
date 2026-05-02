import { NextRequest, NextResponse } from 'next/server';
import { Patient, ServiceRecord } from '@repo/database';
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

    const records = await ServiceRecord.find({ patientId }).sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching service records:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id: patientId } = await params;

    const body = await req.json();

    const patient = await Patient.findOne({ _id: patientId, userId: user._id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // TODO [SECURITY - CRITICAL]: Mass assignment — full request body spread into ServiceRecord.create
    // without field validation. An attacker can set arbitrary fields including userId, paid status,
    // price, or financial fields, corrupting billing data.
    // Fix: destructure only expected fields from body (service, date, price, notes, etc.).
    const record = await ServiceRecord.create({ patientId, ...body });
    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error creating service record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
