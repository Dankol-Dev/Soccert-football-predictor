import { Loader2 } from 'lucide-react';
import { classNames } from '@/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  return (
    <div className={classNames('flex flex-col items-center justify-center gap-3', className)} role="status">
      <Loader2 className={classNames('animate-spin text-primary-600', sizeMap[size])} />
      {label && <p className="text-sm text-neutral-500">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
