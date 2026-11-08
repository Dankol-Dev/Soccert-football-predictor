import { TrendingUp, Sparkles } from 'lucide-react';
import type { Match, Prediction } from '@/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { classNames } from '@/utils';

interface PredictionCardProps {
  prediction: Prediction;
  match?: Match;
  className?: string;
}

export function PredictionCard({ prediction, match, className }: PredictionCardProps) {
  const home = match?.homeTeam;
  const away = match?.awayTeam;
  const outcomeLabel =
    prediction.predictedOutcome === 'home'
      ? home?.name ?? 'Home win'
      : prediction.predictedOutcome === 'away'
      ? away?.name ?? 'Away win'
      : 'Draw';

  return (
    <Card className={classNames('overflow-hidden', className)}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" />
          Soccert Predictions
        </CardTitle>
        <Badge tone="neutral">v{prediction.modelVersion}</Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Predicted result</p>
            <p className="font-display text-lg font-bold text-neutral-900">{outcomeLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Score</p>
            <p className="font-display text-lg font-bold text-neutral-900">
              {prediction.predictedScore.home} - {prediction.predictedScore.away}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Outcome probability</p>
          <div className="space-y-2.5">
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-neutral-600">
                <span>{home?.shortName ?? 'Home'} win</span>
                <span>{prediction.homeWinProb}%</span>
              </div>
              <ProgressBar value={prediction.homeWinProb} tone="primary" size="sm" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-neutral-600">
                <span>Draw</span>
                <span>{prediction.drawProb}%</span>
              </div>
              <ProgressBar value={prediction.drawProb} tone="accent" size="sm" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-neutral-600">
                <span>{away?.shortName ?? 'Away'} win</span>
                <span>{prediction.awayWinProb}%</span>
              </div>
              <ProgressBar value={prediction.awayWinProb} tone="success" size="sm" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Top outcome probability</p>
              <p className="font-display text-2xl font-bold text-neutral-900">{prediction.topOutcomeProbability}%</p>
            </div>
          </div>
          <span className="max-w-40 text-right text-xs text-neutral-500">
            Probability assigned to the most likely result, not a measured hit rate.
          </span>
        </div>

        {prediction.keyFactors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Key factors</p>
            <ul className="space-y-2">
              {prediction.keyFactors.map((factor, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3">
                  <span
                    className={classNames(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      factor.weight === 'high' ? 'bg-primary-500' : factor.weight === 'medium' ? 'bg-accent-500' : 'bg-neutral-300'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{factor.label}</p>
                    <p className="text-xs text-neutral-500">{factor.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
