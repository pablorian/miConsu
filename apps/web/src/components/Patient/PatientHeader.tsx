'use client';

interface PatientHeaderProps {
  name: string;
  lastName?: string;
  dni?: string;
  phone?: string;
  debt?: number;
}

export default function PatientHeader({ name, lastName, dni, phone, debt }: PatientHeaderProps) {
  const fullName = [name, lastName].filter(Boolean).join(' ');
  const initials = [name?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || name?.slice(0, 2).toUpperCase() || 'P';

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl mb-4">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-foreground truncate">{fullName}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground mt-0.5">
          {dni && <span>DNI: {dni}</span>}
          {phone && <span>• {phone}</span>}
        </div>
      </div>

      {/* Deuda badge — links to Billetera tab */}
      {debt !== undefined && debt > 0 && (
        <a
          href="?tab=billetera"
          className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          Deuda: ${debt.toFixed(2)}
        </a>
      )}
    </div>
  );
}
