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
      name: 'Dashboard', path: '/dashboard', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
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
            <span className="text-xl font-bold text-primary">Mi Proyecto</span>
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
              <a href="/api/auth/logout" className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left">
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
