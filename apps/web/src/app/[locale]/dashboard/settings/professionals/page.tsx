import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import ProfessionalsSettings from '@/components/Settings/ProfessionalsSettings';

export default async function ProfessionalsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');
  const session = await verifySession(token.value);
  if (!session) redirect('/login');

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración · Profesionales</h1>
      </div>
      <ProfessionalsSettings />
    </div>
  );
}
