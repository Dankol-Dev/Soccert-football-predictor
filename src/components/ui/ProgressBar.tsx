import { classNames } from '@/utils';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}

const toneMap = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  accent: 'bg-accent-500',
};

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

export function ProgressBar({
  value,
  label,
  tone = 'primary',
  size = 'md',
  showValue = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div className={classNames('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-600">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={classNames('w-full overflow-hidden rounded-full bg-neutral-200', sizeMap[size])}>
        <div
          className={classNames('h-full rounded-full transition-all duration-700 ease-out', toneMap[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
