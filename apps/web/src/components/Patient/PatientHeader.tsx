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
          {phone && (
            <span className="flex items-center gap-1.5">
              • {phone}
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir WhatsApp"
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </span>
          )}
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
