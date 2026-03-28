
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User, Patient, ServiceRecord, Payment } from '@repo/database';
import PatientForm from '@/components/PatientForm';
import PatientHeader from '@/components/Patient/PatientHeader';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const { id } = await params;

  if (!token) redirect('/login');

  const session = await verifySession(token.value);
  if (!session) redirect('/login');

  const t = await getTranslations('Dashboard.Patients');
  let initialData = undefined;
  let debt = 0;

  if (id !== 'new') {
    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) redirect('/login');

    const patient = await Patient.findOne({ _id: id, userId: user._id });
    if (!patient) redirect('/dashboard/patients');

    // Calculate real balance: service record debt minus payments already made
    try {
      const [records, payments] = await Promise.all([
        ServiceRecord.find({ patientId: id }),
        Payment.find({ patientId: id }),
      ]);
      const totalDebt = records.reduce((acc: number, r: any) => acc + ((r.price || 0) - (r.paid || 0)), 0);
      const totalPaid = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
      debt = totalDebt - totalPaid;
    } catch (_) {}

    initialData = {
      _id: patient._id.toString(),
      name: patient.name,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      personalInfo: patient.personalInfo ? {
        dni: patient.personalInfo.dni,
        sex: patient.personalInfo.sex,
        age: patient.personalInfo.age,
        birthDate: patient.personalInfo.birthDate,
        maritalStatus: patient.personalInfo.maritalStatus,
        nationality: patient.personalInfo.nationality,
        address: patient.personalInfo.address,
        neighborhood: patient.personalInfo.neighborhood,
        profession: patient.personalInfo.profession,
      } : undefined,
      medicalCoverage: patient.medicalCoverage ? {
        name: patient.medicalCoverage.name,
        plan: patient.medicalCoverage.plan,
        affiliateNumber: patient.medicalCoverage.affiliateNumber,
        holderName: patient.medicalCoverage.holderName,
        holderWorkplace: patient.medicalCoverage.holderWorkplace,
      } : undefined,
      pathologies: patient.pathologies ? patient.pathologies.toObject() : undefined,
      odontogram: patient.odontogram ? patient.odontogram.map((item: any) => ({
        toothNumber: item.toothNumber,
        status: item.status,
        surfaces: item.surfaces ? {
          top: item.surfaces.top,
          bottom: item.surfaces.bottom,
          left: item.surfaces.left,
          right: item.surfaces.right,
          center: item.surfaces.center
        } : {},
        notes: item.notes
      })) : [],
      periodontogram: patient.periodontogram ? patient.periodontogram : {},
    };
  }

  return (
    <div className="h-full">
      {/* Header con info del paciente */}
      {id !== 'new' && initialData ? (
        <PatientHeader
          name={initialData.name}
          lastName={initialData.lastName}
          dni={initialData.personalInfo?.dni}
          phone={initialData.phone}
          debt={debt > 0 ? debt : undefined}
        />
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('add')}</h1>
        </div>
      )}

      <PatientForm initialData={initialData} />
    </div>
  );
}
