"""Load StudyNest sessions into a pandas DataFrame and apply the pre-registered exclusions.

Sources (first match wins):
  * a full JSON export from the researcher panel (preferred: metrics are re-computed from events),
  * a summary CSV export,
  * Firestore via firebase-admin (``--firestore``; needs GOOGLE_APPLICATION_CREDENTIALS).

Exclusions: demo sessions, status != complete, task_total_ms < 15000, IDs in pilot_ids.txt.

Usage:  python load_data.py data/fake_sessions.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
MIN_TASK_MS = 15_000

CSV_COLUMNS = [
    "id", "started", "demo", "status", "condition", "assignment", "own_platform", "years", "believes_safer",
    "safer_conf", "tech_conf", "mobile", "outcome", "susceptible", "paywall_dwell_ms", "decision_latency_ms",
    "disclosure_visible_ms", "view_details_taps", "sheet_dwell_ms", "autorenew_toggles", "plan_changes",
    "paywall_max_scroll_pct", "task_total_ms", "trust_mean", "t1", "t2", "t3", "t4", "t5", "recall1", "recall2",
    "misleading", "misleading_what", "manip_check", "manip_pass", "familiar",
]

SUSCEPTIBLE = {"trial_autorenew", "paid_monthly"}
DECISION_TARGETS = {"pw-cta", "pw-decline", "pw-close"}


# ---------------------------------------------------------------- metrics (mirror of src/lib/metrics.ts)

def _end_time(events: list[dict]) -> int:
    for e in events:
        if e["type"] == "task_end":
            return e["t"]
    return events[-1]["t"] if events else 0


def _paired(events: list[dict], start, stop) -> int:
    total, open_t = 0, None
    for e in events:
        if open_t is None and start(e):
            open_t = e["t"]
        elif open_t is not None and stop(e):
            total += e["t"] - open_t
            open_t = None
    if open_t is not None:
        total += max(0, _end_time(events) - open_t)
    return total


def compute_metrics(events: list[dict]) -> dict:
    """Same definitions as computeMetrics() in the app (§7.4)."""
    outcome = "none"
    for e in events:
        if e["type"] == "subscribed" and e.get("outcome"):
            outcome = e["outcome"]
        elif e["type"] == "declined":
            outcome = "declined"
        elif e["type"] == "closed_paywall":
            outcome = "closed"

    first_pw = next((e for e in events if e["type"] == "screen_enter" and e["screen"] == "paywall"), None)
    latency = None
    if first_pw:
        tap = next(
            (e for e in events if e["type"] == "tap" and e["screen"] == "paywall" and e["t"] >= first_pw["t"]
             and e.get("target") in DECISION_TARGETS),
            None,
        )
        latency = tap["t"] - first_pw["t"] if tap else None

    start = next((e for e in events if e["type"] == "app_start"), None)
    end = next((e for e in events if e["type"] == "task_end"), None)
    scrolls = [e["pct"] for e in events if e["type"] == "scroll" and isinstance(e.get("pct"), (int, float))]
    count = lambda t: sum(1 for e in events if e["type"] == t)  # noqa: E731
    return {
        "outcome": outcome,
        "susceptible": outcome in SUSCEPTIBLE,
        "paywall_dwell_ms": _paired(
            events,
            lambda e: e["type"] == "screen_enter" and e["screen"] == "paywall",
            lambda e: (e["type"] == "screen_enter" and e["screen"] != "paywall") or e["type"] == "task_end",
        ),
        "decision_latency_ms": latency,
        "disclosure_visible_ms": _paired(
            events, lambda e: e["type"] == "disclosure_visible", lambda e: e["type"] == "disclosure_hidden"
        ),
        "view_details_taps": count("view_details"),
        "sheet_dwell_ms": _paired(events, lambda e: e["type"] == "sheet_open", lambda e: e["type"] == "sheet_close"),
        "sheet_opens": count("sheet_open"),
        "autorenew_toggles": count("autorenew_toggle"),
        "plan_changes": count("plan_change"),
        "paywall_max_scroll_pct": round(min(100, max(scrolls))) if scrolls else 0,
        "task_total_ms": end["t"] - start["t"] if start and end else 0,
    }


# ---------------------------------------------------------------- session → row (mirror of src/lib/export.ts)

def session_to_row(s: dict) -> dict:
    bg = s.get("bg") or {}
    p = s.get("post") or {}
    m = compute_metrics(s["events"]) if s.get("events") else (s.get("metrics") or {})
    trust = [p.get(f"t{i}") for i in range(1, 6)]
    trust_mean = round(sum(trust) / 5, 2) if all(isinstance(t, (int, float)) for t in trust) else None
    manip = p.get("manip")
    cond = s.get("condition")
    return {
        "id": s["id"],
        "started": s.get("startedAt"),
        "demo": bool(s.get("demo")),
        "status": s.get("status"),
        "condition": cond,
        "assignment": s.get("assignment"),
        "own_platform": bg.get("own"),
        "years": bg.get("years"),
        "believes_safer": bg.get("safer"),
        "safer_conf": bg.get("saferConf"),
        "tech_conf": bg.get("techConf"),
        "mobile": s.get("mobile"),
        **{k: m.get(k) for k in [
            "outcome", "susceptible", "paywall_dwell_ms", "decision_latency_ms", "disclosure_visible_ms",
            "view_details_taps", "sheet_dwell_ms", "autorenew_toggles", "plan_changes",
            "paywall_max_scroll_pct", "task_total_ms",
        ]},
        "trust_mean": trust_mean,
        **{f"t{i}": p.get(f"t{i}") for i in range(1, 6)},
        "recall1": p.get("recall1"),
        "recall2": p.get("recall2"),
        "misleading": p.get("misleading"),
        "misleading_what": p.get("misleadingWhat"),
        "manip_check": manip,
        "manip_pass": None if not p or not cond else (manip == "ios" and cond == "ios") or (manip == "android" and cond == "md"),
        "familiar": p.get("familiar"),
    }


# ---------------------------------------------------------------- loading

def _from_firestore() -> list[dict]:
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    db = firestore.client()
    out = []
    for doc in db.collection("sessions").stream():
        s = doc.to_dict()
        if s.get("eventChunks"):
            chunks = sorted((c.to_dict() for c in doc.reference.collection("events").stream()), key=lambda c: c["i"])
            s["events"] = [e for c in chunks for e in c["events"]]
        out.append(s)
    return out


def load_sessions_json(path: str | Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_raw(source: str | Path | None = None) -> pd.DataFrame:
    """All sessions, no exclusions."""
    if source == "--firestore":
        rows = [session_to_row(s) for s in _from_firestore()]
        return pd.DataFrame(rows, columns=CSV_COLUMNS)
    path = Path(source) if source else HERE / "data" / "fake_sessions.json"
    if path.suffix.lower() == ".json":
        return pd.DataFrame([session_to_row(s) for s in load_sessions_json(path)], columns=CSV_COLUMNS)
    df = pd.read_csv(path, keep_default_na=False, na_values=[""])
    for col in ["demo", "susceptible", "mobile", "manip_pass"]:
        df[col] = df[col].map({True: True, False: False, "true": True, "false": False, "True": True, "False": False})
    return df


def pilot_ids(path: Path = HERE / "pilot_ids.txt") -> set[str]:
    if not path.exists():
        return set()
    return {ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")}


def apply_exclusions(df: pd.DataFrame, pilots: set[str] | None = None) -> pd.DataFrame:
    pilots = pilot_ids() if pilots is None else pilots
    keep = (
        (df["demo"] != True)  # noqa: E712
        & (df["status"] == "complete")
        & (pd.to_numeric(df["task_total_ms"], errors="coerce").fillna(0) >= MIN_TASK_MS)
        & (~df["id"].isin(pilots))
    )
    return df[keep].reset_index(drop=True)


def attach_coding(df: pd.DataFrame, coding_path: Path = HERE / "detection_coding.csv") -> pd.DataFrame:
    """Adds `detection` (detected | partly | not) and binary `detected` (strict: final == detected)."""
    if not coding_path.exists():
        return df.assign(detection=pd.NA, detected=pd.NA)
    coding = pd.read_csv(coding_path)[["id", "final"]].rename(columns={"final": "detection"})
    out = df.merge(coding, on="id", how="left")
    out["detected"] = out["detection"].map(lambda v: None if pd.isna(v) else v == "detected")
    return out


def load(source: str | Path | None = None) -> pd.DataFrame:
    """Sessions after exclusions, with detection coding attached."""
    return attach_coding(apply_exclusions(load_raw(source)))


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    raw = load_raw(src)
    df = load(src)
    print(f"{len(raw)} sessions loaded, {len(df)} after exclusions")
    print(df.groupby("condition").size().rename("n").to_string())
