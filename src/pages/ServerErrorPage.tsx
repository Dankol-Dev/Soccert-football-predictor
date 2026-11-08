import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

export function ServerErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50 text-error-600">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <p className="mt-6 font-display text-5xl font-bold text-neutral-900">500</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-neutral-600">
        Our server hit an unexpected error. We're working on it — please try again shortly.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Link to={ROUTES.HOME}>
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
