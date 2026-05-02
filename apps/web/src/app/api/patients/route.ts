import { NextRequest, NextResponse } from 'next/server';
import { Patient } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const dni = searchParams.get('dni');
    if (dni) {
      const patient = await Patient.findOne({
        userId: user._id,
        'personalInfo.dni': dni.trim(),
      }).lean();
      return NextResponse.json({ patient: patient || null });
    }

    // TODO [SECURITY - MEDIUM]: No pagination or result limit. A user with thousands of
    // patients will return a massive payload, potentially causing memory exhaustion and DoS.
    // Fix: add .limit() or support cursor-based pagination via ?page=&limit= query params.
    const patients = await Patient.find({ userId: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { name, lastName, email, phone, personalInfo, medicalCoverage, pathologies, odontogram, periodontogram } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const patient = await Patient.create({
      userId: user._id,
      name,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      personalInfo,
      medicalCoverage,
      pathologies,
      odontogram,
      periodontogram,
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error creating patient:', error);
    if ((error as any).code === 11000) {
      return NextResponse.json({ error: 'Patient with this email or phone already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
