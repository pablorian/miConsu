import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase, { User, Professional } from '@repo/database';
import AllPaymentsClient from '@/components/Balances/AllPaymentsClient';

async function getProfessionals(userId: string) {
  await connectToDatabase();
  return Professional.find({ userId }).sort({ name: 1 }).lean();
}

export default async function AllPaymentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');
  const session = await verifySession(token.value) as any;
  if (!session) redirect('/login');
  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id }).lean() as any;
  if (!user) redirect('/login');

  const professionals = await getProfessionals(user._id.toString());
  const serialized = professionals.map((p: any) => ({
    _id: p._id.toString(),
    name: p.name,
    color: p.color,
  }));

  return <AllPaymentsClient professionals={serialized} />;
}
