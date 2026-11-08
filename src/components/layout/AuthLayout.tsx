import { Link, Outlet, ScrollRestoration } from 'react-router-dom';
import { Brain, TrendingUp, ShieldCheck } from 'lucide-react';
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/constants';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white lg:grid-cols-2">
      {/* Left: form area */}
      <div className="flex flex-col">
        <header className="p-6">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Brain className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold text-neutral-900 dark:text-white">{APP_NAME}</span>
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
        <ScrollRestoration />
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute -right-10 bottom-20 h-96 w-96 rounded-full bg-primary-300 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-white">
          <h2 className="font-display text-3xl font-bold leading-tight text-balance">
            {APP_TAGLINE}, powered by historical match data.
          </h2>
          <p className="mt-4 text-primary-100">
            Explore score-based outcome probabilities with transparent model factors.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: TrendingUp, title: 'Outcome probabilities', text: 'Compare home, draw, and away result probabilities.' },
              { icon: ShieldCheck, title: 'Secure access', text: 'Supabase authentication protects your account.' },
              { icon: Brain, title: 'Backtested model', text: 'Rolling holdout results are included with each model artifact.' },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-primary-100">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
