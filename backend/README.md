# ResoHub FastAPI backend

This backend is a Python FastAPI implementation built around the existing Supabase-powered data model.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Environment variables

Create a `.env` file inside `backend` with:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health`
- `GET /api/v1/bookings`
- `POST /api/v1/bookings`
- `POST /api/v1/bookings/{booking_id}/review`
- `POST /api/v1/bookings/{booking_id}/cancel`
