import json,sys
src,out=sys.argv[1],sys.argv[2]
h=open(src,encoding='utf-8').read()
layer=open('v81.js',encoding='utf-8').read()+'\n'+open('v82.js',encoding='utf-8').read()+'\n'+open('v83.js',encoding='utf-8').read()+'\n'+open('v84.js',encoding='utf-8').read()+'\n'+open('v85.js',encoding='utf-8').read()+'\n'+open('v86.js',encoding='utf-8').read()+'\n'+open('v87.js',encoding='utf-8').read()+'\n'+open('v88.js',encoding='utf-8').read()+'\n'+open('v89.js',encoding='utf-8').read()+'\n'+open('v90.js',encoding='utf-8').read()+'\n'+open('v91.js',encoding='utf-8').read()+'\n'+open('v92.js',encoding='utf-8').read()+'\n'+open('v93.js',encoding='utf-8').read()+'\n'+open('v94.js',encoding='utf-8').read()+'\n'+open('v95.js',encoding='utf-8').read()+'\n'+open('v96.js',encoding='utf-8').read()+'\n'+open('v97.js',encoding='utf-8').read()+'\n'+open('v98.js',encoding='utf-8').read()+'\n'+open('v99.js',encoding='utf-8').read()+'\n'+open('v100.js',encoding='utf-8').read()+'\n'+open('v101.js',encoding='utf-8').read()+'\n'+open('v102.js',encoding='utf-8').read()+'\n'+open('v103.js',encoding='utf-8').read()+'\n'+open('v104.js',encoding='utf-8').read()+'\n'+open('v105.js',encoding='utf-8').read()
rts=open('/home/user/AgentBoardroom/realtest/AlexAligned_Unified_v7_E_History_26.09.2026.rts',encoding='latin1',newline='').read().replace('\r\n','\n').replace('\n','\r\n')
ps1=open('/home/user/AgentBoardroom/realtest/run_v7_history.ps1',encoding='latin1').read().replace('\r\n','\n').replace('\n','\r\n')
def js(s): return json.dumps(s).replace('</','<\\/')
bat=open('/home/user/AgentBoardroom/realtest/Run_AlexAligned_v7_History.bat',encoding='latin1').read().replace('\r\n','\n').replace('\n','\r\n')
layer=layer.replace('__HX_RTS__',js(rts)).replace('__HX_PS1__',js(ps1)).replace('__HX_BAT__',js(bat))
assert '__HX_' not in layer
marker='/* ---------- init ---------- */\ndrawQuad();'
assert h.count(marker)==1, h.count(marker)
assert h.count('v81: Ask the terminal')==0
h=h.replace(marker,layer+'\n'+marker)
# header wording (requested): two exact text edits, nothing else in the page
for a,b in [('<div class="eyebrow">AlexAligned Cross-Sectional Master v3 &middot; RealTest scan</div>','<div class="eyebrow">CROSS-SECTIONAL MASTER - RT SCAN</div>'),
            ('Deterministic engines only &mdash; StepMA with Alex bands,','Deterministic engines only &mdash; StepMA,')]:
    assert h.count(a)==1, a
    h=h.replace(a,b)
open(out,'w',encoding='utf-8').write(h)
print('spliced', len(h))
