// Application domain types — shared across the frontend.

export type Competition =
  | 'Premier League'
  | 'La Liga'
  | 'Serie A'
  | 'Bundesliga';

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'suspended'
  | 'awarded';

export type PredictionOutcome = 'home' | 'draw' | 'away';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string; // emoji or image url
  color: string;
  form: ('W' | 'D' | 'L')[];
}

export interface Match {
  id: string;
  competition: Competition;
  season: string;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  kickoff: string; // ISO date string
  status: MatchStatus;
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  minute?: number;
  dataStale?: boolean;
}

export interface KeyFactor {
  label: string;
  detail: string;
  weight: 'high' | 'medium' | 'low';
}

export interface PredictionExplanation {
  probability: number;
  confidence: number;
  dataQuality: number;
  summary: string;
  supportingFactors: string[];
  concerns: string[];
  marketConsistency: boolean;
}

export interface MarketProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  doubleChance1x: number;
  doubleChanceX2: number;
  doubleChance12: number;
  drawNoBetHome?: number;
  drawNoBetAway?: number;
  over05: number;
  under05: number;
  over15: number;
  under15: number;
  over25: number;
  under25: number;
  over35: number;
  under35: number;
  bttsYes: number;
  bttsNo: number;
  htHome?: number;
  htDraw?: number;
  htAway?: number;
  homeOver05?: number;
  homeOver15?: number;
  awayOver05?: number;
  awayOver15?: number;
  homeCleanSheet?: number;
  awayCleanSheet?: number;
}

export interface SquadAdjustment {
  confirmedAbsencesImpact: number;
  doubtfulPlayersImpact: number;
  rotationRisk: number;
  keyPlayerAvailability: number;
  overallAdjustment: number;
  details: Record<string, string>;
}

export interface MatchContext {
  homeAdvantage: number;
  restDaysImpact: number;
  fixtureCongestion: number;
  travelImpact: number;
  weatherImpact: number;
  motivation: number;
  competitionImportance: number;
  managerChangeImpact: number;
  refereeImpact: number;
  overallContextAdjustment: number;
}

export interface Prediction {
  id: string;
  matchId: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedOutcome: PredictionOutcome;
  predictedScore: { home: number; away: number };
  topOutcomeProbability: number; // 0-100
  modelVersion: string;
  keyFactors: KeyFactor[];
  createdAt: string;
  // Enhanced fields
  markets?: MarketProbabilities;
  scorelineDistribution?: Record<string, number>;
  explanation?: PredictionExplanation;
  squadAdjustments?: SquadAdjustment;
  matchContext?: MatchContext;
  xgHome?: number;
  xgAway?: number;
}

export interface StandingsRow {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: ApiStatus;
  error: string | null;
}

export interface PerformanceMetrics {
  predictionsTracked: number;
  completed: number;
  overallAccuracy?: number;
  brierScore?: number;
  logLoss?: number;
  byMarket?: Record<string, unknown>;
  byConfidence?: Record<string, unknown>;
  byProbabilityRange?: Record<string, unknown>;
  calibrationError?: number;
}
