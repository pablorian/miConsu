
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User, Patient } from '@repo/database';
import PatientList from '@/components/PatientList';
import { getTranslations } from 'next-intl/server';

export default async function PatientsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (!token) {
    redirect('/login');
  }

  const session = await verifySession(token.value);
  if (!session) {
    redirect('/login');
  }

  await connectToDatabase();
  const user = await User.findOne({ workosId: (session as any).id });
  if (!user) {
    redirect('/login');
  }

  const patients = await Patient.find({ userId: user._id }).sort({ createdAt: -1 });
  const t = await getTranslations('Dashboard.Patients');

  // Serialize Mongoose documents to plain objects
  const serializedPatients = patients.map(p => ({
    _id: p._id.toString(),
    name: p.name,
    email: p.email,
    phone: p.phone
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        </div>
        <Link
          href="/dashboard/patients/new"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {t('add')}
        </Link>
      </div>

      <PatientList patients={serializedPatients} />
    </div>
  );
}
