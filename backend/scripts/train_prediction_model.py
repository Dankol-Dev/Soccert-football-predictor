"""Train and evaluate the football prediction model from historical results."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.prediction_model import train_artifact


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True, help="Historical results CSV")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("models/football-model.json"),
        help="Output model artifact path",
    )
    parser.add_argument("--window", type=int, default=20, help="Matches per team/venue")
    parser.add_argument(
        "--prior-weight", type=float, default=5.0, help="League-average smoothing weight"
    )
    args = parser.parse_args()
    artifact = train_artifact(args.data, args.output, args.window, args.prior_weight)
    summary = {
        "model_version": artifact["model_version"],
        "training_matches": artifact["training_matches"],
        "trained_through": artifact["trained_through"],
        "input_sha256": artifact["input_sha256"],
        "evaluation": artifact["evaluation"],
        "artifact": str(args.output),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()