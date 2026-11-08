import { formColor, classNames } from '@/utils';

interface FormGuideProps {
  form: ('W' | 'D' | 'L')[];
  className?: string;
}

export function FormGuide({ form, className }: FormGuideProps) {
  return (
    <div className={classNames('flex items-center gap-1', className)} aria-label="Recent form">
      {form.map((result, i) => (
        <span
          key={i}
          className={classNames(
            'flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold',
            formColor(result)
          )}
          title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
        >
          {result}
        </span>
      ))}
    </div>
  );
}
