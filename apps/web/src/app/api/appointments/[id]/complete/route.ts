import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Appointment,
  User,
  UserSettings,
  ServiceRecord,
  Patient,
  TaskBoard,
  Task,
} from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session: any = await verifySession(token);
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const user = await User.findOne({ workosId: session.id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // ── 1. Mark appointment as done ────────────────────────────────────────
    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: { status: 'done' } },
      { new: true }
    );
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    let taskCreated = false;
    let task = null;

    // ── 2. Auto-create ficha task if the setting is enabled ─────────────────
    const settings = await UserSettings.findOne({ userId: user._id }).lean() as any;
    if (settings?.autoGenerateFichasObrasSociales) {
      // Get the service record linked to this appointment
      const sr = await ServiceRecord.findOne({ appointmentId: id }).lean() as any;

      if (sr) {
        // Get patient to retrieve obra social
        const patient = await Patient.findById(sr.patientId).lean() as any;
        const obraSocial = patient?.medicalCoverage?.name || '';
        const patientName = patient
          ? `${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}`
          : appointment.patientName || 'Paciente';

        // Find (or auto-create) the "Fichas obra sociales" board
        let board = await TaskBoard.findOne({ userId: user._id, isDefault: true }).lean() as any;
        if (!board) {
          board = await TaskBoard.findOne({ userId: user._id }).lean() as any;
        }
        if (!board) {
          // Create the default board if somehow missing
          const newBoard = new (TaskBoard as any)({
            userId: user._id,
            name: 'Fichas obra sociales',
            isDefault: true,
            statuses: [
              { name: 'Sin presentar', color: '#94a3b8', order: 0 },
              { name: 'Presentada',    color: '#6366f1', order: 1 },
              { name: 'Cobrada',       color: '#22c55e', order: 2 },
              { name: 'Rechazada',     color: '#ef4444', order: 3 },
            ],
          });
          board = await newBoard.save();
          board = board.toObject();
        }

        // Get first status (lowest order)
        const firstStatus = [...(board.statuses || [])]
          .sort((a: any, b: any) => a.order - b.order)[0];

        if (firstStatus) {
          // Compute next order within that status
          const lastTask = await Task.findOne({ boardId: board._id, statusId: firstStatus._id.toString() })
            .sort({ order: -1 })
            .lean() as any;
          const nextOrder = lastTask ? lastTask.order + 1 : 0;

          const title = obraSocial
            ? `${patientName} — ${obraSocial}`
            : patientName;

          task = await Task.create({
            userId: user._id,
            boardId: board._id,
            title,
            statusId: firstStatus._id.toString(),
            priority: 'none',
            order: nextOrder,
            patientId: patient?._id || null,
            patientName,
            prestacion: sr.service || '',
            obraSocial,
            sourceAppointmentId: appointment._id,
            sourceServiceRecordId: sr._id,
          });
          taskCreated = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      appointmentStatus: 'done',
      taskCreated,
      task: task ? { _id: task._id, title: task.title } : null,
    });
  } catch (error) {
    console.error('Error completing appointment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
