"""Rebuild calendar and annual intervals from accepted primary-source observations."""
import argparse
import csv
import json
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

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

def validate_source_link(row):
    url = urlsplit(row['permalink'].strip())
    parts = url.path.strip('/').split('/')
    thread = row['thread_id']
    if (url.scheme != 'https' or url.netloc.lower() not in
            {'reddit.com', 'www.reddit.com', 'old.reddit.com', 'np.reddit.com'}
            or not thread or not row['id']
            or parts[:4] != ['r', row['subreddit'], 'comments', thread]):
        raise ValueError(f'Permalink does not match Reddit thread: {row["id"]}')
    if row['kind'] == 'comments':
        if len(parts) != 6 or parts[-1] != row['id']:
            raise ValueError(f'Permalink does not identify the comment: {row["id"]}')
    elif len(parts) not in (4, 5) or thread != row['id']:
        raise ValueError(f'Permalink does not identify the post: {row["id"]}')


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
    for tool_id, item in tools.items():
        kinds = set(item.get('types') or [])
        if tool_id not in eligible or item.get('software') is not True or not kinds or not kinds <= digital_types:
            raise ValueError(f'Ineligible product or non-digital catalog category: {tool_id}')
    # A valid product can still have individual comments ruled out by the source review.
    with (ROOT/'context-review.csv').open(newline='') as stream:
        excluded = {
            (row['tool'], row['kind'], row['id'])
            for row in csv.DictReader(stream) if row['decision'] != 'confirmed'
        }
    by_period = defaultdict(lambda: defaultdict(set))
    seen = set()
    with (ROOT/'evidence.csv').open(newline='') as stream:
        for row in csv.DictReader(stream):
            author = row['author'].strip().casefold()
            tool = row['tool']
            month = row['month_utc']
            published = row['published_utc']
            if len(published) == 10:
                utc_day = date.fromisoformat(published)
            else:
                timestamp = datetime.fromisoformat(published.replace('Z', '+00:00'))
                if timestamp.tzinfo is None:
                    raise ValueError(f'Missing UTC offset: {published}')
                utc_day = timestamp.astimezone(timezone.utc).date()
            if utc_day.strftime('%Y-%m') != month:
                raise ValueError(f'Inconsistent calendar month: {row["id"]}')
            if not row['permalink'].strip() or not row['decision_basis_ru'].strip():
                raise ValueError(f'Missing primary evidence: {row["id"]}')
            if not author or author in {'[removed]', '[deleted]', 'automoderator'}:
                raise ValueError(f"Missing identifiable author: {row['id']}")
            if row['subreddit'] not in {'osr', 'rpg', 'mapmaking'} or row['kind'] not in {'posts', 'comments'}:
                raise ValueError(f"Invalid source collection: {row['id']}")
            validate_source_link(row)
            key = tool, row['kind'], row['id']
            if key in seen or tool not in tools:
                raise ValueError(f'Duplicate or ineligible observation: {key}')
            if key in excluded:
                raise ValueError(f'Observation excluded by source review: {key}')
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
    names = {tool: item['name'] for tool, item in sorted(tools.items())}
    (ROOT.parent / 'tools.json').write_text(json.dumps(names, ensure_ascii=False, indent=2) + '\n')

    # The parent directory exposes the same data to historical callers.
    for name in ('ranking.csv','monthly.csv','evidence.csv'):
        (ROOT.parent/name).write_bytes((ROOT/name).read_bytes())

if __name__ == '__main__':
    main()
