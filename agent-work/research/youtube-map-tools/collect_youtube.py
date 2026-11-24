"""Collect the frozen YouTube pilot search corpus using the public Data API."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ENDPOINT = "https://www.googleapis.com/youtube/v3/search"
HERE = Path(__file__).resolve().parent


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_suffix(path.suffix + ".tmp")
    pending.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    pending.replace(path)


def request_page(params, api_key):
    request = Request(f"{ENDPOINT}?{urlencode(params)}", headers={"X-Goog-Api-Key": api_key})
    try:
        with urlopen(request, timeout=25) as response:
            return json.load(response)
    except HTTPError as error:
        # Raw errors can contain credentials or echoed request data.
        raise RuntimeError(f"YouTube Data API returned HTTP {error.code}") from None
    except (URLError, TimeoutError):
        raise RuntimeError("YouTube Data API connection failed or timed out") from None


def collect_query(spec, start, end, api_key):
    earliest, latest = (datetime.fromisoformat(value.replace("Z", "+00:00")) for value in (start, end))
    params = {
        "part": "snippet", "type": "video", "order": "relevance",
        "q": spec["query"], "publishedAfter": start,
        "publishedBefore": end,
    }
    results = {}
    pages = 0
    seen_tokens = set()
    while len(results) < spec["limit"]:
        payload = request_page({**params, "maxResults": spec["limit"] - len(results)}, api_key)
        pages += 1
        for item in payload.get("items", []):
            meta = item["snippet"]
            published = meta["publishedAt"]
            if earliest <= datetime.fromisoformat(published.replace("Z", "+00:00")) < latest:
                video_id = item["id"]["videoId"]
                results.setdefault(video_id, {
                    "video_id": video_id,
                    "channel_id": meta["channelId"],
                    "channel": meta["channelTitle"],
                    "published_at_utc": published,
                    "title": meta["title"],
                    "description_excerpt": meta.get("description", "")[:300],
                })
        token = payload.get("nextPageToken")
        if not token or len(results) >= spec["limit"]:
            break
        if token in seen_tokens:
            raise RuntimeError("YouTube Data API repeated a page token")
        seen_tokens.add(token)
        params["pageToken"] = token
    return {
        "searched_at_utc": datetime.now(timezone.utc).isoformat(),
        "pages": pages,
        "end_reason": "limit_reached" if len(results) >= spec["limit"] else "index_exhausted",
        "has_more": bool(token),
        "candidates": list(results.values())[:spec["limit"]],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cohort", type=Path, default=HERE / "cohort-v1.json")
    args = parser.parse_args()
    cohort = json.loads(args.cohort.read_text(encoding="utf-8"))
    snapshot = {k: cohort[k] for k in ("id", "period_utc", "queries")}
    state = {"source": "youtube_data_api_v3_search_list", "scope": snapshot, "queries": {}}
    if args.output.exists():
        state = json.loads(args.output.read_text(encoding="utf-8"))
        if state["scope"] != snapshot:
            parser.error("output belongs to a different cohort")
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        parser.error("set the YOUTUBE_API_KEY environment variable")
    period = snapshot["period_utc"]
    for index, query in enumerate(snapshot["queries"]):
        key = str(index)
        if key in state["queries"]:
            continue
        try:
            result = collect_query(query, period["start_inclusive"], period["end_exclusive"], api_key)
        except RuntimeError as error:
            print(f"Query {index}: {error}", file=sys.stderr)
            return 1
        state["queries"][key] = result
        atomic_write(args.output, state)
        print(f"Query {index}: {len(result['candidates'])} candidates ({result['end_reason']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
