"""Rebuild the author ranking from audited Reddit evidence. Standard library only."""
import argparse
import csv
import json
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent

def calendar_months(start, end):
    month = date.fromisoformat(start + '-01')
    stop = date.fromisoformat(end + '-01')
    if month > stop:
        raise ValueError('Start month follows end month')
    while month <= stop:
        yield month.strftime('%Y-%m')
        month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', default='2025-11')
    parser.add_argument('--end', default='2026-10')
    args = parser.parse_args()
    months = list(calendar_months(args.start, args.end))
    names = json.loads((HERE / 'tools.json').read_text())
    authors = defaultdict(set)
    monthly = defaultdict(set)
    records = set()
    monthly_global = defaultdict(set)
    with (HERE / 'evidence.csv').open(newline='') as stream:
        for row in csv.DictReader(stream):
            tool = row['tool']
            month = row['month_utc']
            username = row['author'].strip().casefold()
            created = datetime.fromisoformat(row['published_utc'].replace('Z','+00:00'))
            assert created.astimezone(timezone.utc).strftime('%Y-%m') == month
            assert username and username not in {'[removed]', '[deleted]', 'automoderator'}
            assert row['subreddit'] in {'osr','rpg','mapmaking'}
            assert tool in names and row['kind'] in {'posts','comments'}
            k = tool, row['kind'], row['id']
            assert k not in records, k
            records.add(k)
            if month not in months:
                continue
            authors[tool].add(username)
            monthly[tool,month].add(username)
            monthly_global[month].add(username)
    if not authors:
        raise SystemExit('No audited evidence in selected months')
    ordered = sorted(authors, key=lambda t:(-len(authors[t]), names[t].casefold(), t))
    def rank(counts, n):
        return 1 + sum(v > n for v in counts) if n else ''
    counts = [len(authors[t]) for t in ordered]
    with (HERE/'ranking.csv').open('w',newline='') as out, (HERE/'monthly.csv').open('w',newline='') as long:
        w = csv.writer(out,lineterminator='\n')
        m = csv.writer(long,lineterminator='\n')
        w.writerow(['rank_observed','tool_id','tool','unique_authors_period'] + months)
        m.writerow(['month_utc','rank_observed','tool_id','tool','unique_authors_month'])
        for t in ordered:
            n = len(authors[t])
            w.writerow([rank(counts,n),t,names[t],n]+[len(monthly[t,mo]) for mo in months])
        for mo in months:
            totals = {t:len(monthly[t,mo]) for t in ordered}
            for t in sorted(ordered,key=lambda t:(-totals[t],names[t].casefold(),t)):
                m.writerow([mo,rank(totals.values(),totals[t]),t,names[t],totals[t]])
    summary = {'period':[months[0],months[-1]],'tools':len(ordered),
               'distinct_authors_all_tools':len(set.union(*authors.values())),
               'distinct_authors_per_tool_total':sum(counts),
               'unique_authors_any_tool_per_month':{mo:len(monthly_global[mo]) for mo in months}}
    print(json.dumps(summary,ensure_ascii=False))
if __name__ == '__main__':
    main()

