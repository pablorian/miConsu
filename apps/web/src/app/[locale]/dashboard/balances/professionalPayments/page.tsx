import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import ProfessionalPaymentsClient from '@/components/Balances/ProfessionalPaymentsClient';

export default async function ProfessionalPaymentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');
  const session = await verifySession(token.value);
  if (!session) redirect('/login');
  return <ProfessionalPaymentsClient />;
}
