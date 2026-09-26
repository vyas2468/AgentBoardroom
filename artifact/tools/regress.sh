#!/bin/bash
# usage: ./regress.sh TAG  -> runs base, tiles, tall, bt, nd against site_new, compares with baselines *_B.json
cd "$(dirname "$0")"; export NODE_PATH=/opt/node22/lib/node_modules; T=$1
rm -f rg_new_$T.json rg_tiles_$T.json rg_bt_$T.json rg_nd_$T.json rg_tall_$T.json
(node harness.js site_new rg_new_$T.json >/dev/null 2>&1 &)
(QFILE=q_tiles.json node harness.js site_new rg_tiles_$T.json real_hist.csv >/dev/null 2>&1 &)
(QFILE=q_botiles.json node harness.js site_new rg_bt_$T.json real_hist.csv >/dev/null 2>&1 &)
(QFILE=q_ndtiles.json node harness.js site_new rg_nd_$T.json real_hist.csv >/dev/null 2>&1 &)
QFILE=q_tall_new.json timeout 400 node harness.js site_new rg_tall_$T.json real_hist.csv >/dev/null 2>&1
timeout 300 bash -c "until [ -f rg_new_$T.json ] && [ -f rg_tiles_$T.json ] && [ -f rg_bt_$T.json ] && [ -f rg_nd_$T.json ]; do sleep 5; done"
python3 - $T <<'P'
import json,sys
T=sys.argv[1]
for base,new in [('r_new30.json','rg_new_%s.json'),('r_tiles30.json','rg_tiles_%s.json'),('r_bt.json','rg_bt_%s.json'),('r_nd2.json','rg_nd_%s.json'),('r_tall12.json','rg_tall_%s.json')]:
    a=json.load(open(base)); b=json.load(open(new%T))
    ch=[x['q'] for x,y in zip(a['answers'],b['answers']) if x['a']!=y['a']]
    print(base, 'same %d/%d'%(len(a['answers'])-len(ch),len(a['answers'])), 'changed:',ch, [e for e in b['errs'] if 'pageerror' in e])
P
