"""Normalize common team-name variants across historical and live feeds."""

from __future__ import annotations

import re
import unicodedata


_GENERIC_TOKENS = {
    "ac", "afc", "as", "bc", "calcio", "cf", "cfc", "club", "de",
    "del", "fc", "fsv", "sc", "ss", "sv", "tsg", "ud", "us", "vfl",
}

_ALIASES_RAW: dict[str, dict[str, str]] = {
    "Premier League": {
        "afc bournemouth": "bournemouth",
        "aston villa": "aston villa",
        "brighton hove albion": "brighton",
        "brighton hove albion fc": "brighton",
        "coventry": "coventry city",
        "hull": "hull city",
        "ipswich town": "ipswich",
        "leeds united": "leeds",
        "man city": "manchester city",
        "manchester city": "manchester city",
        "man united": "manchester united",
        "man utd": "manchester united",
        "manchester united": "manchester united",
        "newcastle": "newcastle united",
        "nott m forest": "nottingham forest",
        "nott forest": "nottingham forest",
        "nottingham forest": "nottingham forest",
        "tottenham": "tottenham hotspur",
        "west ham": "west ham united",
        "wolves": "wolverhampton wanderers",
        "wolverhampton wanderers": "wolverhampton wanderers",
    },
    "La Liga": {
        "alaves": "alaves",
        "deportivo alaves": "alaves",
        "ath bilbao": "athletic bilbao",
        "athletic club": "athletic bilbao",
        "ath madrid": "atletico madrid",
        "atletico madrid": "atletico madrid",
        "barcelona": "barcelona",
        "betis": "real betis",
        "real betis balompie": "real betis",
        "celta": "celta vigo",
        "rc celta vigo": "celta vigo",
        "espanol": "espanyol",
        "espanyol": "espanyol",
        "espanyol barcelona": "espanyol",
        "oviedo": "real oviedo",
        "rayo vallecano madrid": "rayo vallecano",
        "rayo vallecano": "rayo vallecano",
        "vallecano": "rayo vallecano",
        "sociedad": "real sociedad",
        "real sociedad futbol": "real sociedad",
        "valladolid": "real valladolid",
    },
    "Serie A": {
        "inter": "inter",
        "internazionale milano": "inter",
        "milan": "milan",
        "hellas verona": "verona",
    },
    "Bundesliga": {
        "augsburg": "augsburg",
        "bayern munich": "bayern munchen",
        "dortmund": "borussia dortmund",
        "ein frankfurt": "eintracht frankfurt",
        "fc koln": "koln",
        "koln": "koln",
        "freiburg": "freiburg",
        "hamburg": "hamburg",
        "heidenheim": "heidenheim",
        "hoffenheim": "hoffenheim",
        "bayer leverkusen": "leverkusen",
        "leverkusen": "leverkusen",
        "fsv mainz": "mainz",
        "mainz": "mainz",
        "m gladbach": "monchengladbach",
        "borussia monchengladbach": "monchengladbach",
        "monchengladbach": "monchengladbach",
        "pauli": "st pauli",
        "st pauli": "st pauli",
        "union berlin": "union berlin",
        "werder bremen": "werder bremen",
        "wolfsburg": "wolfsburg",
        "bochum": "bochum",
        "kiel": "holstein kiel",
    },
}


def _key(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    tokens = re.findall(r"[a-z0-9]+", ascii_name.casefold())
    return " ".join(
        token for token in tokens if token not in _GENERIC_TOKENS and not token.isdigit()
    )


_ALIASES = {
    competition: {
        _key(alias): _key(canonical)
        for alias, canonical in aliases.items()
    }
    for competition, aliases in _ALIASES_RAW.items()
}


def canonical_team_name(competition: str, name: str) -> str:
    """Return a stable competition-scoped key for a known team-name variant."""
    key = _key(name)
    return _ALIASES.get(competition, {}).get(key, key)