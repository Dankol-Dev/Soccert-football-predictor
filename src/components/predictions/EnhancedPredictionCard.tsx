import { TrendingUp, Sparkles, Brain, BarChart3, Shield, AlertCircle } from "lucide-react";
import type { Match, Prediction } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { classNames } from "@/utils";

interface EnhancedPredictionCardProps {
  prediction: Prediction;
  match?: Match;
  className?: string;
  showAllMarkets?: boolean;
}

export function EnhancedPredictionCard({
  prediction,
  match,
  className,
  showAllMarkets = false,
}: EnhancedPredictionCardProps) {
  const home = match?.homeTeam;
  const away = match?.awayTeam;
  const outcomeLabel =
    prediction.predictedOutcome === "home"
      ? home?.name ?? "Home win"
      : prediction.predictedOutcome === "away"
      ? away?.name ?? "Away win"
      : "Draw";

  const markets = prediction.markets;
  const explanation = prediction.explanation;

  return (
    <Card className={classNames("overflow-hidden", className)}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" />
          Soccert Intelligence
        </CardTitle>
        <Badge tone="neutral">v{prediction.modelVersion}</Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">Predicted result</p>
            <p className="font-display text-lg font-bold text-neutral-900">{outcomeLabel}</p>
            {prediction.xgHome !== undefined && prediction.xgAway !== undefined && (
              <p className="text-xs text-neutral-600 mt-1">xG: {prediction.xgHome} - {prediction.xgAway}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">Score</p>
            <p className="font-display text-lg font-bold text-neutral-900">
              {prediction.predictedScore.home} - {prediction.predictedScore.away}
            </p>
          </div>
        </div>

        {explanation && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-neutral-200 p-3 text-center">
              <Brain className="h-4 w-4 mx-auto mb-1 text-primary-600" />
              <p className="text-xs text-neutral-500">Probability</p>
              <p className="font-bold text-neutral-900">{(explanation.probability * 100).toFixed(0)}%</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-accent-600" />
              <p className="text-xs text-neutral-500">Confidence</p>
              <p className="font-bold text-neutral-900">{(explanation.confidence * 100).toFixed(0)}%</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 text-center">
              <Shield className="h-4 w-4 mx-auto mb-1 text-success-600" />
              <p className="text-xs text-neutral-500">Data Quality</p>
              <p className="font-bold text-neutral-900">{(explanation.dataQuality * 100).toFixed(0)}%</p>
            </div>
          </div>
        )}

        {explanation && (
          <div className="rounded-xl bg-neutral-50 p-4 space-y-2">
            <p className="text-sm font-medium text-neutral-900">{explanation.summary}</p>
            {explanation.supportingFactors && explanation.supportingFactors.length > 0 && (
              <ul className="space-y-1">
                {explanation.supportingFactors.map((factor: string, i: number) => (
                  <li key={i} className="text-xs text-neutral-700 flex items-start gap-2">
                    <span className="text-primary-600 mt-0.5">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            )}
            {explanation.concerns && explanation.concerns.length > 0 && (
              <ul className="space-y-1">
                {explanation.concerns.map((concern: string, i: number) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">1X2 Probability</p>
          <div className="space-y-2.5">
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-neutral-600">
                <span>{home?.shortName ?? "Home"} win</span>
                <span>{prediction.homeWinProb.toFixed(1)}%</span>
              </div>
              <ProgressBar value={prediction.homeWinProb} tone="primary" size="sm" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-neutral-600">
                <span>Draw</span>
                <span>{prediction.drawProb.toFixed(1)}%</span>
              </div>
              <ProgressBar value={prediction.drawProb} tone="accent" size="sm" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-neutral-600">
                <span>{away?.shortName ?? "Away"} win</span>
                <span>{prediction.awayWinProb.toFixed(1)}%</span>
              </div>
              <ProgressBar value={prediction.awayWinProb} tone="success" size="sm" />
            </div>
          </div>
        </div>

        {markets && showAllMarkets && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Goals Markets</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between rounded-lg bg-neutral-50 p-2 text-xs">
                <span>Over 2.5</span>
                <span className="font-medium">{(markets.over25 * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between rounded-lg bg-neutral-50 p-2 text-xs">
                <span>Under 2.5</span>
                <span className="font-medium">{(markets.under25 * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between rounded-lg bg-neutral-50 p-2 text-xs">
                <span>BTTS Yes</span>
                <span className="font-medium">{(markets.bttsYes * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between rounded-lg bg-neutral-50 p-2 text-xs">
                <span>BTTS No</span>
                <span className="font-medium">{(markets.bttsNo * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Top outcome probability</p>
              <p className="font-display text-2xl font-bold text-neutral-900">{prediction.topOutcomeProbability.toFixed(1)}%</p>
            </div>
          </div>
          <span className="max-w-40 text-right text-xs text-neutral-500">Most likely outcome probability</span>
        </div>
      </CardBody>
    </Card>
  );
}
