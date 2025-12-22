import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import DashboardLayoutClient from '@/components/DashboardLayoutClient';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  let user = null;

  if (token) {
    try {
      user = await verifySession(token.value);
    } catch (e) {
      // Invalid token, redirect to login
      redirect('/login');
    }
  } else {
    // No token, redirect to login
    redirect('/login');
  }

  return (
    <DashboardLayoutClient user={user}>
      {children}
    </DashboardLayoutClient>
  );
}
