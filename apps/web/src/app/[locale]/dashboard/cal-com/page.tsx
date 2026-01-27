
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User } from '@repo/database';
import CalComIntegration from '@/components/CalComIntegration';
import { getTranslations } from 'next-intl/server';

export default async function CalComPage() {
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
  const user = await User.findOne({ workosId: session.workosId });

  const initialSettings = user?.calComSettings || { username: '', connected: false };
  const t = await getTranslations('CalCom');

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex-1">
        <CalComIntegration initialSettings={initialSettings} />
      </div>
    </div>
  );
}
