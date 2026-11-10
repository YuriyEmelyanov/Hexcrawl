"""Finite arithmetic checks of registered source profiles; NOT product implementation."""
import json,collections,itertools,sys
from pathlib import Path
r=Path(sys.argv[1]);rules={x['id']:x for x in json.loads((r/'agent-work/market/rules/Shadowdark-Core.json').read_text())['rules']}
p=rules['SD-CORE-047']['parameters'];keys=p['ordered_category_keys'];ranges=p['roll_intervals'];pairs=list(itertools.product(range(1,7),repeat=2))
def initial(a,b):return next(i for i,(lo,hi)in enumerate(ranges)if lo<=a+b<=hi)
def action(a,b):return 'plus1'if a+b<=3 else 'same'if a+b<=8 else 'plus2'if a+b<=11 else 'reroll'
weights=[sum(initial(a,b)==i for a,b in pairs)for i in range(7)];assert weights==p['derived_weights_out_of_36']
actions=dict(collections.Counter(action(a,b)for a,b in pairs));assert actions==rules['SD-CORE-048']['parameters']['derived_action_weights_out_of_36']
transitions=[]
for current in range(7):
 counts=[0]*7
 for a,b in pairs:
  for c,d in pairs:
   step=action(a,b);target=initial(c,d)if step=='reroll'else(current+{'plus1':1,'same':0,'plus2':2}[step])%7;counts[target]+=1
 assert sum(counts)==1296
 # Each non-reroll pair is represented36 times; one reroll pair adds native terrainweights.
 expected=[weights[i]+36*(23*(i==current)+3*(i==(current+1)%7)+9*(i==(current+2)%7))for i in range(7)]
 assert counts==expected;transitions.append({'current':keys[current],'target_counts_out_of_1296':counts})
assert (6+1)%7==0 and(5+2)%7==0 and(6+2)%7==1
presence=[int(n==1)for n in range(1,7)];assert presence==[1,0,0,0,0,0]
danger=rules['SD-CORE-049']['parameters']['danger_intervals'];danger_counts={k:hi-lo+1 for k,(lo,hi)in danger.items()};assert danger_counts==rules['SD-CORE-049']['parameters']['danger_weights_out_of_6']
json.dump({'kind':'source_profile_reference_arithmetic_not_product_runtime','source_matrix':'agent-work/market/rules/Shadowdark-Core.json','initial_36_pair_counts':weights,'new_hex_36_pair_actions':actions,'category_order':keys,'transition_checks':transitions,'joint_outcomes_checked':7*36*36,'presence_fixed_results':presence,'danger_outcome_counts':danger_counts,'scale_guard':{'source_native_hex':'6 miles across; exact side/vertex convention unspecified','placement_unit':'one presence check per native overland hex, not per rendered subcell','conditional_illustration':'If identical geometry conventions are explicitly assumed, one6milehex area equals36 one-milehex areas. Applying1/6 per subcell raises expecteddensity36fold; this assumption is not a proved mapping to current051.','not_rating_metric':True},'result':'pass','limitations':['Not a product generator or statistical audience sample.','No long-runstationary model or rankingweight introduced.','Batch traversal order, geometry/subtype choices and same-vs-independent POIcolumns not resolved by arithmetic.']},open(sys.argv[2],'w'),ensure_ascii=False,indent=2)
print('PASS:36initial+36actions+9072jointtransitions+6presence+6danger finite source checks')
