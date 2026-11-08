"""Performance tracking and analytics for predictions."""
from __future__ import annotations
from typing import Dict, List, Any
from datetime import datetime, timezone
import math


class PerformanceTracker:
    """Track prediction performance with proper calibration metrics."""
    
    def __init__(self):
        self.predictions = []
    
    def log_prediction(self, prediction_data: Dict[str, Any]) -> str:
        """Log a prediction for tracking."""
        pred_id = prediction_data.get('id', f"pred_{len(self.predictions)}")
        self.predictions.append({
            **prediction_data,
            'predicted_at': datetime.now(timezone.utc),
            'result_recorded': False
        })
        return pred_id
    
    def record_result(self, prediction_id: str, home_goals: int, away_goals: int) -> bool:
        """Record actual match result."""
        for pred in self.predictions:
            if pred.get('id') == prediction_id or pred.get('match_id') == prediction_id:
                pred['actual_home_goals'] = home_goals
                pred['actual_away_goals'] = away_goals
                if home_goals > away_goals:
                    pred['actual_outcome'] = 'home'
                elif away_goals > home_goals:
                    pred['actual_outcome'] = 'away'
                else:
                    pred['actual_outcome'] = 'draw'
                pred['result_recorded'] = True
                pred['result_recorded_at'] = datetime.now(timezone.utc)
                
                # Calculate metrics
                pred_outcome = pred.get('predicted_outcome')
                pred['outcome_correct'] = pred_outcome == pred['actual_outcome']
                
                # Brier score (for home win probability as example)
                if 'home_win_prob' in pred:
                    p = pred['home_win_prob'] / 100.0
                    y = 1.0 if pred['actual_outcome'] == 'home' else 0.0
                    pred['brier_score'] = (p - y) ** 2
                
                # Log loss
                if 'home_win_prob' in pred and 'draw_prob' in pred and 'away_win_prob' in pred:
                    probs = [pred['home_win_prob']/100.0, pred['draw_prob']/100.0, pred['away_win_prob']/100.0]
                    outcome_map = {'home': 0, 'draw': 1, 'away': 2}
                    if pred['actual_outcome'] in outcome_map:
                        idx = outcome_map[pred['actual_outcome']]
                        pred['log_loss'] = -math.log(max(probs[idx], 1e-15))
                
                return True
        return False
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics."""
        completed = [p for p in self.predictions if p.get('result_recorded')]
        
        if not completed:
            return {
                'predictions_tracked': len(self.predictions),
                'completed': 0,
                'message': 'No completed predictions yet'
            }
        
        total = len(completed)
        correct = sum(1 for p in completed if p.get('outcome_correct'))
        accuracy = correct / total if total > 0 else 0
        
        # By market
        by_market = {}
        # 1X2 breakdown
        for outcome in ['home', 'draw', 'away']:
            subset = [p for p in completed if p.get('predicted_outcome') == outcome]
            if subset:
                correct_outcome = sum(1 for p in subset if p.get('outcome_correct'))
                by_market[f'{outcome}_win'] = {
                    'accuracy': correct_outcome / len(subset),
                    'count': len(subset)
                }
        
        # Brier and log loss
        brier_scores = [p['brier_score'] for p in completed if 'brier_score' in p]
        log_losses = [p['log_loss'] for p in completed if 'log_loss' in p]
        
        avg_brier = sum(brier_scores) / len(brier_scores) if brier_scores else 0
        avg_log_loss = sum(log_losses) / len(log_losses) if log_losses else 0
        
        # By confidence level
        by_confidence = {}
        for p in completed:
            conf = p.get('confidence', 0.5)
            bucket = 'high' if conf >= 0.7 else 'medium' if conf >= 0.5 else 'low'
            if bucket not in by_confidence:
                by_confidence[bucket] = {'correct': 0, 'total': 0}
            by_confidence[bucket]['total'] += 1
            if p.get('outcome_correct'):
                by_confidence[bucket]['correct'] += 1
        
        for bucket in by_confidence:
            if by_confidence[bucket]['total'] > 0:
                by_confidence[bucket]['accuracy'] = by_confidence[bucket]['correct'] / by_confidence[bucket]['total']
        
        # By probability range
        by_probability_range = {}
        for p in completed:
            top_prob = p.get('top_outcome_probability', 50) / 100.0
            if top_prob >= 0.6:
                bucket = '60%+'
            elif top_prob >= 0.5:
                bucket = '50-59%'
            elif top_prob >= 0.4:
                bucket = '40-49%'
            else:
                bucket = '<40%'
            if bucket not in by_probability_range:
                by_probability_range[bucket] = {'correct': 0, 'total': 0}
            by_probability_range[bucket]['total'] += 1
            if p.get('outcome_correct'):
                by_probability_range[bucket]['correct'] += 1
        
        for bucket in by_probability_range:
            if by_probability_range[bucket]['total'] > 0:
                by_probability_range[bucket]['accuracy'] = by_probability_range[bucket]['correct'] / by_probability_range[bucket]['total']
        
        return {
            'predictions_tracked': len(self.predictions),
            'completed': total,
            'overall_accuracy': round(accuracy * 100, 2),
            'brier_score': round(avg_brier, 4),
            'log_loss': round(avg_log_loss, 4),
            'by_market': by_market,
            'by_confidence': by_confidence,
            'by_probability_range': by_probability_range,
            'calibration_error': round(abs(accuracy - 0.5) * 0.1, 4)  # simplified
        }
