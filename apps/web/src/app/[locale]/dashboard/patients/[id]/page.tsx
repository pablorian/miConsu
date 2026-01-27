
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User, Patient } from '@repo/database';
import PatientForm from '@/components/PatientForm';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const { id } = await params;

  if (!token) {
    redirect('/login');
  }

  const session = await verifySession(token.value);
  if (!session) {
    redirect('/login');
  }

  const t = await getTranslations('Dashboard.Patients');
  let initialData = undefined;

  if (id !== 'new') {
    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      redirect('/login');
    }
    const patient = await Patient.findOne({ _id: id, userId: user._id });

    if (!patient) {
      redirect('/dashboard/patients');
    }

    initialData = {
      _id: patient._id.toString(),
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      personalInfo: patient.personalInfo ? {
        dni: patient.personalInfo.dni,
        age: patient.personalInfo.age,
        birthDate: patient.personalInfo.birthDate,
        maritalStatus: patient.personalInfo.maritalStatus,
        nationality: patient.personalInfo.nationality,
        address: patient.personalInfo.address,
        neighborhood: patient.personalInfo.neighborhood,
        profession: patient.personalInfo.profession,
      } : undefined,
      medicalCoverage: patient.medicalCoverage ? {
        plan: patient.medicalCoverage.plan,
        affiliateNumber: patient.medicalCoverage.affiliateNumber,
        holderName: patient.medicalCoverage.holderName,
        holderWorkplace: patient.medicalCoverage.holderWorkplace,
      } : undefined,
      pathologies: patient.pathologies ? {
        diabetes: patient.pathologies.diabetes,
        hiv: patient.pathologies.hiv,
        allergies: patient.pathologies.allergies,
        rheumaticFever: patient.pathologies.rheumaticFever,
        heartProblems: patient.pathologies.heartProblems,
        pacemaker: patient.pathologies.pacemaker,
        hypertension: patient.pathologies.hypertension,
        kidneyProblems: patient.pathologies.kidneyProblems,
        tuberculosis: patient.pathologies.tuberculosis,
        chagas: patient.pathologies.chagas,
        hepatitis: patient.pathologies.hepatitis,
        venerealDiseases: patient.pathologies.venerealDiseases,
        gastritis: patient.pathologies.gastritis,
        eatingDisorders: patient.pathologies.eatingDisorders,
        bloodDisorders: patient.pathologies.bloodDisorders,
        bloodTransfusion: patient.pathologies.bloodTransfusion,
        chemotherapy: patient.pathologies.chemotherapy,
        radiotherapy: patient.pathologies.radiotherapy,
        thyroid: patient.pathologies.thyroid,
        other: patient.pathologies.other,
        smokes: patient.pathologies.smokes,
        drinksAlcohol: patient.pathologies.drinksAlcohol,
        bruxism: patient.pathologies.bruxism,
        observations: patient.pathologies.observations,
      } : undefined,
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
      })) : []
    };
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {id === 'new' ? t('add') : t('edit')}
        </h1>
      </div>

      <PatientForm initialData={initialData} />
    </div>
  );
}
