import requests, pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
DATA_DIR = Path(__file__).parent / "data"
CUTOFF_HOUR_UTC = 9  # on the day before delivery


def _chunks(start, end, days=7):
    cur = start
    while cur < end:
        nxt = min(cur + timedelta(days=days), end)
        yield cur, nxt
        cur = nxt


def fetch_actuals():
    rows = []
    for a, b in _chunks(datetime(2026, 1, 1), datetime(2026, 2, 1)):
        r = requests.get(f"{BASE}/FUELHH/stream", params={
            "settlementDateFrom": a.strftime("%Y-%m-%d"),
            "settlementDateTo": (b - timedelta(days=1)).strftime("%Y-%m-%d"),
            "fuelType": "WIND"})
        r.raise_for_status()
        rows += r.json()
    df = pd.DataFrame(rows)
    df["startTime"] = pd.to_datetime(df["startTime"])
    df = df.rename(columns={"generation": "actual"})
    return df[["startTime", "actual"]].drop_duplicates("startTime")


def fetch_forecasts():
    rows = []
    for a, b in _chunks(datetime(2025, 12, 30), datetime(2026, 2, 1)):
        r = requests.get(f"{BASE}/WINDFOR/stream", params={
            "publishDateTimeFrom": a.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "publishDateTimeTo": b.strftime("%Y-%m-%dT%H:%M:%SZ")})
        r.raise_for_status()
        rows += r.json()
    df = pd.DataFrame(rows)
    df["publishTime"] = pd.to_datetime(df["publishTime"])
    df["startTime"] = pd.to_datetime(df["startTime"])
    df = df.rename(columns={"generation": "forecast"})
    return df[["publishTime", "startTime", "forecast"]].drop_duplicates(["publishTime", "startTime"])


def latest_before_cutoff(fc, cutoff_hour=CUTOFF_HOUR_UTC):
    """For each target time, the latest forecast published at or before
    cutoff_hour (UTC) on the day before the target day."""
    fc = fc.copy()
    fc["cutoff"] = fc["startTime"].dt.normalize() - pd.Timedelta(days=1) + pd.Timedelta(hours=cutoff_hour)
    ok = fc[fc["publishTime"] <= fc["cutoff"]]
    ok = ok.sort_values("publishTime").groupby("startTime").tail(1)
    return ok[["startTime", "publishTime", "forecast"]]


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    fetch_actuals().to_csv(DATA_DIR / "actuals_raw.csv", index=False)
    fetch_forecasts().to_csv(DATA_DIR / "forecasts_raw.csv", index=False)
    print("downloaded")
