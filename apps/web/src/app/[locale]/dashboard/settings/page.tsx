import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';
import connectToDatabase from '@repo/database';
import { User } from '@repo/database';
import CalComIntegration from '@/components/CalComIntegration';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
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
  const user = await User.findOne({ workosId: session.id }).lean();

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">User Not Found</h1>
        <p>We could not find your user profile in our database.</p>
        <p className="text-sm text-gray-500 mt-2">WorkOS ID: {session.id}</p>
        <a href="/api/auth/logout" className="text-blue-600 hover:underline mt-4 block">Logout and try again</a>
      </div>
    );
  }

  const initialSettings = user?.calComSettings || { username: '', connected: false };
  const t = await getTranslations('Dashboard.Settings');

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="border rounded-lg p-6 bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">{t('calComTitle')}</h2>
        <div className="max-w-2xl">
          <CalComIntegration initialSettings={initialSettings} userId={user._id.toString()} />
        </div>
      </div>
    </div>
  );
}
