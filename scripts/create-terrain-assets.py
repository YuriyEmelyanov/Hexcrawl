"""Build the 20 authored transparent cartographic SVG overlays and tree placeholder.
No hex outlines or opaque background. Compositions span the whole hex; POIs may overlap terrain.
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

# Four distinct landforms per family, authored at tile scale. No central void.
def mountain_range(peaks, base):
    contour=f'M{peaks[0][0]-14} {base}' + ''.join(f'L{x} {y}L{x+9} {y+17}' for x,y in peaks) + f'L{peaks[-1][0]+20} {base}'
    art=path(contour+'Z','none',0,'#B6B3A7',1)
    for x,y in peaks:
        art+=path(f'M{x} {y}L{x+9} {y+17}L{x+20} {base}L{x+3} {base-3}L{x+4} {y+23}Z','none',0,'#615F50',.48)
        art+=path(f'M{x} {y}L{x-3} {y+12}L{x+2} {y+22}L{x-2} {base-4}','#4A4B40',1.15)
        art+=path(f'M{x+6} {y+20}L{x+12} {base-5}M{x+9} {y+24}L{x+16} {base-3}','#696654',.8)
    return art+path(contour,'#3E4437',1.65)
def ridge(d,base):
    return path(d+base+'Z','none',0,'#6C8051',.30)+path(d,'#435238',1.7)
mountains=[
 mountain_range([(26,29),(48,12),(72,31)],72)+mountain_range([(24,57),(52,41),(76,62)],99),
 mountain_range([(30,22),(56,39)],78)+mountain_range([(27,54),(62,19),(78,53)],99),
 mountain_range([(20,42),(40,25),(62,39),(77,48)],83)+mountain_range([(37,59),(61,53)],103),
 mountain_range([(32,32),(59,12),(75,37)],84)+mountain_range([(21,66),(46,48),(71,70)],101)]
hills=[
 ridge('M8 52Q19 20 38 34Q53 49 67 43Q79 39 92 58','L87 68Q64 54 43 58Q23 65 8 59')+ridge('M8 81Q24 51 45 62Q62 81 91 75','L86 88Q63 91 44 77Q21 68 8 89')+ridge('M25 101Q44 79 65 91Q72 97 78 98','L70 106Q49 95 30 107'),
 ridge('M20 35Q43 8 66 32Q74 41 86 43','L83 54Q59 45 48 34Q35 26 20 44')+ridge('M7 67Q26 36 49 56Q63 69 90 58','L91 71Q67 83 47 66Q26 51 8 78')+ridge('M12 92Q39 63 64 82Q78 92 86 88','L79 100Q60 94 48 90Q29 79 19 101'),
 ridge('M9 51Q32 20 57 35Q65 41 83 38','L90 51Q67 60 48 44Q30 34 9 61')+ridge('M9 84Q28 72 42 48Q55 27 78 58Q86 68 92 69','L90 82Q72 74 60 57Q48 52 39 77Q28 93 14 94')+ridge('M32 105Q48 79 66 83Q76 84 85 94','L74 103Q56 91 40 109'),
 ridge('M15 43Q28 16 43 29Q54 47 68 37Q74 31 85 44','L89 57Q67 49 56 50Q35 38 20 52')+ridge('M7 72Q28 42 50 68Q60 81 74 57Q82 47 93 66','L89 82Q74 73 66 87Q45 89 34 67Q20 62 9 82')+ridge('M19 96Q37 74 54 91Q63 101 78 94','L70 107Q52 102 39 94Q26 91 23 101')]
pools=[
 ['M13 45Q24 30 43 42T81 39Q93 48 78 59Q62 63 44 53T13 58Z','M18 81Q40 63 57 78T86 83Q83 99 63 94T27 98Z'],
 ['M33 22Q58 15 62 35T47 62Q31 67 26 52T33 22Z','M17 74Q31 57 40 72T67 68Q85 62 88 79T64 96Q47 86 30 98T17 74Z'],
 ['M11 52Q27 39 36 48T56 48Q69 32 82 42T88 63Q65 64 55 72T29 66Q12 72 11 52Z','M35 88Q48 78 60 87T76 92Q65 108 47 101T35 88Z'],
 ['M23 32Q43 21 46 37T31 57Q17 52 23 32Z','M56 43Q74 31 84 49T75 73Q55 67 56 43Z','M14 80Q29 65 45 78T75 80Q84 91 70 101T45 94Q22 103 14 80Z']]
reed_layouts=[[(24,31),(62,29),(84,58),(37,64),(16,72),(62,73),(42,98),(79,97)],[(28,26),(70,38),(19,55),(54,56),(81,62),(39,79),(21,96),(69,99)],[(39,24),(67,33),(19,41),(44,55),(82,72),(21,83),(58,80),(76,101)],[(42,24),(20,61),(70,30),(44,64),(88,81),(27,85),(57,91),(39,103)]]
def swamp_art(i):
    art=''.join(path(d,'#526C55',1.1,'#638E87',.65) for d in pools[i])
    art+=''.join(group(x,y,.62+(j%3)*.12,marsh((j+i)%4)) for j,(x,y) in enumerate(reed_layouts[i]))
    art+=path('M27 48L36 48M56 52L70 52M32 85L41 85M57 90L70 90','#496B60',1)
    return art
# Plain compositions: diagonal grassland, central meadow, staggered bands, long tufts.
plains=[[(22,33),(44,42),(66,51),(79,69),(51,74),(29,87),(56,100)],[(48,23),(29,43),(61,40),(45,59),(75,68),(23,74),(52,83),(59,100)],[(32,26),(64,32),(18,53),(45,52),(79,56),(29,76),(61,77),(46,99)],[(49,20),(23,41),(70,44),(42,63),(18,74),(75,82),(40,93),(60,102)]]
def plain_art(i):
    art=''.join(group(x,y,.85+(j%3)*.2,grass((j+i)%4)) for j,(x,y) in enumerate(plains[i]))
    curves=['M15 62Q36 49 61 62T89 66','M23 91Q35 78 51 85M20 33Q40 28 65 33','M12 64Q38 70 68 63M35 90Q54 85 79 88','M30 30Q40 39 34 53M55 71Q66 76 84 73']
    return art+path(curves[i],'#7C8B58',1,opacity=.55)
dry_forms=[
 'M9 63Q26 37 48 53T90 60M15 89Q42 62 68 86M34 103Q58 88 77 96',
 'M19 42Q42 24 72 42M8 78Q28 46 50 67T91 73M30 98Q55 78 78 91',
 'M10 59Q33 54 48 29Q61 15 76 39M18 87Q49 82 66 55Q81 42 90 64M38 103Q65 85 80 94',
 'M15 42Q37 27 55 40T82 43M9 66Q32 48 57 64T91 66M15 88Q40 69 59 86T82 91']
def dry_art(i):
    art=path(dry_forms[i],'#8A7754',1.4)
    positions=[[(31,29),(67,70),(27,82),(60,97)],[(61,28),(29,55),(77,58),(46,87)],[(28,42),(67,46),(28,72),(66,93)],[(47,24),(22,56),(70,77),(41,98)]][i]
    return art+''.join(group(x,y,1+(j%2)*.2,dry((i+j)%4)) for j,(x,y) in enumerate(positions))
compositions={'mountains':mountains,'open_hills':hills,'swamp':[swamp_art(i) for i in range(4)],'open_plains':[plain_art(i) for i in range(4)],'semi_desert':[dry_art(i) for i in range(4)]}
for biome,variants in compositions.items():
    for n,content in enumerate(variants,1):
        (OUT/f'{biome}-{n}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116">{content}</svg>\n')
tree=path('M47 39L48 24L52 24L53 39','none',0,'#665840')+path('M49 28Q37 31 35 23Q29 21 34 14Q32 7 40 7Q43 -1 50 3Q57 -1 62 7Q70 8 67 16Q72 22 64 25Q62 32 52 28Z','#3D4B33',1.5,'#81945F',.95)+path('M38 20Q40 15 45 18M49 10Q53 7 57 12M54 23Q58 19 63 21','#50613C',1)+path('M43 41Q50 43 57 41','#68734E',1)
(OUT/'tree.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116"><g transform="translate(0 10)">{tree}</g></svg>\n')
print('Created 20 terrain overlays and one tree placeholder.')
