"""
News Sentiment Aggregator - Backend
------------------------------------
Fetches live headlines from public RSS feeds (no API key needed) and runs
each one through VADER, a free, offline, lexicon-based sentiment analyzer
built specifically for short text like headlines and social posts.

No paid API, no key, no internet call needed for the analysis step itself.

Results are cached in memory so we don't recompute for the same article
on every request.
"""

import os
import time
import hashlib
import feedparser
from flask import Flask, jsonify, request
from flask_cors import CORS
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)
CORS(app)

analyzer = SentimentIntensityAnalyzer()

# Curated public RSS feeds - no API key required, free to use.
FEEDS = {
    "technology": "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "business": "https://feeds.bbci.co.uk/news/business/rss.xml",
    "world": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "science": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
}

# In-memory cache: { article_id: {..enriched article..} }
CACHE = {}
CACHE_TTL_SECONDS = 60 * 30  # 30 minutes


def make_id(entry):
    """Stable id for an article so we can cache it."""
    raw = entry.get("link", "") + entry.get("title", "")
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def clean_summary(description, title):
    """Strip HTML tags RSS feeds sometimes include, and trim to one line."""
    import re
    text = re.sub("<[^<]+?>", "", description or "").strip()
    if not text:
        text = title
    return text[:160] + ("..." if len(text) > 160 else "")


def analyze_sentiment(title, description):
    """
    Score the headline + description with VADER (free, offline, lexicon-based).
    VADER returns a compound score from -1 (very negative) to +1 (very positive).
    We bucket that into positive / neutral / negative using VADER's own
    recommended thresholds.
    Returns a dict: {"sentiment": "positive|neutral|negative", "summary": "..."}
    """
    text = f"{title}. {description or ''}"
    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]

    if compound >= 0.05:
        sentiment = "positive"
    elif compound <= -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "sentiment": sentiment,
        "summary": clean_summary(description, title),
    }


@app.route("/api/topics")
def get_topics():
    return jsonify(list(FEEDS.keys()))


@app.route("/api/articles")
def get_articles():
    topic = request.args.get("topic", "technology")
    limit = int(request.args.get("limit", 10))

    if topic not in FEEDS:
        return jsonify({"error": f"unknown topic '{topic}'"}), 400

    parsed_feed = feedparser.parse(FEEDS[topic])
    results = []

    for entry in parsed_feed.entries[:limit]:
        article_id = make_id(entry)
        now = time.time()

        cached = CACHE.get(article_id)
        if cached and (now - cached["cached_at"] < CACHE_TTL_SECONDS):
            results.append(cached["data"])
            continue

        title = entry.get("title", "")
        description = entry.get("summary", "")
        analysis = analyze_sentiment(title, description)

        article = {
            "id": article_id,
            "title": title,
            "link": entry.get("link", ""),
            "published": entry.get("published", ""),
            "source": parsed_feed.feed.get("title", topic),
            "topic": topic,
            "sentiment": analysis["sentiment"],
            "ai_summary": analysis["summary"],
        }

        CACHE[article_id] = {"data": article, "cached_at": now}
        results.append(article)

    return jsonify(results)


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)