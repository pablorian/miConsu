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

    const { name, email, phone, personalInfo, medicalCoverage, pathologies, odontogram } = await req.json();

    console.log('API POST /patients body:', { name, odontogramLength: odontogram?.length, odontogramSample: odontogram?.[0] });

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check optional unique constraints manually if needed, or rely on db index errors
    // Assuming simple creation for now.

    const patient = await Patient.create({
      userId: user._id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      personalInfo,
      medicalCoverage,
      pathologies,
      odontogram
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
