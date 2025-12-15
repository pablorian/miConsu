import { getClientId, getWorkOS } from '@/lib/workos';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const authorizationUrl = getWorkOS().userManagement.getAuthorizationUrl({
    provider: 'GoogleOAuth',
    clientId: getClientId(),
    redirectUri: env.WORKOS_REDIRECT_URI,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      <a
        href={authorizationUrl}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Sign in with Google
      </a>
    </div>
  );
}
