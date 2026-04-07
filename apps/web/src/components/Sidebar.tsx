import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const t = useTranslations('Dashboard');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname.includes(path);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const menuItems = [
    {
      name: 'Turnos', path: '/dashboard/calendar', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      )
    },

    {
      name: t('patients'), path: '/dashboard/patients', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      )
    },
    {
      name: 'Balances', path: '/dashboard/balances', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      )
    },
    {
      name: 'Consultorios', path: '/dashboard/consultorios', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
      )
    },
    {
      name: 'Tareas', path: '/dashboard/boards', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      )
    },
  ];

  const firstName = user?.firstName || user?.first_name;
  const lastName = user?.lastName || user?.last_name;

  const userInitials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName
      ? firstName[0].toUpperCase()
      : user?.email?.[0]?.toUpperCase() || 'U';

  const userName = firstName ? `${firstName} ${lastName || ''}`.trim() : (user?.email || 'User');
  const userEmail = user?.email || '';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r border-header-border bg-sidebar transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col justify-between`}
      >
        <div>
          <div className="flex h-16 items-center justify-center border-b border-header-border">
            <span className="text-xl font-bold text-primary">miConsu</span>
          </div>

          <div className="py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => onClose()}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive(item.path)
                      ? 'bg-sidebar-active text-sidebar-active-fg'
                      : 'text-sidebar-fg hover:bg-gray-100 hover:text-foreground dark:hover:bg-slate-800'
                      }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="border-t border-header-border p-4 relative" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden z-50">
              <Link
                href="/dashboard/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-zinc-700 w-full text-left transition-colors"
                role="menuitem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                {t('settings')}
              </Link>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
              <a href="/api/auth/logout" className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors" role="menuitem">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Logout
              </a>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
          >
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt={userName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm border border-blue-200 dark:border-blue-800">
                {userInitials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>
      </aside>
    </>
  );
}
