# UK Wind Forecast Accuracy

Web app for a UK utility's day-ahead buying team. It shows the latest national wind forecast available at decision time and measures its accuracy against actual generation, for January 2026.

## Live links
- App: https://YOUR-VERCEL-URL
- API: https://kjhwr-3401.onrender.com/docs
- Note: the API runs on a free tier and sleeps when idle. The first load can take about a minute.

## What it does
- For each target hour, picks the latest WINDFOR forecast published before a decision cutoff on the day before delivery (default 09:00 UTC, adjustable in the UI).
- Compares it with FUELHH actual wind generation (fuelType WIND).
- Reports MAE, RMSE, bias and MAPE, error by hour of day, and error by forecast horizon.

## Key assumptions
- Cutoff default is 09:00 UTC on D-1. This is an assumption and is configurable.
- Forecasts are hourly and actuals are half-hourly, so comparison is on the hour only.
- Only January 2026 delivery days are included. All times are UTC (equal to UK time in January).
- Forecasts published after their own target time are excluded by the cutoff rule.
- In this data the forecast over-predicts at every horizon and wind level (about 16 percent on average). The cause is not established; it may reflect a definitional difference between the two datasets. This is reported as an observation, not a diagnosis.

## Files and directories
- backend/main.py - FastAPI app and endpoints
- backend/pipeline.py - Elexon download and the latest-forecast-before-cutoff logic
- backend/metrics.py - accuracy metrics
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
Frontend on Vercel (set VITE_API_URL to the API URL), backend on Render (Docker).

## AI tools disclosure
AI tools were used to assist with this project: Claude (Anthropic) helped with planning, code and debugging. The assumptions and results were reviewed by the author.

