import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/workos';
import TransactionsClient from '@/components/Balances/TransactionsClient';

export default async function TransactionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');
  const session = await verifySession(token.value);
  if (!session) redirect('/login');

  return <TransactionsClient />;
}
