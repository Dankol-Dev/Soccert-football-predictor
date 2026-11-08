import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Brain, LogOut, Menu, Moon, Sun, X, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { APP_NAME, NAV_LINKS, ROUTES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { initials, classNames } from '@/utils';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate(ROUTES.HOME);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    classNames(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
    );

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur-lg dark:border-neutral-700 dark:bg-neutral-950/80">
      <nav className="container-app flex h-16 items-center justify-between">
        <Link to={ROUTES.HOME} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-glow">
            <Brain className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold text-neutral-900 dark:text-white">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} end={link.to === ROUTES.HOME}>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop auth actions */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                to={ROUTES.PROFILE}
                className="flex items-center gap-2 rounded-full bg-neutral-100 py-1 pl-1 pr-3 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{user.name}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGIN)}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate(ROUTES.REGISTER)}>
                Get started
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950 md:hidden">
          <div className="container-app space-y-1 py-3">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={linkClass}
                end={link.to === ROUTES.HOME}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            <div className="my-2 h-px bg-neutral-100 dark:bg-neutral-800" />
            {isAuthenticated && user ? (
              <>
                <NavLink to={ROUTES.DASHBOARD} className={linkClass} onClick={() => setOpen(false)}>
                  <span className="inline-flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</span>
                </NavLink>
                <NavLink to={ROUTES.PROFILE} className={linkClass} onClick={() => setOpen(false)}>
                  <span className="inline-flex items-center gap-2"><UserIcon className="h-4 w-4" /> Profile</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-950/30"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setOpen(false); navigate(ROUTES.LOGIN); }}>
                  Sign in
                </Button>
                <Button onClick={() => { setOpen(false); navigate(ROUTES.REGISTER); }}>
                  Get started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
