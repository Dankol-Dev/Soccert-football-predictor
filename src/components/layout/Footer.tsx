import { Link } from 'react-router-dom';
import { Brain, Github, Twitter } from 'lucide-react';
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/constants';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container-app py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <Link to={ROUTES.HOME} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Brain className="h-4 w-4" />
              </span>
              <span className="font-display text-base font-bold text-neutral-900">{APP_NAME}</span>
            </Link>
            <p className="max-w-xs text-sm text-neutral-500">{APP_TAGLINE}. Predictions are for informational purposes only.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-3">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Product</p>
              <ul className="space-y-2 text-sm">
                <li><Link to={ROUTES.PREDICTIONS} className="text-neutral-600 hover:text-primary-600">Predictions</Link></li>
                <li><Link to={ROUTES.DASHBOARD} className="text-neutral-600 hover:text-primary-600">Dashboard</Link></li>
                <li><Link to={ROUTES.HOME} className="text-neutral-600 hover:text-primary-600">How it works</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Account</p>
              <ul className="space-y-2 text-sm">
                <li><Link to={ROUTES.LOGIN} className="text-neutral-600 hover:text-primary-600">Sign in</Link></li>
                <li><Link to={ROUTES.REGISTER} className="text-neutral-600 hover:text-primary-600">Create account</Link></li>
                <li><Link to={ROUTES.PROFILE} className="text-neutral-600 hover:text-primary-600">Profile</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Connect</p>
              <div className="flex gap-3">
                <a href="#" className="text-neutral-400 hover:text-primary-600 transition-colors" aria-label="GitHub"><Github className="h-5 w-5" /></a>
                <a href="#" className="text-neutral-400 hover:text-primary-600 transition-colors" aria-label="Twitter"><Twitter className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-6 text-xs text-neutral-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>Built by Anzeru Technologies Limited</p>
        </div>
      </div>
    </footer>
  );
}
