/* ================= v92: process maps for everything the part E price history added =================
   A second process map under the existing one on Correlation matrix, Relationship map, Hidden Groups and Ask the terminal, drawn
   with the page's own map builder (same look, same Maps On/Off switch, same PNG button). The existing maps are not touched. */
(function(){
try{
if(typeof v63Map!=="function") return;
var S=v63mS, B=v63mB, D=v63mD;
function IO(t){ return B("io","Where the numbers come from",t); }
var MAPS={
cm:function(){ return v63Map({title:"CORRELATION MATRIX · WHAT THE PART E PRICE HISTORY ADDS",
  aria:"Correlation matrix, part E: the real return matrix, the hierarchical clusters map, directional blocks, and the Ask questions that read them.",
  items:[S("A · WHERE THE NUMBERS COME FROM"),
    IO("Part E: 280 bars of daily closes for every symbol, loaded in Ask the terminal and kept in this browser and the shared store."),
    D(["No price history loaded?"],320,"stop","Only the original severity matrix shows","The part E blocks stay hidden; load the history in Ask the terminal.","LOADED"),
    S("B · REAL RETURN MATRIX (TOP OF THE TAB)"),
    B("engine","Daily returns","Close over previous close for each name, over the last 60, 126 or 252 bars."),
    B("engine","Pearson correlation for every pair","Needs 80% of the window traded by both names; otherwise the cell is left blank."),
    D(["Order: Clustered?"],300,"good","Average-linkage clustering","Names are joined by the closest average correlation, so blocs sit together on the diagonal and are outlined (average 0.50 or more).","SECTOR ORDER"),
    B("engine","Names","The 60 most extreme composites, or your own list (typed, or the last Ask answer). Pair tables search all stocks for the default names."),
    S("C · HIERARCHICAL CLUSTERS MAP (ALEX STYLE)"),
    B("engine","Every stock with a full window","About 510 names, YTD by default (60, 126 or 252 bars on request)."),
    B("engine","Average-linkage dendrogram","Distance = 1 minus correlation; the leaf order places names that move together side by side."),
    D(["A node of 3+ names merges within the cutoff (0.263)?"],440,"good","It is a block","Average correlation inside of about 0.74 or more; the largest such node is kept.","NO"),
    D(["Every member up (or every member down) over the window?"],460,"good","Directional block","Outlined lime when all rose, orange when all fell; mixed blocks are counted but not outlined.","NO"),
    B("engine","Canvas drawing","Only the part on screen is painted, so the full map stays fast; Find, Reset view and the block stepper move the view."),
    S("D · ASK THE TERMINAL READS THE SAME NUMBERS"),
    B("good","Examples","“Correlation matrix of XOM CVX COP”, “which clusters are rising together”, “which cluster is AMAT in”, “clusters that cross sectors”, “most correlated pairs in Semiconductors”.")],
  steps:["1. Load the price history in Ask the terminal.","2. Read the real return matrix first; switch Order to Clustered to see the blocs.","3. Type your shortlist into Your list: names inside one outlined square are one bet.","4. Scroll to the clusters map; step through the lime and orange blocks with the arrows.","5. Save any view as a PNG; ask the same questions in Ask the terminal for tables."],
  notes:"Correlation describes how two price series moved over the window; it is not causation and it changes over time. Block boundaries depend on the window and the cutoff, and a block can mix sectors because the clustering never sees sector labels."}); },
ng:function(){ return v63Map({title:"RELATIONSHIP MAP · WHAT THE PART E PRICE HISTORY ADDS",
  aria:"Relationship map, part E: behaviour links checked against price, the sector matrix, price misfits, breaking and forming relationships, lead-lag.",
  items:[S("A · WHERE THE NUMBERS COME FROM"),
    IO("The map's own behaviour links (nine scan features, four nearest neighbours) and part E daily returns for every stock."),
    S("B · ARE THE LOOK-ALIKES ALSO PRICE LINKS?"),
    B("engine","Each link on the map","Correlation of the two names' daily returns over 60 and 252 bars."),
    D(["252-bar correlation 0.5 or more?"],360,"good","Moves together","A real price relationship, not only a similar profile today.","UNDER 0.5"),
    B("stop","Partly (0.3 to 0.5) or hardly (under 0.3)","A look-alike for now: similar readings, independent prices."),
    S("C · HIDDEN PRICE RELATIONSHIPS"),
    B("engine","Sector matrix","Equal-weight sector baskets, correlation at 252 or 60 bars, or the change between them."),
    B("engine","Stocks that trade like another sector","Each stock against every sector basket (its own sector without itself); listed when another sector fits better."),
    B("engine","Breaking down / forming","Correlated 0.50+ over the year but 0.30 weaker lately, or 0.60+ lately and 0.30 stronger than over the year; at most two rows per stock."),
    D(["Lead-lag: 0.2+ over the year AND 0.12+ with the same sign in each half?"],520,"good","Kept as a candidate","Subsector baskets, lags of 1 to 3 days. Most daily lead-lag is weak; treat as ideas.","NO"),
    S("D · ASK THE TERMINAL"),
    B("good","Examples","“What moves with NVDA”, “hedges for NVDA in other sectors”, “which stocks trade like another sector”, “which relationships are breaking down”, “what leads Semiconductors”.")],
  steps:["1. Load the price history.","2. Read the share of behaviour links that are also price links.","3. Check the sector matrix, then the change view for sectors coupling or decoupling.","4. Use the breaking-down table before relying on a hedge or a pair.","5. Ask for the full lists in Ask the terminal."],
  notes:"All from one year of daily closes; relationships can change quickly. Lead-lag and forming relationships are the least reliable parts: many tests are run, so some will be chance."}); },
hg:function(){ return v63Map({title:"HIDDEN GROUPS · WHAT THE PART E PRICE HISTORY ADDS",
  aria:"Hidden Groups, part E: each group checked against a year of prices, and groups found directly from returns.",
  items:[S("A · CHECKING THE EXISTING GROUPS"),
    IO("The groups above (60-day closest-peer links from RealTest) and part E daily returns."),
    B("engine","Average pairwise correlation","Over 60 and 252 bars for all members with history."),
    D(["252-bar average 0.5 or more?"],340,"good","Holds up","The group has moved together for a year.","NO"),
    D(["0.3 to 0.5?"],260,"engine","Partly","Some of the group is durable.","UNDER 0.3"),
    B("stop","Recent only","Tied lately but not over a year: more likely to fall apart."),
    B("engine","Basket numbers","Equal-weight YTD and 12-month return, volatility, max drawdown and correlation to the benchmark."),
    S("B · PRICE-HISTORY GROUPS"),
    B("engine","Links","Two stocks correlate at the chosen level (0.60, 0.70 or 0.80) over 252 bars and one is among the other's five closest."),
    B("good","Groups","Linked names are joined; groups that cross sectors come first. Below about 0.65 they chain into one large bloc.")],
  steps:["1. Read the groups above as before.","2. Check the “Over a year” column for each group.","3. Look at the price-history groups for the durable blocs.","4. Ask “price groups that cross sectors” for the full table."],
  notes:"Both views describe co-movement, not a business link. A durable group can still break; recheck after each part E run."}); },
qry:function(){ return v63Map({title:"ASK THE TERMINAL · HOW THE NEWER QUESTIONS ARE READ, IN ORDER",
  aria:"Ask the terminal: the order in which the newer question kinds are recognised, the data each uses, and what comes back.",
  items:[S("A · READING THE QUESTION (FIRST MATCH WINS)"),
    IO("Your words, the loaded scan and, when loaded, the part E price history. Every step below only claims a question that clearly matches it; anything else goes on to the original rules unchanged."),
    D(["Asks about correlation: two or more tickers, “these”, pairs in a group, the market, two sectors, or a low-correlation portfolio?"],640,"engine","Correlation answer","Pair (4 windows, saved severity, rolling peak), matrix with pair list, ranked pairs, sector baskets, market correlation and beta, or a portfolio built by the original rules and then thinned so names do not move together.","NO"),
    D(["Hierarchical clusters, directional blocks, “clusters rising together”, “which cluster is X in”?"],640,"engine","Clusters map answer","Blocks by direction, window, cutoff, sector or crossing sectors; or the block holding a name and its closest names.","NO"),
    D(["Price partners, hedges, trades like another sector, breaking or forming, lead-lag, price groups?"],640,"engine","Relationship answer","From one engine computed once per history: every pair's 60 and 252-bar correlation, sector baskets, subsector baskets.","NO"),
    D(["Pair test, pairs trade, cointegration, spread test?"],560,"engine","Pairs-trade test","Two tickers, several tickers, “these”, or a sector or subsector; gates for cointegration, beta stability, spread shift, crossings and half-life.","NO"),
    D(["Plain-English concepts (strong and improving, recovering, rolling over, breaking out, not extended …)?"],640,"engine","Turned into filters","Combined with everything below.","NO"),
    B("engine","The original rules","Screens, portfolios and risk levels, spectrum, counts, compare, explain, cross-sector links, diagnostics, long-horizon history filters."),
    S("B · WHAT EVERY ANSWER CARRIES"),
    B("good","Table, notes and coverage","What was counted, what was left out and why, the data cutoff, and “How this was computed” with the exact rules."),
    B("good","Follow-ups","Send to Basket builder or Decision Map; say “these” next (diagnostic of these, pair test these, correlation of these); the Correlation matrix tab can draw the last answer.")],
  steps:["1. Load the scan (Update) and the price history (Load price history).","2. Ask in plain words; combine risk level, trend, strength, sector and history.","3. Read the lead line and the notes: they say exactly what was applied.","4. Follow up with “these” to go deeper on the same names.","5. Open How this was computed when an answer surprises you."],
  notes:"Every answer is computed in the page from the loaded data; nothing is guessed. When a question matches nothing, the page says so instead of inventing an answer."}); }
};
var WHERE={cm:"pane-cm",ng:"pane-ng",hg:"pane-hg",qry:"pane-qry"};
function mount(k){
  var id="hx92"+k+"MapWrap"; if($("#"+id)) return;
  var pane=$("#"+WHERE[k]); if(!pane) return;
  var fig=document.createElement("figure"); fig.style.marginTop="8px";
  fig.innerHTML='<div class="block-head" style="margin-bottom:8px"><h3>'+(k==="qry"?"How the newer questions are read":"What the part E price history adds, step by step")+'</h3><span class="count">'+(k==="qry"?"the order Ask checks your words in, and what each step uses":"only when a price history is loaded")+'</span></div><div class="chart-scroll" id="'+id+'"></div>';
  var figs=pane.querySelectorAll(":scope > figure"); var after=figs.length?figs[figs.length-1]:null;
  if(after) pane.insertBefore(fig,after.nextSibling); else pane.appendChild(fig);
  try{ $("#"+id).innerHTML=MAPS[k](); }catch(e){ fig.parentNode.removeChild(fig); return; }
  try{ if(typeof pmOn!=="undefined"&&!pmOn) fig.classList.add("pm-off"); }catch(e){}
}
Object.keys(MAPS).forEach(function(k){ try{ mount(k); }catch(e){} });
/* redraw with the current theme's colours when a tab is opened (the maps read CSS colours at draw time) */
Object.keys(WHERE).forEach(function(k){ try{ v63Watch("tab-"+(k==="qry"?"qry":k),function(){ var w=$("#hx92"+k+"MapWrap"); if(w) try{ w.innerHTML=MAPS[k](); }catch(e){} }); }catch(e){} });
}catch(e){ try{ console.warn("v92 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
