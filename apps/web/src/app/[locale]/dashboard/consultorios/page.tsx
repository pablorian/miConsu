import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User } from '@repo/database';
import ConsultoriosClient from '@/components/Consultorios/ConsultoriosClient';

async function getIsGoogleConnected(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return false;
    const session = await verifySession(token.value);
    if (!session) return false;
    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id }).lean();
    return !!(user as any)?.googleCalendarRefreshToken;
  } catch {
    return false;
  }
}

export default async function ConsultoriosPage() {
  const isGoogleConnected = await getIsGoogleConnected();

  return (
    <div className="p-6 h-full flex flex-col">
      <ConsultoriosClient isGoogleConnected={isGoogleConnected} />
    </div>
  );
}
