import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import type { Match } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FormGuide } from '@/components/teams/FormGuide';
import { TeamLogo } from '@/components/teams/TeamLogo';
import { ROUTES } from '@/constants';
import { formatRelative, formatTime, classNames } from '@/utils';

interface MatchCardProps {
  match: Match;
  topOutcomeProbability?: number;
}

export function MatchCard({ match, topOutcomeProbability }: MatchCardProps) {
  const { homeTeam, awayTeam, status, kickoff } = match;
  const isLive = status === 'live';
  const isFinished = status === 'finished';

  return (
    <Link to={`${ROUTES.HOME}matches/${match.id}`} className="block">
      <Card hover className="group h-full">
        <div className="flex items-center justify-between px-5 pt-4">
          <Badge tone="neutral" className="uppercase tracking-wide">{match.competition}</Badge>
          {isLive ? (
            <Badge tone="error" dot>{match.minute ? `Live · ${match.minute}'` : 'Live'}</Badge>
          ) : isFinished ? (
            <Badge tone="neutral">Full time</Badge>
          ) : status === 'scheduled' ? (
            <Badge tone="primary">{formatRelative(kickoff)}</Badge>
          ) : (
            <Badge tone={status === 'cancelled' ? 'error' : 'warning'}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <TeamLogo team={homeTeam} size="sm" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">{homeTeam.name}</p>
                <FormGuide form={homeTeam.form} className="mt-1" />
              </div>
            </div>

            <div className="px-2 text-center">
              {isLive || isFinished ? (
                <p className="font-display text-xl font-bold text-neutral-900">
                  {match.homeScore} <span className="text-neutral-300">-</span> {match.awayScore}
                </p>
              ) : (
                <p className="text-xs font-medium text-neutral-400">VS</p>
              )}
            </div>

            <div className="flex flex-1 items-center justify-end gap-3 text-right">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{awayTeam.name}</p>
                <FormGuide form={awayTeam.form} className="mt-1 justify-end" />
              </div>
              <TeamLogo team={awayTeam} size="sm" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatTime(kickoff)}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{match.venue}</span>
          </span>
          {topOutcomeProbability != null && (
            <span
              className={classNames(
                'inline-flex items-center rounded-full px-2 py-0.5 font-medium',
                'bg-neutral-100 text-neutral-700'
              )}
            >
              {topOutcomeProbability}% top probability
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
