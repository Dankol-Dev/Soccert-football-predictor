import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: ReactNode;
}

export function Card({ hover, className, children, ...rest }: CardProps) {
  return (
    <div
      className={classNames(
        'rounded-2xl bg-white shadow-card ring-1 ring-neutral-200/70 transition-all duration-300',
        hover && 'hover:shadow-card-hover hover:ring-neutral-300 cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('px-5 pt-5 pb-3', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={classNames('text-base font-semibold text-neutral-900', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('px-5 py-4 border-t border-neutral-100', className)} {...rest}>
      {children}
    </div>
  );
}
