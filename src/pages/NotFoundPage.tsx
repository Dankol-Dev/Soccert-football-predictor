import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <p className="font-display text-7xl font-bold text-primary-600">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">Page not found</h1>
      <p className="mt-2 max-w-md text-neutral-600">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to={ROUTES.HOME}>
          <Button leftIcon={<Home className="h-4 w-4" />}>Back to home</Button>
        </Link>
        <Link to={ROUTES.PREDICTIONS}>
          <Button variant="secondary" leftIcon={<Compass className="h-4 w-4" />}>Browse predictions</Button>
        </Link>
      </div>
    </div>
  );
}
