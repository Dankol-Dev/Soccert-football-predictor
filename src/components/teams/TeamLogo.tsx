import { useState } from 'react';
import type { Team } from '@/types';

interface TeamLogoProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

export function TeamLogo({ team, size = 'md', className = '' }: TeamLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isImage = team.logo.startsWith('http://') || team.logo.startsWith('https://');

  if (isImage && !imageFailed) {
    return (
      <img
        src={team.logo}
        alt={`${team.name} crest`}
        className={`${sizeClasses[size]} shrink-0 object-contain ${className}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClasses[size]} shrink-0 items-center justify-center rounded-full bg-neutral-100 text-center text-lg ${className}`}
      style={{ color: team.color }}
      aria-label={`${team.name} crest`}
    >
      {team.logo}
    </span>
  );
}
