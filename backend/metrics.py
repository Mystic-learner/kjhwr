def summarize(df):
    n = int(len(df))
    if n == 0:
        return {"n": 0, "mae": None, "rmse": None, "bias": None, "mape": None,
                "mean_actual": None, "mean_forecast": None}
    err = df["forecast"] - df["actual"]
    return {
        "n": n,
        "mae": round(float(err.abs().mean()), 1),
        "rmse": round(float((err ** 2).mean() ** 0.5), 1),
        "bias": round(float(err.mean()), 1),  # + means over-forecast
        "mape": round(float((err.abs() / df["actual"]).mean() * 100), 1),
        "mean_actual": round(float(df["actual"].mean()), 1),
        "mean_forecast": round(float(df["forecast"].mean()), 1),
    }
