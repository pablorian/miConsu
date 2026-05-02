import { NextRequest, NextResponse } from 'next/server';
import { Patient } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

    const patient = await Patient.findOne({ _id: id, userId: user._id });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

    const { name, lastName, email, phone, personalInfo, medicalCoverage, pathologies, odontogram, periodontogram } = await req.json();

    const patient = await Patient.findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        name,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        personalInfo,
        medicalCoverage,
        pathologies,
        odontogram,
        periodontogram,
      },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    if ((error as any).code === 11000) {
      return NextResponse.json({ error: 'Patient with this email or phone already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

    const patient = await Patient.findOneAndDelete({ _id: id, userId: user._id });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
