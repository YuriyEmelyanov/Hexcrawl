"""Build the 20 authored transparent cartographic SVG overlays and tree placeholder.
No hex outlines or opaque background. Layouts leave the centre clear for a POI.
"""
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/terrain/v2'
OUT.mkdir(parents=True, exist_ok=True)

def path(d,stroke='#425039',width=1.35,fill='none',opacity=1):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}" stroke-linecap="round" stroke-linejoin="round"/>'
def group(x,y,scale,content):
    return f'<g transform="translate({x} {y}) scale({scale})">{content}</g>'
def grass(style):
    shapes=[
        'M-5 2Q-3 -2 -5 -5M0 2Q2 -3 1 -8M4 2L7 -3M-7 3Q0 5 8 3',
        'M-4 2L-7 -3M-1 2Q-3 -5 0 -6M3 2L6 -4M-6 3L6 3',
        'M-5 2L-7 -1M-1 2Q1 -3 -1 -5M4 2L7 -1M-5 4Q0 5 5 4',
        'M-5 3Q-2 0 -3 -4M1 2L3 -7M4 3L8 -2M-7 4L7 4']
    return path(shapes[style], '#526441',1.25)
def hill(style):
    crests=['M-18 7Q-10 3 -5 -3Q0 -9 6 -2Q12 4 20 6',
            'M-21 7Q-11 5 -4 -5Q0 -10 7 -2Q12 4 19 5',
            'M-17 6Q-10 5 -3 -2Q2 -10 8 -1Q12 2 18 4',
            'M-20 7Q-12 7 -6 0Q-1 -10 5 -4Q11 4 21 6']
    shade=path('M0 -5Q5 0 15 6Q8 8 1 6Z','none',0,'#718458',.28)
    return shade+path(crests[style], '#414A35',1.5)+path('M4 0Q7 4 11 5M6 5L9 7','#65734F',.8)
def mountain(style):
    outlines=['M-21 13L-14 6L-3 -13L4 -4L8 -7L22 13',
              'M-23 13L-11 -4L-5 1L3 -16L12 1L22 12',
              'M-20 12L-13 -1L-8 3L1 -14L11 4L16 0L24 13',
              'M-24 12L-14 1L-5 -15L4 -2L10 -6L22 12']
    # Warm mineral wash and broken ridge hatching; no white snow or opaque tile.
    peakx=[-3,3,1,-5][style];peaky=[-13,-16,-14,-15][style]
    shade=path(f'M{peakx} {peaky}L{peakx+5} 4L18 13L2 10Z','none',0,'#797461',.3)
    ridge=path(f'M{peakx} {peaky}L{peakx-1} -2L{peakx+3} 3L{peakx+1} 8','#565348',1)
    return shade+path(outlines[style],'#46483E',1.55)+ridge+path('M7 5L13 12M9 4L16 12M-19 15L-8 15M6 16L18 16','#666755',.8)
def marsh(style):
    base=path('M-17 7Q-10 3 -3 6Q2 9 14 6Q18 8 12 10Q0 13 -13 10Z','none',0,'#638E87',.35)
    water=path(['M-18 8Q-9 10 -4 8M3 11Q10 13 18 10','M-16 10L-4 10M3 8Q10 11 16 8','M-18 7Q-11 10 -5 8M0 12L16 12','M-15 11Q-8 13 0 10M7 8L17 8'][style],'#536E5B',1)
    reeds=path('M-7 6L-8 -7M-2 7L-1 -11M4 7L6 -4M-8 1L-12 -3M-1 1L3 -4','#43513A',1.2)
    heads=path('M-8 -9L-8 -5M-1 -13L-1 -9','#706044',2.8)
    return base+water+reeds+heads
def dry(style):
    stone=path(['M-12 4L-9 -1L-3 -2L1 4Z','M-12 4L-8 -3L-3 0L0 4Z','M-11 5L-10 0L-4 -3L2 4Z','M-12 5L-7 -2L-2 -1L1 5Z'][style],'#72674D',1.15,'#A39875',.7)
    tuft=path('M8 6L5 0M9 6L10 -3M11 6L15 1M5 8L15 8','#7D7550',1)
    dust=path('M-15 9L-10 9M-3 10L0 10','#98845F',.8)
    return stone+tuft+dust

# Each composition was laid out separately, not a rotated copy. Broad transparent
# central channel at y~58 and irregular negative space remain for map symbols.
layouts={
'open_plains':[
 [(37,26,.8,0),(72,42,.65,2),(24,76,.75,1),(62,91,.6,3)],
 [(56,23,.8,1),(24,42,.55,0),(74,77,.75,3),(43,94,.55,2)],
 [(35,31,.65,2),(72,34,.7,0),(23,78,.6,3),(59,88,.85,1)],
 [(49,22,.6,3),(25,39,.8,1),(78,65,.55,2),(51,91,.75,0)]],
'open_hills':[
 [(44,28,.95,0),(69,76,.8,2),(32,88,.62,1)],
 [(58,29,1.05,1),(27,76,.75,3),(67,92,.55,0)],
 [(38,29,.8,2),(76,42,.5,0),(50,85,1,3)],
 [(49,24,.8,3),(23,75,.58,0),(67,86,.83,1)]],
'mountains':[
 [(46,29,.95,0),(67,81,.65,2),(28,83,.5,1)],
 [(54,30,.93,1),(30,81,.73,3),(74,76,.45,0)],
 [(35,33,.7,2),(67,30,.55,0),(55,84,.87,1)],
 [(51,29,.96,3),(28,80,.55,1),(69,87,.55,2)]],
'swamp':[
 [(39,28,.8,0),(75,76,.6,2),(34,87,.73,1)],
 [(59,29,.85,1),(24,73,.6,3),(60,91,.7,0)],
 [(34,32,.65,2),(71,37,.5,0),(47,86,.85,3)],
 [(50,24,.75,3),(25,80,.7,0),(72,80,.6,1)]],
'semi_desert':[
 [(43,27,.78,0),(73,77,.65,2),(27,87,.7,1)],
 [(58,25,.85,1),(24,76,.7,3),(60,93,.6,0)],
 [(34,30,.7,2),(76,41,.55,0),(50,86,.9,3)],
 [(50,24,.85,3),(25,82,.6,0),(74,77,.7,1)]]}
functions={'open_plains':grass,'open_hills':hill,'mountains':mountain,'swamp':marsh,'semi_desert':dry}
for biome,variants in layouts.items():
    for n,layout in enumerate(variants,1):
        content=''.join(group(x,y,scale,functions[biome](style)) for x,y,scale,style in layout)
        (OUT/f'{biome}-{n}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116">{content}</svg>\n')
tree=path('M47 39L48 24L52 24L53 39','none',0,'#665840')+path('M49 28Q37 31 35 23Q29 21 34 14Q32 7 40 7Q43 -1 50 3Q57 -1 62 7Q70 8 67 16Q72 22 64 25Q62 32 52 28Z','#3D4B33',1.5,'#81945F',.95)+path('M38 20Q40 15 45 18M49 10Q53 7 57 12M54 23Q58 19 63 21','#50613C',1)+path('M43 41Q50 43 57 41','#68734E',1)
(OUT/'tree.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116"><g transform="translate(0 10)">{tree}</g></svg>\n')
print('Created 20 terrain overlays and one tree placeholder.')
