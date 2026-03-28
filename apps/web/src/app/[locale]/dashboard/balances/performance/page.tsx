import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import PerformanceClient from '@/components/Balances/PerformanceClient';

export default async function PerformancePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');
  const session = await verifySession(token.value);
  if (!session) redirect('/login');

  return <PerformanceClient />;
}
