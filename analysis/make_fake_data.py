"""Generate a synthetic dataset (40 complete sessions + a few excluded ones) so the notebook runs
before real data exists. Writes data/fake_sessions.json, data/fake_summary.csv,
detection_coding.csv and pilot_ids.txt. Deterministic (seed 7).

THIS DATA IS FAKE. Never mix it with real study data.
"""

from __future__ import annotations

import csv
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from load_data import CSV_COLUMNS, compute_metrics, session_to_row

HERE = Path(__file__).resolve().parent
rng = random.Random(7)
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def pid() -> str:
    return "SN-" + "".join(rng.choice(ALPHABET) for _ in range(5))


def tap(t, screen, target):
    return {"t": t, "type": "tap", "screen": screen, "x": round(rng.uniform(0.1, 0.9), 3), "y": round(rng.uniform(0.1, 0.9), 3), "target": target}


# Rough paywall positions (normalised) so the heatmap looks plausible.
POS = {
    "pw-close": (0.08, 0.08), "plan-annual": (0.5, 0.40), "plan-monthly": (0.5, 0.48), "autorenew": (0.25, 0.56),
    "pw-cta": (0.5, 0.63), "pw-decline": (0.5, 0.76), "sheet-details": (0.2, 0.86), "sheet-subscribe": (0.5, 0.92),
    "sheet-cancel": (0.88, 0.52),
}


def ptap(t, target):
    x, y = POS[target]
    return {"t": t, "type": "tap", "screen": "paywall", "x": round(x + rng.gauss(0, 0.03), 3), "y": round(y + rng.gauss(0, 0.012), 3), "target": target}


def make_events(cond: str, outcome: str, careful: bool) -> list[dict]:
    t = 0
    ev = [{"t": 0, "type": "app_start", "screen": "onb1", "condition": cond, "viewport": [390, 844]},
          {"t": 0, "type": "screen_enter", "screen": "onb1"}]

    def step(lo, hi):
        nonlocal t
        t += rng.randint(lo, hi)
        return t

    ev.append(tap(step(1500, 5000), "onb1", "onb-continue"))
    ev.append({"t": t + 15, "type": "screen_enter", "screen": "onb2"})
    ev.append(tap(step(1500, 5000), "onb2", "onb-continue"))
    ev.append({"t": t + 15, "type": "screen_enter", "screen": "home"})
    if rng.random() < 0.4:
        ev.append(tap(step(800, 3000), "home", "deck-biology"))
        ev.append({"t": t, "type": "deck_tap", "screen": "home", "deck": "biology"})
    ev.append(tap(step(1500, 6000), "home", "locked-tests"))
    ev.append({"t": step(10, 20), "type": "screen_enter", "screen": "paywall"})
    ev.append({"t": step(5, 30), "type": "scroll", "screen": "paywall", "pct": 100})
    ev.append({"t": step(5, 40), "type": "disclosure_visible", "screen": "paywall"})

    state = {"plan": "annual", "on": True}
    if outcome == "paid_monthly":
        ev.append(ptap(step(1500, 6000), "plan-monthly"))
        ev.append({"t": t, "type": "plan_change", "screen": "paywall", "plan": "monthly"})
        state["plan"] = "monthly"
    if outcome == "trial_no_renew":
        ev.append(ptap(step(3000, 12000), "autorenew"))
        ev.append({"t": t, "type": "autorenew_toggle", "screen": "paywall", "on": False})
        state["on"] = False

    if outcome in ("declined", "closed"):
        target = "pw-decline" if outcome == "declined" else "pw-close"
        ev.append(ptap(step(3000, 25000 if careful else 9000), target))
        ev.append({"t": t, "type": "first_decision", "screen": "paywall", "kind": "decline" if outcome == "declined" else "close"})
        ev.append({"t": t, "type": "declined" if outcome == "declined" else "closed_paywall", "screen": "paywall", "outcome": outcome})
        ev.append({"t": t, "type": "disclosure_hidden", "screen": "paywall"})
        ev.append({"t": step(10, 20), "type": "screen_enter", "screen": "home"})
        ev.append(tap(step(1500, 4000), "home", "finish"))
        ev.append({"t": t, "type": "task_end", "screen": "home"})
        return ev

    ev.append(ptap(step(2000, 20000 if careful else 7000), "pw-cta"))
    ev.append({"t": t, "type": "first_decision", "screen": "paywall", "kind": "cta"})
    ev.append({"t": step(3, 10), "type": "sheet_open", "screen": "paywall", "plan": state["plan"], "on": state["on"]})
    ev.append({"t": t, "type": "disclosure_hidden", "screen": "paywall"})
    if careful and rng.random() < 0.6:
        ev.append(ptap(step(1000, 4000), "sheet-details"))
        ev.append({"t": t, "type": "view_details", "screen": "paywall"})
    ev.append(ptap(step(1500, 6000), "sheet-subscribe"))
    ev.append({"t": t, "type": "sheet_close", "screen": "paywall", "how": "subscribe"})
    ev.append({"t": t, "type": "subscribed", "screen": "paywall", "outcome": outcome, "plan": state["plan"], "on": state["on"]})
    ev.append({"t": step(10, 20), "type": "screen_enter", "screen": "plus"})
    ev.append(tap(step(1500, 4000), "plus", "finish"))
    ev.append({"t": t, "type": "task_end", "screen": "plus"})
    return ev


RECALL = {
    "detected": ("It turns into a yearly plan and charges Rs 2,999 unless I cancel.", "Yes, about Rs 2,999 after 7 days."),
    "partly": ("I think it keeps going and charges me something.", "Maybe, not sure how much."),
    "not": ("It just ends and I go back to free.", "No, it was free."),
}


def make_session(i: int, start: datetime, cond: str, own: str) -> dict:
    careful = rng.random() < (0.45 if cond == "md" else 0.35)
    detection = "detected" if careful and rng.random() < 0.8 else ("partly" if rng.random() < 0.35 else "not")
    if careful:
        outcome = rng.choice(["trial_no_renew", "declined", "closed", "trial_no_renew"])
    else:
        outcome = rng.choices(["trial_autorenew", "paid_monthly", "declined"], [0.7, 0.1, 0.2])[0]
    events = make_events(cond, outcome, careful)
    base_trust = 4.2 if cond == "ios" else 3.7
    trust = [max(1, min(7, round(rng.gauss(base_trust - (0.8 if detection == "detected" else 0), 1.1)))) for _ in range(5)]
    sees = rng.random() < 0.8
    manip = ("ios" if cond == "ios" else "android") if sees else rng.choice(["cant", "ios" if cond == "md" else "android"])
    r1, r2 = RECALL[detection]
    return {
        "id": pid(),
        "startedAt": (start + timedelta(minutes=37 * i)).isoformat().replace("+00:00", "Z"),
        "consentAt": (start + timedelta(minutes=37 * i, seconds=30)).isoformat().replace("+00:00", "Z"),
        "completedAt": (start + timedelta(minutes=37 * i + 8)).isoformat().replace("+00:00", "Z"),
        "status": "complete",
        "demo": False,
        "condition": cond,
        "assignment": "stratified-block",
        "mobile": rng.random() < 0.85,
        "ua": "synthetic",
        "screen": [390, 844],
        "trialEnd": "31 Oct 2026",
        "bg": {
            "own": own,
            "years": rng.choice(["<1", "1-3", "3-5", "5+"]),
            "safer": rng.choices(["ios", "android", "same", "unsure"], [0.5, 0.15, 0.2, 0.15])[0],
            "saferConf": rng.randint(2, 7),
            "techConf": rng.randint(3, 7),
        },
        "post": {
            **{f"t{k + 1}": v for k, v in enumerate(trust)},
            "recall1": r1,
            "recall2": r2,
            "misleading": "yes" if detection != "not" else rng.choice(["no", "unsure"]),
            "misleadingWhat": "The tick box was already on and the price was tiny." if detection == "detected" else "",
            "manip": manip,
            "familiar": rng.randint(3, 7),
        },
        "events": events,
        "metrics": compute_metrics(events),
        "_detection": detection,
    }


def main() -> None:
    start = datetime(2026, 11, 2, 9, 0, tzinfo=timezone.utc)
    owns = ["ios"] * 20 + ["android"] * 16 + ["other"] * 4
    rng.shuffle(owns)
    queues: dict[str, list[str]] = {"ios": [], "android": [], "other": []}
    sessions = []
    for i, own in enumerate(owns):
        if not queues[own]:
            queues[own] = rng.sample(["ios", "md"], 2)
        sessions.append(make_session(i, start, queues[own].pop(0), own))

    coding_rows = []
    for s in sessions:
        final = s.pop("_detection")
        flip = rng.random() < 0.15
        other = rng.choice([c for c in ["detected", "partly", "not"] if c != final])
        coding_rows.append({"id": s["id"], "coder1": final, "coder2": other if flip else final, "final": final})

    # Sessions the exclusions should drop: a pilot, a demo, an abandoned one and a too-fast one.
    pilot = make_session(90, start - timedelta(days=3), "ios", "ios")
    pilot.pop("_detection")
    demo = make_session(91, start, "md", "android") | {"demo": True, "assignment": "demo-forced"}
    demo.pop("_detection")
    abandoned = make_session(92, start, "ios", "android") | {"status": "abandoned", "post": None}
    abandoned.pop("_detection")
    fast = make_session(93, start, "md", "ios")
    fast.pop("_detection")
    fast["events"] = [e | {"t": e["t"] // 10} for e in fast["events"]]
    fast["metrics"] = compute_metrics(fast["events"])
    sessions += [pilot, demo, abandoned, fast]

    data = HERE / "data"
    data.mkdir(exist_ok=True)
    (data / "fake_sessions.json").write_text(json.dumps(sessions, indent=1), encoding="utf-8")
    with open(data / "fake_summary.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        w.writeheader()
        for s in sessions:
            row = session_to_row(s)
            w.writerow({k: ("true" if v is True else "false" if v is False else v) for k, v in row.items()})
    with open(HERE / "detection_coding.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id", "coder1", "coder2", "final"])
        w.writeheader()
        w.writerows(coding_rows)
    (HERE / "pilot_ids.txt").write_text(
        "# One participant ID per line. These sessions are excluded from analysis.\n" + pilot["id"] + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(sessions)} synthetic sessions (40 analysable) to {data}")


if __name__ == "__main__":
    main()
