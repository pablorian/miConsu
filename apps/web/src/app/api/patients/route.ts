import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, Patient } from '@repo/database';

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
    // Assuming session has workosId and database User needs to be found to get _id
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Optional: search by DNI — returns single patient or null
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get('dni');
    if (dni) {
      const patient = await Patient.findOne({
        userId: user._id,
        'personalInfo.dni': dni.trim(),
      }).lean();
      return NextResponse.json({ patient: patient || null });
    }

    const patients = await Patient.find({ userId: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
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

    const { name, lastName, email, phone, personalInfo, medicalCoverage, pathologies, odontogram, periodontogram } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    // Handle duplicate key error 11000
    if ((error as any).code === 11000) {
      return NextResponse.json({ error: 'Patient with this email or phone already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
