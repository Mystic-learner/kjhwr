# UK Wind Forecast Accuracy

Web app for a UK utility's day-ahead buying team. It shows the latest national wind forecast available at decision time and measures its accuracy against actual generation, for January 2026.

## Live links
- App: https://kjhwr-woad.vercel.app/
- API docs: https://kjhwr-3401.onrender.com/docs
- Note: the API runs on a free tier and sleeps when idle. The first load can take about a minute.

## What it does
- For each target hour, picks the latest WINDFOR forecast published at or before a decision cutoff on the day before delivery (default 09:00 UTC, adjustable in the UI).
- Compares it with FUELHH actual wind generation (fuelType WIND).
- Reports MAE, RMSE, bias and MAPE, error by hour of day, and error by forecast horizon.

## Key assumptions
- **Cutoff:** the default is 09:00 UTC on the day before delivery (D-1). Published GB day-ahead auction gate closures are about 09:20 UK time (EPEX) and 09:50 UK time (N2EX), so 09:00 is a conservative choice that falls before both. It is configurable.
- **Time resolution:** forecasts are hourly and actuals are half-hourly, so the comparison is made on the hour. The actual for the half-hour starting on the hour is used, and the :30 actuals are not.
- **Missing data:** target hours missing either an actual or a forecast are left out of the metrics. They are not filled with zero.
- **Scope:** only January 2026 delivery days are included. All times are UTC, which equals UK time in January.
- **Late forecasts:** forecasts published after their own target time are excluded by the cutoff rule.
- **Observation:** in this data the forecast was higher than actual generation on average (about 16 percent). The cause is not established; it may reflect a definitional difference between the two datasets. This is reported as an observation, not a diagnosis.

## Files and directories
- backend/main.py - FastAPI app and endpoints
- backend/pipeline.py - Elexon download and the latest-forecast-before-cutoff logic
- backend/metrics.py - accuracy metrics
- backend/test_pipeline.py - tests for the pipeline logic
- backend/data/ - cached January 2026 actuals and forecasts (CSV)
- backend/Dockerfile, backend/requirements.txt
- frontend/ - React (Vite) dashboard; frontend/src/App.jsx is the main UI
- frontend/Dockerfile - builds the app and serves it with nginx
- docker-compose.yml - runs both services

## Run with Docker
    docker compose up --build
Then open http://localhost:8080 (API on http://localhost:8000/docs).

## Run without Docker
Backend:

    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload

Frontend (second terminal):

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173.

## Refresh the data
    cd backend
    python pipeline.py

## API
- GET /api/data?start=&end=&cutoff_hour=
- GET /api/metrics?start=&end=&cutoff_hour=
- GET /api/metrics/by-hour?start=&end=&cutoff_hour=
- GET /api/metrics/by-horizon?start=&end=

## Deployment
Frontend on Vercel (set VITE_API_URL to the API URL). Backend on Render (Docker), because it needs a long-running Python service with cached data files.

## AI tools disclosure
AI tools were used to assist with this project: Claude (Anthropic) helped with planning, code and debugging. The assumptions and results were reviewed by the author.
