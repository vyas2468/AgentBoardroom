import json,sys
src,out=sys.argv[1],sys.argv[2]
h=open(src,encoding='utf-8').read()
layer=open('v81.js',encoding='utf-8').read()+'\n'+open('v82.js',encoding='utf-8').read()+'\n'+open('v83.js',encoding='utf-8').read()
rts=open('/home/user/AgentBoardroom/realtest/AlexAligned_Unified_v7_E_History_26.09.2026.rts',encoding='latin1').read()
ps1=open('/home/user/AgentBoardroom/realtest/run_v7_history.ps1',encoding='latin1').read().replace('\r\n','\n').replace('\n','\r\n')
def js(s): return json.dumps(s).replace('</','<\\/')
layer=layer.replace('__HX_RTS__',js(rts)).replace('__HX_PS1__',js(ps1))
assert '__HX_' not in layer
marker='/* ---------- init ---------- */\ndrawQuad();'
assert h.count(marker)==1, h.count(marker)
assert h.count('v81: Ask the terminal')==0
h=h.replace(marker,layer+'\n'+marker)
open(out,'w',encoding='utf-8').write(h)
print('spliced', len(h))
