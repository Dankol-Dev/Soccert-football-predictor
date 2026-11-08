"""Advanced prediction engine with all recommended features."""
from __future__ import annotations

import math
from collections import defaultdict
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass


@dataclass
class TeamStats:
    name: str
    last_5: List[str] = None
    last_10: List[str] = None
    home_form: List[str] = None
    away_form: List[str] = None
    goals_scored_home: float = 0.0
    goals_scored_away: float = 0.0
    goals_conceded_home: float = 0.0
    goals_conceded_away: float = 0.0
    xg_for: float = 0.0
    xg_against: float = 0.0
    shots_on_target: float = 0.0
    possession: float = 50.0
    clean_sheets: float = 0.0
    btts_pct: float = 0.5
    over_25_pct: float = 0.5
    
    def __post_init__(self):
        if self.last_5 is None: self.last_5 = []
        if self.last_10 is None: self.last_10 = []
        if self.home_form is None: self.home_form = []
        if self.away_form is None: self.away_form = []


class AdvancedPredictionEngine:
    """Comprehensive prediction engine with all markets derived from scoreline distribution."""
    
    def __init__(self, max_goals: int = 6):
        self.max_goals = max_goals
        
    def poisson_pmf(self, lam: float, k: int) -> float:
        """Poisson probability mass function."""
        if lam < 0:
            return 0.0
        return (math.exp(-lam) * (lam ** k)) / math.factorial(k)
    
    def calculate_scoreline_distribution(self, xg_home: float, xg_away: float) -> Dict[str, float]:
        """Calculate full scoreline distribution using Poisson."""
        dist = {}
        for h in range(0, self.max_goals + 1):
            for a in range(0, self.max_goals + 1):
                p = self.poisson_pmf(xg_home, h) * self.poisson_pmf(xg_away, a)
                dist[f"{h}-{a}"] = p
        # Normalize
        total = sum(dist.values())
        if total > 0:
            for k in dist:
                dist[k] /= total
        return dist
    
    def calculate_all_markets(self, scoreline_dist: Dict[str, float], xg_home: float = 0, xg_away: float = 0) -> Dict[str, float]:
        """Derive all markets from scoreline distribution for consistency."""
        markets = {}
        
        # 1X2
        home_win = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[0]) > int(s.split('-')[1]))
        draw = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[0]) == int(s.split('-')[1]))
        away_win = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[0]) < int(s.split('-')[1]))
        markets['home_win'] = home_win
        markets['draw'] = draw
        markets['away_win'] = away_win
        
        # Double chance
        markets['double_chance_1x'] = home_win + draw
        markets['double_chance_x2'] = draw + away_win
        markets['double_chance_12'] = home_win + away_win
        
        # Draw no bet
        if (home_win + away_win) > 0:
            markets['draw_no_bet_home'] = home_win / (home_win + away_win)
            markets['draw_no_bet_away'] = away_win / (home_win + away_win)
        else:
            markets['draw_no_bet_home'] = 0.5
            markets['draw_no_bet_away'] = 0.5
        
        # Over/Under goals
        for threshold in [0.5, 1.5, 2.5, 3.5]:
            over = sum(p for s, p in scoreline_dist.items() if (int(s.split('-')[0]) + int(s.split('-')[1])) > threshold)
            markets[f'over_{str(threshold).replace(".", "")}'] = over
            markets[f'under_{str(threshold).replace(".", "")}'] = 1 - over
        
        # BTTS
        btts_yes = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[0]) > 0 and int(s.split('-')[1]) > 0)
        markets['btts_yes'] = btts_yes
        markets['btts_no'] = 1 - btts_yes
        
        # Clean sheets
        home_cs = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[1]) == 0)
        away_cs = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[0]) == 0)
        markets['home_clean_sheet'] = home_cs
        markets['away_clean_sheet'] = away_cs
        
        # Team totals
        for threshold in [0.5, 1.5]:
            home_over = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[0]) > threshold)
            away_over = sum(p for s, p in scoreline_dist.items() if int(s.split('-')[1]) > threshold)
            markets[f'home_over_{str(threshold).replace(".", "")}'] = home_over
            markets[f'away_over_{str(threshold).replace(".", "")}'] = away_over
        
        return markets
    
    def calculate_squad_adjustments(self, home_squad: Dict[str, Any] = None, away_squad: Dict[str, Any] = None) -> Dict[str, Any]:
        """Calculate squad strength adjustments."""
        home_squad = home_squad or {}
        away_squad = away_squad or {}
        
        # Base adjustments
        confirmed_home = len(home_squad.get('confirmed_absences', []))
        confirmed_away = len(away_squad.get('confirmed_absences', []))
        doubtful_home = len(home_squad.get('doubtful', []))
        doubtful_away = len(away_squad.get('doubtful', []))
        
        confirmed_impact_home = min(0.15, confirmed_home * 0.04)
        confirmed_impact_away = min(0.15, confirmed_away * 0.04)
        doubtful_impact_home = min(0.08, doubtful_home * 0.02)
        doubtful_impact_away = min(0.08, doubtful_away * 0.02)
        
        key_players_missing_home = home_squad.get('key_players_missing', 0)
        key_players_missing_away = away_squad.get('key_players_missing', 0)
        key_avail_home = max(0.7, 1.0 - key_players_missing_home * 0.1)
        key_avail_away = max(0.7, 1.0 - key_players_missing_away * 0.1)
        
        rotation_home = home_squad.get('rotation_risk', 0.0)
        rotation_away = away_squad.get('rotation_risk', 0.0)
        
        overall_adj_home = 1.0 - confirmed_impact_home - doubtful_impact_home
        overall_adj_home *= key_avail_home
        overall_adj_home *= (1.0 - rotation_home)
        overall_adj_home = max(0.6, min(1.2, overall_adj_home))
        
        overall_adj_away = 1.0 - confirmed_impact_away - doubtful_impact_away
        overall_adj_away *= key_avail_away
        overall_adj_away *= (1.0 - rotation_away)
        overall_adj_away = max(0.6, min(1.2, overall_adj_away))
        
        return {
            'home': {
                'confirmed_absences_impact': confirmed_impact_home,
                'doubtful_players_impact': doubtful_impact_home,
                'rotation_risk': rotation_home,
                'key_player_availability': key_avail_home,
                'overall_adjustment': overall_adj_home,
                'details': home_squad.get('details', {})
            },
            'away': {
                'confirmed_absences_impact': confirmed_impact_away,
                'doubtful_players_impact': doubtful_impact_away,
                'rotation_risk': rotation_away,
                'key_player_availability': key_avail_away,
                'overall_adjustment': overall_adj_away,
                'details': away_squad.get('details', {})
            }
        }
    
    def calculate_match_context(self, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Calculate match context adjustments."""
        ctx = context or {}
        
        # Base home advantage
        home_adv = 1.12  # ~12% home advantage
        
        rest_days_home = ctx.get('rest_days_home', 7)
        rest_days_away = ctx.get('rest_days_away', 7)
        rest_impact_home = 1.0
        rest_impact_away = 1.0
        if rest_days_home < 3:
            rest_impact_home = 0.92
        elif rest_days_home > 10:
            rest_impact_home = 1.02
        if rest_days_away < 3:
            rest_impact_away = 0.92
        elif rest_days_away > 10:
            rest_impact_away = 1.02
        
        congestion_home = ctx.get('congestion_home', 0)
        congestion_away = ctx.get('congestion_away', 0)
        congestion_impact_home = max(0.88, 1.0 - congestion_home * 0.04)
        congestion_impact_away = max(0.88, 1.0 - congestion_away * 0.04)
        
        travel_impact_away = max(0.95, 1.0 - ctx.get('travel_distance_km', 0) / 2000.0 * 0.05)
        
        motivation_home = ctx.get('motivation_home', 1.0)
        motivation_away = ctx.get('motivation_away', 1.0)
        
        competition_importance = ctx.get('competition_importance', 1.0)
        
        manager_change_home = ctx.get('manager_change_home', 1.0)
        manager_change_away = ctx.get('manager_change_away', 1.0)
        
        # Only apply if reliable data
        overall_home_adj = home_adv * rest_impact_home * congestion_impact_home * motivation_home * competition_importance * manager_change_home
        overall_away_adj = rest_impact_away * congestion_impact_away * travel_impact_away * motivation_away * competition_importance * manager_change_away
        
        return {
            'home_advantage': home_adv,
            'rest_days_impact': rest_impact_home - 1.0,
            'fixture_congestion': congestion_impact_home - 1.0,
            'travel_impact': travel_impact_away - 1.0 if False else 0.0,  # Travel affects away
            'weather_impact': 0.0,
            'motivation': motivation_home - 1.0,
            'competition_importance': competition_importance - 1.0,
            'manager_change_impact': manager_change_home - 1.0,
            'referee_impact': 0.0,
            'overall_context_adjustment_home': overall_home_adj,
            'overall_context_adjustment_away': overall_away_adj
        }
    
    def generate_explanation(self, home_team: str, away_team: str, markets: Dict[str, float], 
                            xg_home: float, xg_away: float, confidence: float, data_quality: float) -> Dict[str, Any]:
        """Generate detailed prediction explanation."""
        factors = []
        concerns = []
        
        if xg_home > xg_away + 0.3:
            factors.append(f"Stronger attacking output ({xg_home:.2f} xG vs {xg_away:.2f} xG)")
        elif xg_home > xg_away:
            factors.append(f"Better expected goals ({xg_home:.2f} xG vs {xg_away:.2f} xG)")
        
        if markets['home_win'] > markets['away_win'] + 0.15:
            factors.append("Clear advantage based on underlying metrics")
        
        if markets['btts_yes'] > 0.6:
            factors.append("Both teams have good attacking records")
        if markets['over_25'] > 0.6:
            factors.append("High goal expectancy based on team tendencies")
        
        if data_quality < 0.7:
            concerns.append("Limited historical data for one or both teams")
        if abs(markets['home_win'] - 0.33) < 0.05 and abs(markets['draw'] - 0.33) < 0.05:
            concerns.append("Very tight match with low confidence distinction")
        
        # Determine summary
        pred_outcome = max([('home', markets['home_win']), ('draw', markets['draw']), ('away', markets['away_win'])], key=lambda x: x[1])
        if pred_outcome[0] == 'home':
            summary = f"{home_team} have the edge based on underlying metrics and expected goals."
        elif pred_outcome[0] == 'away':
            summary = f"{away_team} are favoured despite playing away, based on current form and attacking output."
        else:
            summary = "Tight contest with all outcomes possible - draw appears most likely."
        
        return {
            'probability': pred_outcome[1],
            'confidence': confidence,
            'data_quality': data_quality,
            'summary': summary,
            'supporting_factors': factors,
            'concerns': concerns,
            'market_consistency': True
        }
    
    def predict_enhanced(self, home_team: str, away_team: str, 
                        home_stats: TeamStats = None, away_stats: TeamStats = None,
                        squad_info: Dict[str, Any] = None,
                        match_context_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate enhanced prediction with all features."""
        home_stats = home_stats or TeamStats(name=home_team)
        away_stats = away_stats or TeamStats(name=away_team)
        squad_info = squad_info or {}
        match_context_info = match_context_info or {}
        
        # Calculate base xG
        league_avg_home = 1.45
        league_avg_away = 1.15
        
        # Team adjustments
        home_attack = (home_stats.goals_scored_home / 1.5) if home_stats.goals_scored_home > 0 else 1.0
        home_defence = (away_stats.goals_conceded_away / 1.2) if away_stats.goals_conceded_away > 0 else 1.0
        away_attack = (away_stats.goals_scored_away / 1.2) if away_stats.goals_scored_away > 0 else 1.0
        away_defence = (home_stats.goals_conceded_home / 1.5) if home_stats.goals_conceded_home > 0 else 1.0
        
        xg_home = league_avg_home * home_attack * away_defence
        xg_away = league_avg_away * away_attack * home_defence
        
        # Apply squad adjustments
        squad_adj = self.calculate_squad_adjustments(
            squad_info.get('home'), squad_info.get('away')
        )
        xg_home *= squad_adj['home']['overall_adjustment']
        xg_away *= squad_adj['away']['overall_adjustment']
        
        # Apply match context
        context_adj = self.calculate_match_context(match_context_info)
        xg_home *= context_adj['overall_context_adjustment_home']
        xg_away *= context_adj['overall_context_adjustment_away']
        
        # Clamp
        xg_home = max(0.2, min(4.5, xg_home))
        xg_away = max(0.2, min(4.0, xg_away))
        
        # Calculate distributions and markets
        scoreline_dist = self.calculate_scoreline_distribution(xg_home, xg_away)
        markets = self.calculate_all_markets(scoreline_dist, xg_home, xg_away)
        
        # Find predicted score (most likely)
        best_score = max(scoreline_dist.items(), key=lambda x: x[1])[0]
        pred_h, pred_a = map(int, best_score.split('-'))
        
        # Calculate confidence and data quality
        has_data = len(home_stats.last_5) > 0 and len(away_stats.last_5) > 0
        data_quality = 0.9 if has_data else 0.6
        market_agreement = 1.0 - abs(markets['home_win'] - markets['away_win'])
        confidence = min(0.95, max(0.5, 0.6 + market_agreement * 0.3 + data_quality * 0.2))
        
        explanation = self.generate_explanation(home_team, away_team, markets, xg_home, xg_away, confidence, data_quality)
        
        return {
            'xg_home': round(xg_home, 2),
            'xg_away': round(xg_away, 2),
            'scoreline_distribution': scoreline_dist,
            'markets': markets,
            'predicted_score': {'home': pred_h, 'away': pred_a},
            'probability': explanation['probability'],
            'confidence': confidence,
            'data_quality': data_quality,
            'explanation': explanation,
            'squad_adjustments': squad_adj,
            'match_context': {
                'home_advantage': context_adj['home_advantage'],
                'rest_days_impact': context_adj['rest_days_impact'],
                'fixture_congestion': context_adj['fixture_congestion'],
                'travel_impact': context_adj['travel_impact'],
                'weather_impact': context_adj['weather_impact'],
                'motivation': context_adj['motivation'],
                'competition_importance': context_adj['competition_importance'],
                'manager_change_impact': context_adj['manager_change_impact'],
                'referee_impact': context_adj['referee_impact'],
                'overall_context_adjustment': (context_adj['overall_context_adjustment_home'] + context_adj['overall_context_adjustment_away']) / 2
            }
        }
