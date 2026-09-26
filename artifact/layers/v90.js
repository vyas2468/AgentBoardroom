/* ================= v90: "Guide" tab in Reference & AI =================
   A new tab, last in the tab row, listed under the "Reference & AI" theme. Tables only: the daily routine, the most important
   features, the part E history, Ask the terminal for trading and for portfolios, relationships and pairs, charts and navigation,
   and the limits. "Open" buttons jump to the tab; "Run" buttons send the question to Ask the terminal. Nothing else changes. */
(function(){
try{
var nav=$("#tab-eng")&&$("#tab-eng").parentNode, engPane=$("#pane-eng"); if(!nav||!engPane||$("#tab-guide")) return;
function hE(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function go(tab,label){ return '<button type="button" class="up-link-btn" data-goto="tab-'+tab+'">'+(label||"Open")+'</button>'; }
function run(q){ return '<code>'+hE(q)+'</code> <button type="button" class="up-link-btn" data-guide-ask="'+hE(q)+'">Run</button>'; }
function table(head,rows){ return '<div class="tbl-scroll"><table class="guide-tbl"><thead><tr>'+head.map(function(h){ return '<th style="text-align:left">'+h+'</th>'; }).join("")+'</tr></thead><tbody>'+
  rows.map(function(r){ return '<tr>'+r.map(function(c,i){ return '<td style="text-align:left;vertical-align:top;'+(i===0?"font-weight:600;min-width:140px":"")+'">'+c+'</td>'; }).join("")+'</tr>'; }).join("")+'</tbody></table></div>'; }
function block(title,lede,html){ return '<div class="block"><div class="block-head"><h2>'+title+'</h2></div>'+(lede?'<p class="lede">'+lede+'</p>':'')+html+'</div>'; }

var S=[];
S.push(block("Guide: how to get the most out of this terminal",
  "Every table below is a short recipe. <b>Open</b> jumps to the tab; <b>Run</b> sends the question to Ask the terminal. Nothing here is a signal on its own: the terminal is built to show where the evidence agrees and where it disagrees, so you decide with more context and fewer surprises.",
  table(["Step","Where","What to look at","Why"],[
  ["1. Load today's scan","Header: <b>Update</b>","The Run workflow tab confirms parts C, B and A, the merge and the ingest gate passed.","Every tab reads the same bar; a stale bar makes every read stale."],
  ["2. Load the price history","Ask the terminal &rarr; <b>Load price history</b> "+go("qry"),"The status line shows symbols &times; bars and the last date. Run part E after the daily workflow (double-click Run_AlexAligned_v7_History.bat).","Unlocks YTD and 12-month returns, drawdowns, real correlations, pair tests, clusters and every part E block."],
  ["3. Read the market","Master "+go("mst")+", Rotation "+go("rot")+", Market Pulse "+go("pulse"),"Which sectors are strong and improving, which are rolling over; breadth and the headline strip.","Direction of the tide first; single names second."],
  ["4. Find the groups that matter","Subsector Web "+go("sbw")+", Rotation Board "+go("rtb")+", Industry Ledger "+go("ild"),"Industries leading or lagging their sector, and which names did the work.","Moves are usually group moves; the group tells you whether a name is being carried or is on its own."],
  ["5. Shortlist names","Ask the terminal "+go("qry")+", Confluence "+go("scr")+", Conviction shortlist "+go("hc"),"Screens that combine trend, strength, volatility and history.","Turns 500 names into 10 you can actually study."],
  ["6. Check each name","Tear sheet (click any ticker), Decision Map "+go("dmp"),"Price against every level, the severity drivers, the part E history block, closest price partners.","One page that shows whether the engines agree about the name."],
  ["7. Check how they fit together","Correlation matrix "+go("cm")+", Hidden Groups "+go("hg")+", Relationship map "+go("ng"),"Are your picks secretly the same bet? Which blocs are moving together?","Diversification is about how names move, not about their labels."],
  ["8. Save and track","Basket builder "+go("bkt")+", Call tracker "+go("ct")+", Runs / History "+go("hst"),"Send a list to the basket; pin calls; save the run.","Your own record is the only honest backtest you have here."]])));

S.push(block("The most important features",
  "What each one is for, why it matters and the best way to use it.",
  table(["Feature","Where","What it shows","Why it matters","How to use it best"],[
  ["Ask the terminal",go("qry"),"Tables on demand from the whole scan and the price history, in plain English, with coverage and cutoff lines.","Every other tab answers one fixed question; Ask answers yours, and shows how it read it.","Combine words: risk level, trend, strength, sector, history. Follow up with “these” (diagnostic of these, pair test these). Open <i>How this was computed</i> when a result surprises you."],
  ["Tear sheet","Click any ticker","Every engine's read on one name, plus the part E block: YTD / 1M to 12M returns against RSP, drawdown, volatility, beta, distance from the 52-week high, the names it moves most like.","Where the engines disagree is the information.","Check the drawdown and the correlation to RSP before you size a position; check “Moves most like it” so you do not buy the same bet twice."],
  ["Rotation and Rotation Board",go("rot")+" "+go("rtb"),"Each sector (or industry) by strength level and direction of change: strong and improving, rolling over, recovering, lagging and falling.","Money moves between groups; being in the improving quadrant is a tailwind.","Prefer longs in strong-and-improving groups; treat rolling-over groups as a warning even for strong names."],
  ["Subsector Web",go("sbw"),"Each sector's industries and their companies as one picture; bullish strength and bearish pressure labels.","Shows which industries carry a sector.","Click an industry to isolate it; save the view as a PNG for your notes."],
  ["Correlation matrix (part E)",go("cm"),"Real daily-return correlation, clustered like Alex's matrix; your own ticker list; plus the hierarchical clusters map of every stock with rising and falling blocks.","Tells you which names are really one position.","Type your shortlist into <b>Your list</b>; if they sit in one bright square, they are one bet. Step through the lime (rising) and orange (falling) blocks."],
  ["Hidden Groups",go("hg"),"Groups joined by 60-day closest peers, checked against a year of prices, plus price-history groups found directly from returns.","Groups that cross sector lines are invisible in a sector view.","Look at the “Holds up” column: a group that is only recent can fall apart."],
  ["Relationship map",go("ng"),"Names that behave alike today; whether those links are also price links; sectors' own correlation; stocks that trade like another sector; relationships breaking or forming; lead-lag candidates.","Separates real relationships from look-alikes.","Use the breaking-down list before relying on a hedge or a pair."],
  ["Radar",go("radar"),"A name's profile on eight scan qualities and six price-history qualities (return, calm, resilience, near high, own path).","Two names with the same score can have very different shapes.","Compare up to three names; a tall Stretch with low Resilience is extended and fragile."],
  ["Sector Warning",go("sw"),"Groups ahead or behind their parent and whether they are improving or weakening.","Early warning before a group turns.","Watch for strong groups moving into the weakening half."],
  ["Decision Map",go("dmp"),"Confirm and fail levels for a list, with two sentences on each.","Turns a list into levels you can act on.","Send an Ask answer to it (“Open in Decision Map”)."],
  ["Save as PNG",'Under every chart',"Any chart, map, graph or matrix exactly as shown, at 3&times; resolution, with a caption.","Notes and sharing without screenshots.","Set the selection first (sector, industry, window, zoom), then save."],
  ["Navigation","Right edge","&uarr; top, &darr; bottom, &#9776; jump to any section of the tab.","Long tabs in one click.","Use &#9776; on the Correlation matrix and Relationship map tabs."]])));

S.push(block("Ask the terminal for trading ideas",
  "Paste or click <b>Run</b>. Every answer shows what it counted, what it left out and the data cutoff. Treat answers as a research shortlist, then check each name on its tear sheet.",
  table(["Goal","Example","What you get","Next step"],[
  ["Strong names with room to run",run("Show 10 strong and improving stocks that are not extended."),"Strength 70+, improving, less than 1 ATR above trend.","Open each tear sheet; check drawdown and 52-week-high distance."],
  ["Early recoveries",run("Show 10 recovering stocks with the lowest volatility."),"Still in a downtrend but turning up fast, calmest first.","Treat as a watch list; wait for the trend flip."],
  ["What is rolling over",run("Show 10 stocks rolling over in Financials."),"Uptrends losing momentum quickly.","Tighten stops or avoid new longs there."],
  ["Breakouts",run("Build an aggressive 8 stock portfolio of stocks breaking out."),"Fresh uptrends just above their trend line.","Check the group is also improving (Rotation Board)."],
  ["Long-horizon quality",run("Stocks in an uptrend with YTD return above 20% and 12M drawdown better than -15%."),"Winners that did not fall hard on the way.","Compare with the benchmark column on the tear sheet."],
  ["Diagnose a list",run("Give me a diagnostic of MGM LVS WYNN"),"Group and per-name returns, volatility, drawdown and correlation to RSP, YTD and 12 months.","Ask “give me a diagnostic of these” after any list."],
  ["Pairs trade check",run("Pair test MGM LVS"),"Cointegration both ways, beta stability, half-life, crossings, spread z-score, eligible or not.","Only an eligible pair with a large z-score is a candidate; a large z-score alone is not."],
  ["Search a group for pairs",run("Top 5 pairs trades in Energy"),"Every pair in the group tested and ranked.","Run the single-pair test on the eligible ones."],
  ["Correlation numbers",run("What is the correlation between NVDA and AMD?")+"<br>"+run("Correlation matrix of XOM CVX COP SLB EOG"),"Four windows, rolling peak and saved severity for a pair; a full matrix with the pair list for several names.","\u201CHow correlated are these\u201D after any list."],
  ["Most / least correlated pairs",run("Most correlated pairs across sectors")+"<br>"+run("Least correlated pairs in Energy"),"Ranked pairs inside a sector, a subsector or across sectors.","Pairs that move as one are one bet; low pairs diversify."],
  ["Independent of the market",run("Which stocks are least correlated with the market?"),"12-month correlation and beta to RSP, lowest first.","Low correlation is not low risk: check the volatility column."],
  ["Clusters moving together",run("Which clusters are rising together?"),"Blocks of names that move as one and all rose over the window.","Pick one name per block; see them drawn on the clusters map."],
  ["Hidden relationships",run("Which relationships are breaking down?"),"Pairs that were tied over the year but not lately.","Be careful with hedges or pairs built on them."],
  ["Price partners and hedges",run("Hedges for NVDA in other sectors"),"Names that moved most opposite over the year.","A statistical hedge only; check it holds over 60 bars too."],
  ["Lead-lag ideas",run("What leads Semiconductors?"),"Groups whose moves have tended to come a day or more earlier, with a check in both halves of the year.","Ideas to watch, not signals; most lead-lag is weak."]])));

S.push(block("Ask the terminal for building portfolios",
  "A repeatable way to go from the whole scan to a basket that is not one bet in disguise.",
  table(["Step","Ask or do","Why it helps"],[
  ["1. Pick the risk level",run("Build a conservative 10 stock portfolio of strong and improving stocks.")+"<br>"+run("Build a moderate 12 stock portfolio of healthy uptrends, max 2 per sector."),"Conservative, moderate and aggressive set the volatility and extension limits for you."],
  ["2. Spread across the tide",run("Show the risk spectrum with 5 steady uptrend stocks each."),"See the same idea at every risk level before you choose."],
  ["2b. Keep the names from moving together",run("Build a moderate 10 stock portfolio of healthy uptrends with low correlation between them.")+"<br>Or add \u201Cwith correlation below 0.3 between them\u201D to any portfolio question.","The same rules pick the candidates; names are added only while every pair stays under the limit, and the answer shows the average correlation against the plain top list."],
  ["3. Cap concentration",'Add “max 2 per sector” or “max 1 per subsector” to any portfolio question.',"Sector caps stop the list from being one industry."],
  ["4. Check the history","Then: "+run("Give me a diagnostic of these"),"Group drawdown and volatility against RSP: how rough the ride has been."],
  ["5. Check it is not one bet",run("Average correlation of these")+"<br>or Correlation matrix &rarr; Names: <b>Your list</b> &rarr; <b>Use the last Ask answer</b> "+go("cm"),"Names inside one bright square move as one: keep one of them."],
  ["6. Check the relationships hold","Then: "+run("Which relationships are breaking down?"),"Diversification that relied on a broken relationship is not diversification."],
  ["7. Act and record","Send to Basket builder, then Decision Map; pin the calls "+go("bkt")+" "+go("dmp"),"Levels to act on and a record to learn from."]])));

S.push(block("What the part E price history adds",
  "Part E is the optional RealTest script that exports 280 bars of closes for every symbol. It never changes the daily workflow; it only adds.",
  table(["Where","What appears","Ask it"],[
  ["Tear sheets","Returns against RSP, drawdown, volatility, beta, 52-week-high distance, a price chart against RSP, closest price partners.","Click any ticker."],
  ["Correlation matrix","Real return matrix (clustered, your own list) and the hierarchical clusters map with rising and falling blocks.",run("Which cluster is AMAT in?")],
  ["Hidden Groups","Whether each group holds up over a year; price-history groups.",run("Price groups that cross sectors")],
  ["Relationship map","Behaviour links checked against prices; sector correlation; stocks that trade like another sector; breaking and forming; lead-lag.",run("Which stocks trade like another sector?")],
  ["Radar","A second radar on six price-history qualities.","Open Radar and add a name."],
  ["Ask the terminal","YTD and 1 to 12 month returns, drawdown, volatility, beta and correlation to RSP as filters; diagnostics; pair tests; relationships; clusters.",run("What moves with NVDA?")]])));

S.push(block("Words and numbers you will see",null,
  table(["Term","Meaning"],[
  ["RSP","The Invesco S&amp;P 500 Equal Weight ETF: the benchmark the history compares against. “RSP return” is that fund's return over the same period."],
  ["Correlation","How closely two daily return series move together, from &minus;1 (opposite) through 0 (unrelated) to +1 (identical). Teal in every matrix is positive, red negative."],
  ["Beta","How much a name typically moves when RSP moves 1%. 1.4 means about 1.4%."],
  ["Max drawdown","The deepest fall from a running peak inside the period."],
  ["Annualised volatility","Standard deviation of daily returns &times; &radic;252: how bumpy the ride was."],
  ["Directional block","A cluster of 3+ names that merge within the cutoff on the clusters map, all up (lime) or all down (orange) over the window."],
  ["Cointegration / half-life / z-score","Whether a spread between two prices tends to come back; how fast (sessions to halve the gap); how far it is from normal now (standard deviations)."],
  ["Severity, composite, strength percentile","The scan's own scores: 3-session change, overall rank read, and strength against the universe."]])));

S.push(block("What it is not",null,
  table(["Limit","Why","What to do instead"],[
  ["Not a forecast or a backtest","Every read is one end-of-day bar (and one year of history).","Use the Call tracker and saved runs to see how reads worked for you."],
  ["Correlation is not causation","Names can move together for many reasons, and relationships change.","Check 60 against 252 bars; use the breaking-down list."],
  ["Lead-lag is weak","Daily lead-lag between large caps is small and often chance.","Treat as a watch list only."],
  ["A pair test passing is not a trade","Spreads can break; one year is a short sample.","Size small, use stops, recheck weekly."],
  ["The history must match the scan","Part E must run after the same import as the scan.","If a note says the dates differ, run part E again."]])));

var pane=document.createElement("section"); pane.className="pane"; pane.id="pane-guide"; pane.setAttribute("role","tabpanel"); pane.setAttribute("aria-labelledby","tab-guide"); pane.hidden=true;
pane.innerHTML=S.join("");
engPane.parentNode.insertBefore(pane,engPane.nextSibling);
var t=document.createElement("button"); t.className="tab"; t.setAttribute("role","tab"); t.id="tab-guide"; t.setAttribute("aria-controls","pane-guide"); t.setAttribute("aria-selected","false"); t.textContent="Guide";
nav.appendChild(t);
t.addEventListener("click",function(){ selectTab(t); window.scrollTo({top:0,behavior:"smooth"}); });
try{ var g=TG_GROUPS.filter(function(x){ return x.k==="ref"; })[0]; if(g&&g.tabs.indexOf("guide")<0) g.tabs.push("guide"); }catch(e){}
pane.addEventListener("click",function(e){ var b=e.target.closest?e.target.closest("[data-guide-ask]"):null; if(!b) return; e.preventDefault(); var q=b.getAttribute("data-guide-ask");
  try{ var tq=$("#tab-qry"); if(tq){ selectTab(tq); window.scrollTo({top:0,behavior:"smooth"}); } if(typeof qmSubmit==="function") qmSubmit(q); }catch(err){} });
}catch(e){ try{ console.warn("v90 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
