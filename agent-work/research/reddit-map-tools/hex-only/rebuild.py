"""Rebuild calendar and annual intervals from accepted primary-source observations."""
import argparse
import csv
import json
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def calendar_months(start, end):
    month = date.fromisoformat(start + '-01')
    stop = date.fromisoformat(end + '-01')
    if month > stop:
        raise ValueError('Start month follows end month')
    while month <= stop:
        yield month.strftime('%Y-%m')
        month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)



def ranks(counts):
    groups = defaultdict(list)
    for tool, count in counts.items():
        if count:
            groups[count].append(tool)
    positions = {}
    start = 1
    for count in sorted(groups, reverse=True):
        end = start + len(groups[count]) - 1
        for tool in groups[count]:
            positions[tool] = str(start) if start == end else f'{start}–{end}'
        start = end + 1
    return positions

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', default='2025-11')
    parser.add_argument('--end', default='2026-10')
    args = parser.parse_args()
    months = list(calendar_months(args.start, args.end))
    tools = json.loads((ROOT/'catalog.json').read_text())
    registry = json.loads((ROOT.parent.parent/'competitors'/'registry.json').read_text())
    eligible = {'hexcrawl-ru'}
    digital_types = {'editor', 'generator', 'module', 'functional_module'}
    for entry in registry['entries']:
        review = entry.get('digital_review') or {}
        kinds = set(entry.get('product_types') or [])
        if (kinds and kinds <= digital_types and entry.get('disposition') == 'keep_L1'
                and review.get('decision') == 'keep_L1' and review.get('source')):
            eligible.add(entry['id'])
    if any(t not in eligible or v.get('software') is not True for t,v in tools.items()):
        raise ValueError('Catalog contains ineligible products')
    by_period = defaultdict(lambda: defaultdict(set))
    seen = set()
    with (ROOT/'evidence.csv').open(newline='') as stream:
        for row in csv.DictReader(stream):
            author = row['author'].strip().casefold()
            tool = row['tool']
            month = row['month_utc']
            when = datetime.fromisoformat(row['published_utc'].replace('Z','+00:00'))
            assert when.astimezone(timezone.utc).strftime('%Y-%m') == month
            assert author and author not in {'[removed]', '[deleted]', 'automoderator'}
            assert row['subreddit'] in {'osr','rpg','mapmaking'} and row['kind'] in {'posts','comments'}
            key = tool, row['kind'], row['id']
            assert key not in seen and tool in tools
            seen.add(key)
            if month in months:
                by_period[month][tool].add(author)
                by_period['period'][tool].add(author)
    for filename, periods in [('ranking.csv',['period']),('monthly.csv',months)]:
        with (ROOT/filename).open('w',newline='') as out:
            writer = csv.writer(out, lineterminator='\n')
            writer.writerow(['period_utc','rank_software','tool_id','tool','kind','unique_authors'])
            for period in periods:
                counts = {tool:len(by_period[period][tool]) for tool in by_period['period']}
                software_ranks = ranks(counts)
                for t in sorted(counts, key=lambda t:(-counts[t],tools[t]['name'].casefold(),t)):
                    writer.writerow([period if period!='period' else f'{months[0]}/{months[-1]}',software_ranks.get(t,''),t,tools[t]['name'],' + '.join(tools[t]['types']),counts[t]])
    # The parent directory exposes the same data to historical callers.
    for name in ('ranking.csv','monthly.csv','evidence.csv'):
        (ROOT.parent/name).write_bytes((ROOT/name).read_bytes())

if __name__ == '__main__':
    main()
