import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import { redirect } from 'next/navigation';

const SECTIONS = [
  {
    href: '/dashboard/balances/allPayments',
    title: 'Todos los pagos',
    description: 'Ingresos y egresos del período seleccionado.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/balances/performance',
    title: 'Rendimiento',
    description: 'KPIs, turnos y estadísticas de la clínica.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/balances/patientDebts',
    title: 'Pacientes deudores',
    description: 'Saldo pendiente por paciente.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <line x1="17" y1="11" x2="23" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/balances/professionalPayments',
    title: 'Liquidación a profesionales',
    description: 'Ingresos y comisiones por profesional.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/balances/rentalIncome',
    title: 'Ingresos por alquileres',
    description: 'Ingresos mensuales por alquiler de consultorios.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
      </svg>
    ),
  },
];

export default async function BalancesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) redirect('/login');
  const session = await verifySession(token.value);
  if (!session) redirect('/login');

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Balances</h1>
          <p className="text-sm text-muted-foreground">En esta sección se muestra el rendimiento de la clínica.</p>
        </div>
      </div>

      {/* Navigation grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors flex-shrink-0">
                {section.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
