
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User, Patient, ServiceRecord } from '@repo/database';
import PatientList from '@/components/PatientList';

export default async function PatientsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (!token) redirect('/login');

  const session = await verifySession(token.value);
  if (!session) redirect('/login');

  await connectToDatabase();
  const user = await User.findOne({ workosId: (session as any).id });
  if (!user) redirect('/login');

  const patients = await Patient.find({ userId: user._id }).sort({ lastName: 1, name: 1 });

  // Get last service record date per patient via aggregation
  const patientIds = patients.map((p: any) => p._id);
  const lastAttended = await (ServiceRecord as any).aggregate([
    { $match: { patientId: { $in: patientIds } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$patientId', lastDate: { $first: '$date' } } },
  ]);
  const lastAttendedMap: Record<string, Date> = {};
  lastAttended.forEach((entry: any) => {
    lastAttendedMap[entry._id.toString()] = entry.lastDate;
  });

  const serializedPatients = patients.map((p: any) => ({
    _id: p._id.toString(),
    name: p.name || '',
    lastName: p.lastName || '',
    email: p.email || '',
    phone: p.phone || '',
    dni: p.personalInfo?.dni || '',
    lastAttendedDate: lastAttendedMap[p._id.toString()]?.toISOString() || null,
  }));

  return (
    <div className="h-full flex flex-col">
      <PatientList patients={serializedPatients} />
    </div>
  );
}
