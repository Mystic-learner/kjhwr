from functools import lru_cache
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pipeline import DATA_DIR, latest_before_cutoff
from metrics import summarize

app = FastAPI(title="UK wind forecast vs actuals API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ACT = pd.read_csv(DATA_DIR / "actuals_raw.csv", parse_dates=["startTime"])
FC = pd.read_csv(DATA_DIR / "forecasts_raw.csv", parse_dates=["publishTime", "startTime"])
ACT = ACT[ACT["startTime"] >= "2026-01-01"]


@lru_cache(maxsize=48)
def joined(cutoff_hour: int):
    return ACT.merge(latest_before_cutoff(FC, cutoff_hour), on="startTime")


def window(df, start, end):
    s = pd.Timestamp(start, tz="UTC")
    e = pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)
    return df[(df["startTime"] >= s) & (df["startTime"] < e)]


@app.get("/api/data")
def data(start: str = "2026-01-01", end: str = "2026-01-31",
         cutoff_hour: int = Query(9, ge=0, le=23)):
    d = window(joined(cutoff_hour), start, end).sort_values("startTime").copy()
    d["error"] = d["forecast"] - d["actual"]
    for c in ("startTime", "publishTime"):
        d[c] = d[c].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    return d.to_dict("records")


@app.get("/api/metrics")
def metrics(start: str = "2026-01-01", end: str = "2026-01-31",
            cutoff_hour: int = Query(9, ge=0, le=23)):
    return summarize(window(joined(cutoff_hour), start, end))


@app.get("/api/metrics/by-hour")
def by_hour(start: str = "2026-01-01", end: str = "2026-01-31",
            cutoff_hour: int = Query(9, ge=0, le=23)):
    d = window(joined(cutoff_hour), start, end).copy()
    d["err"] = d["forecast"] - d["actual"]
    g = d.groupby(d["startTime"].dt.hour)["err"].agg(
        mae=lambda x: x.abs().mean(), bias="mean").round(1).reset_index()
    g.columns = ["hour", "mae", "bias"]
    return g.to_dict("records")


@app.get("/api/metrics/by-horizon")
def by_horizon(start: str = "2026-01-01", end: str = "2026-01-31"):
    a = window(FC.merge(ACT, on="startTime"), start, end).copy()
    a["horizon_h"] = (a["startTime"] - a["publishTime"]).dt.total_seconds() / 3600
    a = a[a["horizon_h"] > 0]
    labels = ["0-6h", "6-12h", "12-24h", "24-36h", "36-48h", "48-72h"]
    a["bucket"] = pd.cut(a["horizon_h"], [0, 6, 12, 24, 36, 48, 72], labels=labels)
    a["err"] = a["forecast"] - a["actual"]
    g = a.groupby("bucket", observed=True)["err"].agg(
        mae=lambda x: x.abs().mean(), bias="mean").round(1).reset_index()
    g["bucket"] = g["bucket"].astype(str)
    return g.to_dict("records")
