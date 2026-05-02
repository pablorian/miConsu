import { NextRequest, NextResponse } from 'next/server';
import { Appointment, Patient } from '@repo/database';
import { requireUser } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/appointments/[id]/match
 * Links an unmatched appointment (solicitud) to a patient.
 *   - action: 'link'   → link to existing patient { patientId }
 *   - action: 'create' → create new patient from appointment data, then link
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const { action, patientId } = body;

    const appointment = await (Appointment as any).findOne({ _id: id, userId: user._id });
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    if (action === 'link') {
      if (!patientId) return NextResponse.json({ error: 'patientId required for link action' }, { status: 400 });

      const patient = await (Patient as any).findOne({ _id: patientId, userId: user._id });
      if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

      appointment.patientId = patient._id;
      await appointment.save();

      return NextResponse.json({ success: true, patientId: patient._id });
    }

    if (action === 'create') {
      const { name, lastName, email, phone } = body;

      if (!name) return NextResponse.json({ error: 'name is required to create patient' }, { status: 400 });

      const newPatient = await (Patient as any).create({
        userId: user._id,
        name: name || appointment.patientName || '',
        lastName: lastName || '',
        email: email || appointment.patientEmail || '',
        phone: phone || appointment.patientPhone || '',
      });

      appointment.patientId = newPatient._id;
      await appointment.save();

      return NextResponse.json({ success: true, patientId: newPatient._id, patient: newPatient });
    }

    return NextResponse.json({ error: 'Invalid action. Use "link" or "create"' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
