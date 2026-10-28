# Pulse — Live News Sentiment Aggregator

A full-stack app that pulls live news headlines and runs each one through
VADER (a free, offline NLP sentiment analyzer) to classify sentiment and
display a live feed.

**Stack:** React (Vite) frontend · Flask backend · VADER sentiment analysis · public RSS feeds

**Cost: $0.** No API keys, no billing, no paid services anywhere in this stack.

## How it works
1. Backend fetches headlines from public RSS feeds (BBC — no API key needed).
2. Each headline + description is scored by VADER, a lexicon-based sentiment
   model tuned for short text like headlines and social posts. It returns a
   compound score from -1 to +1, which we bucket into positive/neutral/negative.
3. Results are cached for 30 minutes so repeated requests don't recompute.
4. Frontend polls the backend and renders a feed, with a "pulseline" at the
   top that visually reflects the overall sentiment mix.

## Setup

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Backend runs on http://localhost:5000 — no configuration or keys needed.

### 2. Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173 and proxies /api requests to the backend.

## Notes for your resume / interview talk track
- Demonstrates: REST API design, NLP-based sentiment classification,
  in-memory caching strategy, and a responsive React frontend consuming
  a live backend.
- To extend: swap VADER for an LLM API (Claude) for richer summaries,
  add more RSS sources, or persist articles to a database for historical
  sentiment trends.
