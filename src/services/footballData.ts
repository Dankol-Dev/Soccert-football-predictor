import type {
  Competition,
  Match,
  MatchStatus,
  Prediction,
  StandingsRow,
  Team,
} from "@/types";
import { API_BASE_URL } from "@/constants";

// ── football-data.org competition codes ──
const LEAGUE_CODES: Record<string, Competition> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
};

const CODE_BY_COMPETITION = Object.fromEntries(
  Object.entries(LEAGUE_CODES).map(([code, name]) => [name, code])
) as Record<Competition, string>;

interface BackendTeam {
  id: string;
  name: string;
  short_name: string;
  logo: string;
  color: string;
  form: Team["form"];
}

interface BackendMatch {
  id: string;
  competition: string;
  season: string;
  matchday: number;
  home_team: BackendTeam;
  away_team: BackendTeam;
  kickoff: string;
  status: MatchStatus;
  venue: string;
  home_score: number | null;
  away_score: number | null;
  minute: number | null;
  data_stale: boolean;
}

interface BackendStandingsRow {
  position: number;
  team: BackendTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

function teamFromBackend(team: BackendTeam): Team {
  return {
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    logo: team.logo,
    color: team.color,
    form: team.form,
  };
}

function matchFromBackend(match: BackendMatch): Match {
  const competition = Object.values(LEAGUE_CODES).find((name) => name === match.competition);
  if (!competition) throw new Error("Unsupported competition: " + match.competition);
  return {
    id: match.id,
    competition,
    season: match.season,
    matchday: match.matchday,
    homeTeam: teamFromBackend(match.home_team),
    awayTeam: teamFromBackend(match.away_team),
    kickoff: match.kickoff,
    status: match.status,
    venue: match.venue,
    homeScore: match.home_score,
    awayScore: match.away_score,
    minute: match.minute ?? undefined,
    dataStale: match.data_stale,
  };
}
interface ApiPrediction {
  id: string;
  match_id: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  predicted_outcome: Prediction["predictedOutcome"];
  predicted_score: { home: number; away: number };
  top_outcome_probability: number;
  model_version: string;
  key_factors: Prediction["keyFactors"];
  created_at: string;
}

const MAX_PREDICTION_BATCH_SIZE = 200;

function predictionFromApi(prediction: ApiPrediction): Prediction {
  return {
    id: prediction.id,
    matchId: prediction.match_id,
    homeWinProb: prediction.home_win_prob,
    drawProb: prediction.draw_prob,
    awayWinProb: prediction.away_win_prob,
    predictedOutcome: prediction.predicted_outcome,
    predictedScore: prediction.predicted_score,
    topOutcomeProbability: prediction.top_outcome_probability,
    modelVersion: prediction.model_version,
    keyFactors: prediction.key_factors,
    createdAt: prediction.created_at,
  };
}

async function predictMatches(matches: Match[]): Promise<Prediction[]> {
  const scheduled = matches.filter((match) => match.status === "scheduled");
  if (scheduled.length === 0) return [];

  const predictions: ApiPrediction[] = [];
  for (let offset = 0; offset < scheduled.length; offset += MAX_PREDICTION_BATCH_SIZE) {
    const batch = scheduled.slice(offset, offset + MAX_PREDICTION_BATCH_SIZE);
    const resp = await fetch(`${API_BASE_URL}/predictions/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matches: batch.map((match) => ({
          id: match.id,
          competition: match.competition,
          home_team: match.homeTeam.name,
          away_team: match.awayTeam.name,
        })),
      }),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => null);
      const detail = typeof body?.detail === "string" ? `: ${body.detail}` : "";
      throw new Error(`Prediction service unavailable (${resp.status})${detail}`);
    }
    predictions.push(...(await resp.json() as ApiPrediction[]));
  }
  return predictions.map(predictionFromApi);
}

// ── API functions ──

export async function getMatches(): Promise<Match[]> {
  const resp = await fetch(`${API_BASE_URL}/matches`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to fetch live matches (${resp.status})`);
  }
  const matches = await resp.json() as BackendMatch[];
  return matches.map(matchFromBackend);
}
export async function getMatchById(id: string): Promise<Match | undefined> {
  const resp = await fetch(`${API_BASE_URL}/matches/${encodeURIComponent(id)}`);
  if (resp.status === 404) return undefined;
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to fetch match (${resp.status})`);
  }
  return matchFromBackend(await resp.json() as BackendMatch);
}

export async function getPredictions(matches?: Match[]): Promise<Prediction[]> {
  return predictMatches(matches ?? (await getMatches()));
}

export async function getPredictionByMatchId(matchId: string): Promise<Prediction | undefined> {
  const match = await getMatchById(matchId);
  if (!match || match.status !== "scheduled") return undefined;
  return (await predictMatches([match]))[0];
}

async function fetchStandings(code: string): Promise<StandingsRow[]> {
  const resp = await fetch(`${API_BASE_URL}/standings?code=${encodeURIComponent(code)}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to fetch live standings (${resp.status})`);
  }
  const rows = await resp.json() as BackendStandingsRow[];
  return rows.map((row) => ({
    position: row.position,
    team: teamFromBackend(row.team),
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDifference: row.goal_difference,
    points: row.points,
  }));
}

export async function getStandings(): Promise<StandingsRow[]> {
  return fetchStandings('PL');
}

export async function getStandingsByCompetition(competition: Competition): Promise<StandingsRow[]> {
  const code = CODE_BY_COMPETITION[competition];
  return code ? fetchStandings(code) : [];
}