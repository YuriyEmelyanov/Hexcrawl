"""Check candidate coverage and build the combined Reddit and YouTube pilot table."""

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHANNEL_ID = re.compile(r"UC[A-Za-z0-9_-]{22}")
FINAL_DECISIONS = {"confirmed_independent", "confirmed_official", "out_of_scope",
                   "different_product", "out_of_period", "excluded_metadata"}


def read_csv(path):
    with path.open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


def read_native(path, cohort):
    if not path.exists():
        return [], False
    native = json.loads(path.read_text(encoding="utf-8"))
    expected = {key: cohort[key] for key in ("id", "period_utc", "queries")}
    if native["scope"] != expected or native["source"] != "youtube_data_api_v3_search_list":
        raise ValueError("Native results belong to a different search scope")
    records = native["queries"]
    complete = set(records) == {str(i) for i in range(len(cohort["queries"]))}
    candidates = [item for result in records.values() for item in result["candidates"]]
    return candidates, complete


def verified_pairs(evidence, period):
    counts = defaultdict(set)
    period_start, period_end = (datetime.fromisoformat(period[key].replace("Z", "+00:00"))
                                for key in ("start_inclusive", "end_exclusive"))
    for row in evidence:
        decision = row["decision"]
        if decision not in {"confirmed_independent", "confirmed_official"}:
            continue
        channel, video, tool = (row[k] for k in ("channel_id", "video_id", "tool_id"))
        affiliation = decision.removeprefix("confirmed_")
        date = datetime.fromisoformat(row["date"].replace("Z", "+00:00"))
        # Date-only evidence in the ledger is a UTC calendar date.
        date = date.replace(tzinfo=period_start.tzinfo) if date.tzinfo is None else date
        if (row["evidence_basis"] != "video_fragment_verified"
                or row["affiliation"] != affiliation or not tool or not video
                or not CHANNEL_ID.fullmatch(channel)
                or not row["timestamp_seconds"].isdigit() or not period_start <= date < period_end):
            raise ValueError(f"Invalid confirmed evidence for video {video}")
        counts[tool, affiliation].add(channel)
    return counts


def ranking_rows(cohort, evidence, candidates, search_complete):
    counts = verified_pairs(evidence, cohort["period_utc"])
    evidence_by_video = defaultdict(list)
    for entry in evidence:
        evidence_by_video[entry["video_id"]].append(entry)
    pilot_tools = {tool["id"] for tool in cohort["entries"]}
    pending = {video for video, entries in evidence_by_video.items()
               if any(e["decision"] not in FINAL_DECISIONS
                      and (not e["tool_id"] or e["tool_id"] in pilot_tools) for e in entries)}
    source_ids = {item["video_id"] for item in candidates}
    reviewed = search_complete and not pending and source_ids <= evidence_by_video.keys()
    rows = []
    for tool in cohort["entries"]:
        tool_id = tool["id"]
        independent = len(counts[tool_id, "independent"])
        rows.append({
            "group": tool["group"],
            "tool_id": tool_id,
            "tool": tool["name"],
            "reddit_authors": tool["reddit_authors"],
            "youtube_independent_channels": independent if reviewed or independent else "",
            "youtube_official_channels_verified": len(counts[tool_id, "official"]) if reviewed or counts[tool_id, "official"] else "",
            "reddit_plus_youtube_confirmed_min": tool["reddit_authors"] + independent,
            "combined_rank": "",
            "coverage": "complete" if reviewed else "incomplete",
        })
    if reviewed:
        totals = Counter(row["reddit_plus_youtube_confirmed_min"] for row in rows)
        rows.sort(key=lambda row: (-row["reddit_plus_youtube_confirmed_min"], row["tool_id"]))
        place, ranks = 1, {}
        for total, count in sorted(totals.items(), reverse=True):
            ranks[total] = str(place) if count == 1 else f"{place}–{place + count - 1}"
            place += count
        for row in rows:
            row["combined_rank"] = ranks[row["reddit_plus_youtube_confirmed_min"]]
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cohort", type=Path, default=HERE / "cohort-v1.json")
    parser.add_argument("--evidence", type=Path, default=HERE / "evidence.csv")
    args = parser.parse_args()
    cohort = json.loads(args.cohort.read_text(encoding="utf-8"))
    candidates, complete = read_native(args.native, cohort)
    rows = ranking_rows(cohort, read_csv(args.evidence), candidates, complete)
    with args.output.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
