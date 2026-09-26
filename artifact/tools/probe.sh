#!/bin/bash
# usage: ./probe.sh qfile out  (with history)
cd "$(dirname "$0")"; export NODE_PATH=/opt/node22/lib/node_modules
QFILE=$1 timeout 300 node harness.js site_new $2 real_hist.csv >/dev/null 2>&1
python3 -c "
import json,sys
d=json.load(open('$2'))
for x in d['answers']: print('Q:',x['q'],'\n  ',x['a'][:${3:-400}].replace('\n',' | '))
print([e for e in d['errs'] if 'pageerror' in e])"
