import { NextRequest, NextResponse } from 'next/server';
import {
  Appointment,
  UserSettings,
  ServiceRecord,
  Patient,
  TaskBoard,
  Task,
} from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const FICHAS_STATUSES = [
  { name: 'Sin presentar', color: '#94a3b8', order: 0 },
  { name: 'Presentada',    color: '#6366f1', order: 1 },
  { name: 'Cobrada',       color: '#22c55e', order: 2 },
  { name: 'Rechazada',     color: '#ef4444', order: 3 },
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: { status: 'done' } },
      { new: true }
    );
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    let taskCreated = false;
    let task = null;

    const settings = await UserSettings.findOne({ userId: user._id }).lean() as any;
    if (settings?.autoGenerateFichasObrasSociales) {
      const sr = await ServiceRecord.findOne({ appointmentId: id }).lean() as any;

      if (sr) {
        const patient = await Patient.findById(sr.patientId).lean() as any;
        const obraSocial = patient?.medicalCoverage?.name || '';
        const patientName = patient
          ? `${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}`
          : appointment.patientName || 'Paciente';

        let board = await TaskBoard.findOne({ userId: user._id, isDefault: true }).lean() as any
                 || await TaskBoard.findOne({ userId: user._id }).lean() as any;
        if (!board) {
          const newBoard = new (TaskBoard as any)({
            userId: user._id,
            name: 'Fichas obra sociales',
            isDefault: true,
            statuses: FICHAS_STATUSES,
          });
          board = (await newBoard.save()).toObject();
        }

        const firstStatus = [...(board.statuses || [])]
          .sort((a: any, b: any) => a.order - b.order)[0];

        if (firstStatus) {
          const lastTask = await Task.findOne({ boardId: board._id, statusId: firstStatus._id.toString() })
            .sort({ order: -1 })
            .lean() as any;
          const nextOrder = lastTask ? lastTask.order + 1 : 0;

          const title = obraSocial ? `${patientName} — ${obraSocial}` : patientName;

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
