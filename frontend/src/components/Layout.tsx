import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark', 'bg-gray-950');
    } else {
      document.documentElement.classList.remove('dark', 'bg-gray-950');
    }
  }, [isDark]);

  useEffect(() => {
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches &&
      localStorage.getItem('theme') !== 'light'
    ) {
      setIsDark(true);
    }

    const handleColorSchemeChange = (event: MediaQueryListEvent) => {
      if (
        localStorage.getItem('theme') === 'light' ||
        localStorage.getItem('theme') === 'dark'
      )
        return;
      setIsDark(event.matches);
    };

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', handleColorSchemeChange);

    return () => {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener('change', handleColorSchemeChange);
    };
  }, []);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/instances', label: 'Browse Instances' },
  ];

  return (
    <div className="min-h-screen dark:bg-gray-950 dark:text-gray-100">
      {/* Top nav bar (mobile) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          MeshInfo Network
        </span>
        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle dark mode"
            onClick={() => {
              const next = !isDark;
              setIsDark(next);
              localStorage.setItem('theme', next ? 'dark' : 'light');
            }}
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col">
        <div className="flex flex-col px-6 pb-4 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 grow gap-y-5">
          <div className="flex items-center h-20 mt-4 shrink-0">
            <Link
              to="/"
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              MeshInfo Network
            </Link>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2">
            <button
              aria-label="Toggle dark mode"
              onClick={() => {
                const next = !isDark;
                setIsDark(next);
                localStorage.setItem('theme', next ? 'dark' : 'light');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
            <a
              href="https://github.com/MeshAddicts/meshinfo-network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-3"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60 pt-14 lg:pt-0">
        <main className="py-2">
          <div className="px-4 sm:px-6 lg:px-8 py-4">{children}</div>
        </main>
      </div>
    </div>
  );
};
