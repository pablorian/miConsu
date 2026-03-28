'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface BookingPageSummary {
  _id: string;
  name: string;
  publicSlug: string;
  bookingTitle: string | null;
  slotDurationMinutes: number;
  serviceCount: number;
}

interface Profile {
  handle: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profilePictureUrl: string | null;
}

// Duration label helper
function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = use(params);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages,   setPages]   = useState<BookingPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/u/${handle}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        setProfile(d.profile);
        setPages(d.pages || []);
      })
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-700">Perfil no encontrado</p>
        <p className="text-sm text-gray-500">El enlace que seguiste puede estar desactualizado o el usuario ya no existe.</p>
      </div>
    );
  }

  const initials = [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toUpperCase() || handle[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-14 pb-8 text-center">
        {/* Avatar */}
        <div className="mx-auto mb-4 w-20 h-20 rounded-full overflow-hidden shadow-md ring-4 ring-white">
          {profile.profilePictureUrl ? (
            <img src={profile.profilePictureUrl} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
          )}
        </div>

        {/* Name + handle */}
        <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
        <p className="text-sm text-gray-500 mt-1">@{handle}</p>

        {pages.length > 0 && (
          <p className="text-sm text-gray-600 mt-3">
            Seleccioná el tipo de cita que necesitás para comenzar.
          </p>
        )}
      </div>

      {/* Pages list */}
      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-3">
        {pages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
            </svg>
            <p className="text-sm">Sin páginas de reserva disponibles.</p>
          </div>
        ) : (
          pages.map(page => (
            <Link
              key={page._id}
              href={`/${locale}/book/${handle}/${page.publicSlug}`}
              className="group block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {page.bookingTitle || page.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {durationLabel(page.slotDurationMinutes)}
                    </span>
                    {page.serviceCount > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        </svg>
                        {page.serviceCount} {page.serviceCount === 1 ? 'servicio' : 'servicios'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-xs text-gray-400">Powered by MiConsu</p>
      </div>
    </div>
  );
}
