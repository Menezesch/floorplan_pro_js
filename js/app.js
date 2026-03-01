// Floorplan Pro CAD — App.js (local folders: /css, /js, /assets)
(function(){
  // --- Constants & State ---
  const drawingArea = document.getElementById('drawing-area');
  const canvasContainer = document.getElementById('canvas-container');
  const statusPos = document.getElementById('status-pos');
  const statusZoom = document.getElementById('status-zoom');
  const statusSnap = document.getElementById('status-snap');
  const statusAngle = document.getElementById('status-angle');

  const GRID_SIZE_DEFAULT_M = 1.0; // meters
  const PIXELS_PER_METER = 20; // world px per meter (world space)
  let GRID_SIZE = GRID_SIZE_DEFAULT_M * PIXELS_PER_METER; // in world px
  let SNAP_THRESH = 15; // px on screen; converted to world px via viewBox scale
  const DEFAULT_THICKNESS_M = 0.15; // meters

  let currentTool = 'square';
  let snapToVertices = true;
  let showLabels = true;
  let showRulers = true;
  let isDrawing = false;
  let startX=0, startY=0;
  let currentShape = null;
  let activeShape = null;
  let dimensionsLinked = true;
  let formCache = null;

  // Undo/redo
  let undoStack = [];
  let redoStack = [];

  // Selection
  let selection = new Set();

  // Measure tool
  let measuring = { active:false, p1:null, p2:null, line:null, label:null };

  // --- SVG Setup ---
  const draw = SVG().addTo('#drawing-area').size('100%', '100%');
  draw.viewbox(0, 0, 3000, 3000);

  let shellLayer = draw.group().addClass('shell-layer').back();
  let labelsGroup = draw.group().addClass('labels-layer').front();
  let snapIndicator = draw.circle(10).fill('none').stroke({color:'#e74c3c', width:2}).addClass('indicator').hide();

  // --- Rulers ---
  function generateRulers() {
    const W = 3000, H = 3000; // world px canvas size
    // top
    const cTop = document.createElement('canvas'); cTop.width = W; cTop.height = 25;
    let ctx = cTop.getContext('2d'); ctx.fillStyle = '#ecf0f1'; ctx.fillRect(0,0,W,25);
    ctx.fillStyle = '#7f8c8d'; ctx.font = '10px Arial';
    for(let i=0;i<=W;i+=PIXELS_PER_METER){ // each meter
      const isMaj = (i % (5*PIXELS_PER_METER) === 0);
      ctx.fillRect(i, isMaj?0:15, 1, isMaj?25:10);
      if (isMaj) ctx.fillText((i/PIXELS_PER_METER)+'m', i+3, 12);
    }
    document.getElementById('ruler-top-inner').style.backgroundImage = `url(${cTop.toDataURL()})`;
    // left
    const cLeft = document.createElement('canvas'); cLeft.width = 25; cLeft.height = H;
    ctx = cLeft.getContext('2d'); ctx.fillStyle = '#ecf0f1'; ctx.fillRect(0,0,25,H);
    ctx.fillStyle = '#7f8c8d'; ctx.font = '10px Arial';
    for(let i=0;i<=H;i+=PIXELS_PER_METER){
      const isMaj = (i % (5*PIXELS_PER_METER) === 0);
      ctx.fillRect(isMaj?0:15, i, isMaj?25:10, 1);
      if (isMaj && i>0) ctx.fillText((i/PIXELS_PER_METER)+'', 2, i-2);
    }
    document.getElementById('ruler-left-inner').style.backgroundImage = `url(${cLeft.toDataURL()})`;
  }
  generateRulers();

  canvasContainer.addEventListener('scroll', function(){
    document.getElementById('ruler-top-scroll').scrollLeft = this.scrollLeft;
    document.getElementById('ruler-left-scroll').scrollTop = this.scrollTop;
  });

  // --- Utilities ---
  function m2px(m){ return m * PIXELS_PER_METER; }
  function px2m(px){ return px / PIXELS_PER_METER; }

  function getWorldPoint(evt){
    const svg = draw.node; const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const m = svg.getScreenCTM().inverse(); const p = pt.matrixTransform(m);
    return { x: p.x, y: p.y };
  }

  function getMetersPerScreenPx(){
    const vb = draw.viewbox();
    return (vb.width / drawingArea.clientWidth) / PIXELS_PER_METER; // m per screen px
  }

  function updateStatus(e){
    if (e){ const w = getWorldPoint(e); statusPos.textContent = `x: ${px2m(w.x).toFixed(2)}m, y: ${px2m(w.y).toFixed(2)}m`; }
    const vb = draw.viewbox(); const zoom = 3000 / vb.width; statusZoom.textContent = `Zoom: ${zoom.toFixed(2)}×`;
    statusSnap.textContent = `Snap: ${snapToVertices? 'On':'Off'}`;
  }

  function snapToGrid(val){ return Math.round(val / GRID_SIZE) * GRID_SIZE; }

  function projectPointOnSegment(px,py, x1,y1, x2,y2){
    const vx = x2-x1, vy = y2-y1; const wx = px-x1, wy = py-y1; const len2 = vx*vx + vy*vy || 1;
    let t = (wx*vx + wy*vy) / len2; t = Math.max(0, Math.min(1, t));
    return { x: x1 + t*vx, y: y1 + t*vy, t };
  }

  function getAngleDeg(ax,ay, bx,by){ return Math.atan2(by-ay, bx-ax) * 180/Math.PI; }
  function angleSnap(a, b, stepDeg=45){ const v={x:b.x-a.x,y:b.y-a.y}; const len=Math.hypot(v.x,v.y); if(len<1e-6) return b; let ang=Math.atan2(v.y,v.x); const step=(stepDeg*Math.PI)/180; ang=Math.round(ang/step)*step; return { x:a.x+Math.cos(ang)*len, y:a.y+Math.sin(ang)*len } }

  // Snapping: vertices + edges + midpoints
  function getSnappedCoords(screenEvt){
    const mpp = getMetersPerScreenPx(); const worldSnapThresh = (SNAP_THRESH * mpp) * PIXELS_PER_METER; // threshold in world px
    const p = getWorldPoint(screenEvt);
    let tx = snapToGrid(p.x), ty = snapToGrid(p.y), isSn=false, best=1e9;

    if (!snapToVertices) return { x:tx, y:ty, snapped:false };

    draw.children().forEach(el => {
      if (el === currentShape || el === labelsGroup || el === shellLayer || el.hasClass('indicator')) return; if (!el.visible()) return;
      const cands = [];
      if (el.type === 'rect'){
        const x=el.x(), y=el.y(), w=el.width(), h=el.height(); const verts=[{x,y},{x:x+w,y},{x,y:y+h},{x:x+w,y:y+h}]; cands.push(...verts);
        const edges = [[x,y,x+w,y],[x+w,y,x+w,y+h],[x+w,y+h,x,y+h],[x,y+h,x,y]]; edges.forEach(([x1,y1,x2,y2])=>{ cands.push(projectPointOnSegment(p.x,p.y,x1,y1,x2,y2)); cands.push({x:(x1+x2)/2,y:(y1+y2)/2}); });
      } else if (el.type==='polygon'){
        const pts=el.array(); for(let i=0;i<pts.length;i++){ const [x1,y1]=pts[i]; const [x2,y2]=pts[(i+1)%pts.length]; cands.push({x:x1,y:y1}); cands.push(projectPointOnSegment(p.x,p.y,x1,y1,x2,y2)); cands.push({x:(x1+x2)/2,y:(y1+y2)/2}); }
      } else if (el.hasClass('wall') && el.type==='line'){
        const x1=+el.attr('x1'), y1=+el.attr('y1'); const x2=+el.attr('x2'), y2=+el.attr('y2'); cands.push({x:x1,y:y1},{x:x2,y:y2}); cands.push(projectPointOnSegment(p.x,p.y,x1,y1,x2,y2)); cands.push({x:(x1+x2)/2,y:(y1+y2)/2});
      }
      cands.forEach(pt=>{ const d=Math.hypot(p.x-pt.x,p.y-pt.y); if(d<best && d<=worldSnapThresh){ best=d; tx=pt.x; ty=pt.y; isSn=true; } });
    });

    return { x:tx, y:ty, snapped:isSn };
  }

  // --- Cycle detection & adjacency ---
  function nodeKey(x,y){ return `${Math.round(x)},${Math.round(y)}`; }
  function polygonArea(pts){ let a=0; for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length]; a += p.x*q.y - q.x*p.y; } return a/2; }
  function findWallBetween(p1,p2,tol=0.75){ const lines = draw.children().filter(el => el.hasClass('wall') && el.type==='line'); for (const l of lines){ const x1=+l.attr('x1'), y1=+l.attr('y1'); const x2=+l.attr('x2'), y2=+l.attr('y2'); const ab=Math.hypot(p1.x-x1,p1.y-y1)<tol && Math.hypot(p2.x-x2,p2.y-y2)<tol; const ba=Math.hypot(p1.x-x2,p1.y-y2)<tol && Math.hypot(p2.x-x1,p2.y-y1)<tol; if (ab||ba) return l; } return null; }
  function assignWallsToRoom(roomId, cyclePoints){ const isCCW = polygonArea(cyclePoints)>0; for(let i=0;i<cyclePoints.length;i++){ const a=cyclePoints[i], b=cyclePoints[(i+1)%cyclePoints.length]; const wall=findWallBetween(a,b); if(!wall) continue; const d=wall.data(); const left=d.rooms_left||[]; const right=d.rooms_right||[]; if (isCCW){ if(!left.includes(roomId)) left.push(roomId); } else { if(!right.includes(roomId)) right.push(roomId); } wall.data({ rooms_left:left, rooms_right:right }); } }

  function checkAndConvertClosedLoop(newLine){
    const lines = draw.children().filter(el => el.hasClass('wall') && el.type==='line');
    const graph = {}; const addEdge=(a,b,edge)=>{ (graph[a]||(graph[a]=[])).push({to:b, line:edge}); };
    lines.forEach(line=>{ const a=nodeKey(+line.attr('x1'),+line.attr('y1')); const b=nodeKey(+line.attr('x2'),+line.attr('y2')); addEdge(a,b,line); addEdge(b,a,line); });
    const start=nodeKey(+newLine.attr('x1'),+newLine.attr('y1')); const end=nodeKey(+newLine.attr('x2'),+newLine.attr('y2')); if(start===end) return false;
    const q=[{node:end, path:[], visited:new Set([end])}];
    while(q.length){ const cur=q.shift(); if (cur.node===start && cur.path.length>0){ const nodes=[end, ...cur.path.map(p=>p.to)]; const points=nodes.map(s=>{ const [sx,sy]=s.split(',').map(Number); return {x:sx,y:sy}; }); if(Math.abs(polygonArea(points))<20) return false; const ptsStr=points.map(p=>`${p.x},${p.y}`).join(','); const roomId=`room_${Date.now()}_${Math.floor(Math.random()*1000)}`; const room=draw.polygon(ptsStr).addClass('room').data({ name:'Room', thickness:Array(points.length).fill(DEFAULT_THICKNESS_M).join(','), id:roomId }); assignWallsToRoom(roomId, points); setActiveShape(room); renderLabels(); updateOuterShells(); pushState(); return true; } for (const nb of (graph[cur.node]||[])){ if (nb.line===newLine) continue; if (!cur.visited.has(nb.to) || nb.to===start){ const visited=new Set(cur.visited); visited.add(nb.to); q.push({ node: nb.to, path: [...cur.path, nb], visited }); } } }
    return false;
  }

  // --- Apply/Reset caching ---
  function loadFormCacheFromShape(){
    if (!activeShape){ formCache=null; return; }
    formCache={ name: activeShape.data('name')||'Room', walls: [] };
    if (activeShape.hasClass('room')){
      const tArr = getThicknessArray(activeShape, activeShape.type==='rect'?4:(activeShape.type==='polygon'?activeShape.array().length:1));
      if (activeShape.type==='rect'){
        formCache.walls = [
          { len_m: activeShape.width()/PIXELS_PER_METER, thick_m: tArr[0] },
          { len_m: activeShape.height()/PIXELS_PER_METER, thick_m: tArr[1] },
          { len_m: activeShape.width()/PIXELS_PER_METER, thick_m: tArr[2] },
          { len_m: activeShape.height()/PIXELS_PER_METER, thick_m: tArr[3] },
        ];
      } else {
        const pts = activeShape.array();
        for (let i=0;i<pts.length;i++){
          const p1=pts[i], p2=pts[(i+1)%pts.length]; const len_m = Math.hypot(p2[0]-p1[0], p2[1]-p1[1]) / PIXELS_PER_METER; formCache.walls.push({ len_m, thick_m: tArr[i] });
        }
      }
    } else if (activeShape.hasClass('wall') && activeShape.type==='line'){
      const x1=+activeShape.attr('x1'), y1=+activeShape.attr('y1'); const x2=+activeShape.attr('x2'), y2=+activeShape.attr('y2'); const len_m = Math.hypot(x2-x1, y2-y1)/PIXELS_PER_METER; const tArr=getThicknessArray(activeShape,1); formCache.walls=[{ len_m, thick_m: tArr[0] }];
    } else { formCache=null; }
  }
  function writeFormCacheToShape(){
    if (!activeShape || !formCache) return;
    activeShape.data('name', formCache.name);
    if (activeShape.hasClass('room')){
      const tArr = formCache.walls.map(w=>w.thick_m); activeShape.data('thickness', tArr.join(','));
      if (activeShape.type==='rect'){
        const wPx = formCache.walls[0].len_m * PIXELS_PER_METER; const hPx = formCache.walls[1].len_m * PIXELS_PER_METER;
        if (dimensionsLinked){ const ratioW = wPx / (activeShape.width()||1); activeShape.size(activeShape.width()*ratioW, activeShape.height()*ratioW); }
        else { activeShape.size(wPx, hPx); }
      }
    } else if (activeShape.hasClass('wall') && activeShape.type==='line'){
      const w = formCache.walls[0]; const x1=+activeShape.attr('x1'), y1=+activeShape.attr('y1'); const x2=+activeShape.attr('x2'), y2=+activeShape.attr('y2'); const dx=x2-x1, dy=y2-y1; const len=Math.hypot(dx,dy)||1; const targetPx = w.len_m * PIXELS_PER_METER; activeShape.attr({ x2: x1 + dx*(targetPx/len), y2: y1 + dy*(targetPx/len) }); activeShape.data('thickness', String(w.thick_m));
    }
  }

  // --- Properties Panel ---
  const pName = document.getElementById('prop-name');
  const pWallsBody = document.getElementById('prop-walls').querySelector('tbody');
  const btnLink = document.getElementById('btn-link');
  const btnApply = document.getElementById('btn-apply');
  const btnReset = document.getElementById('btn-reset');

  btnLink.addEventListener('click', ()=>{ dimensionsLinked = !dimensionsLinked; btnLink.className = dimensionsLinked? 'linked':'unlinked'; btnLink.textContent = dimensionsLinked? '🔗 Dimensions Linked' : '💔 Dimensions Unlinked'; });
  btnApply.addEventListener('click', ()=>{ writeFormCacheToShape(); updatePropertiesPanel(); updateOuterShells(); renderLabels(); pushState(); });
  btnReset.addEventListener('click', ()=>{ updatePropertiesPanel(); });
  pName.addEventListener('input', ()=>{ if (formCache) formCache.name = pName.value; });

  function getThicknessArray(shape, sides){ let t = shape.data('thickness'); if (!t){ const arr = Array(sides).fill(DEFAULT_THICKNESS_M); shape.data('thickness', arr.join(',')); return arr; } return (typeof t==='string'? t.split(',').map(Number): t); }

  function updatePropertiesPanel(){
    if (!activeShape){ pName.value=''; pName.disabled=true; btnLink.disabled=true; pWallsBody.innerHTML = '<tr><td colspan="3">No shape selected</td></tr>'; formCache=null; return; }
    pName.disabled=false; btnLink.disabled=false; loadFormCacheFromShape(); if (!formCache){ pName.value=''; pWallsBody.innerHTML = '<tr><td colspan="3">No editable properties</td></tr>'; return; }
    pName.value = formCache.name;

    pWallsBody.innerHTML = '';
    if (activeShape.hasClass('room')){
      for (let i=0;i<formCache.walls.length;i++){
        const w = formCache.walls[i]; const label = activeShape.type==='rect'? (['1 (Top)','2 (Right)','3 (Bottom)','4 (Left)'][i]||`Wall ${i+1}`) : `Wall ${i+1}`; const tr=document.createElement('tr'); tr.innerHTML = `<td>${label}</td>\n          <td><input type="number" step="0.01" value="${w.len_m.toFixed(2)}" ${activeShape.type==='rect'?'':'disabled'} data-wall="${i}" class="wall-len"></td>\n          <td><input type="number" step="0.01" value="${w.thick_m.toFixed(2)}" data-thick="${i}" class="wall-thick"></td>`; pWallsBody.appendChild(tr);
      }
    } else if (activeShape.hasClass('wall') && activeShape.type==='line'){
      const w = formCache.walls[0]; const tr=document.createElement('tr'); tr.innerHTML = `<td>Line</td>\n        <td><input type=\"number\" step=\"0.01\" value=\"${w.len_m.toFixed(2)}\" data-wall=\"0\" class=\"wall-len\"></td>\n        <td><input type=\"number\" step=\"0.01\" value=\"${w.thick_m.toFixed(2)}\" data-thick=\"0\" class=\"wall-thick\"></td>`; pWallsBody.appendChild(tr);
    }

    pWallsBody.querySelectorAll('.wall-len').forEach(inp=>{ inp.addEventListener('input', e=>{ const idx=+e.target.dataset.wall; const val=parseFloat(e.target.value)||0.1; formCache.walls[idx].len_m = val; }); });
    pWallsBody.querySelectorAll('.wall-thick').forEach(inp=>{ inp.addEventListener('input', e=>{ const idx=+e.target.dataset.thick; const val=parseFloat(e.target.value)||DEFAULT_THICKNESS_M; formCache.walls[idx].thick_m = val; }); });
  }

  function setActiveShape(shape){ if (activeShape) activeShape.removeClass('selected'); activeShape = shape; selection.clear(); if (shape){ shape.addClass('selected'); selection.add(shape); } updatePropertiesPanel(); }

  // --- Outer shells rendering ---
  function lineIntersection(p1,p2,p3,p4){ const den=(p1.x-p2.x)*(p3.y-p4.y)-(p1.y-p2.y)*(p3.x-p4.x); if(Math.abs(den)<1e-6) return null; const t=((p1.x-p3.x)*(p3.y-p4.y)-(p1.y-p3.y)*(p3.x-p4.x))/den; return { x:p1.x - t*(p1.x-p2.x), y:p1.y - t*(p1.y-p2.y) }; }
  function updateOuterShells(){ shellLayer.clear(); draw.children().forEach(el=>{ if(!el.visible()) return; if(!el.hasClass('room') && !(el.hasClass('wall')&&el.type==='line')) return; const tArr=getThicknessArray(el, el.type==='rect'?4:(el.type==='polygon'?el.array().length:1)); const tPx=tArr.map(v=>v*PIXELS_PER_METER); if (el.hasClass('room')){ if (el.type==='rect'){ const x=el.x(), y=el.y(), w=el.width(), h=el.height(); const pts=[[x-tPx[3],y-tPx[0]],[x+w+tPx[1],y-tPx[0]],[x+w+tPx[1],y+h+tPx[2]],[x-tPx[3],y+h+tPx[2]]]; shellLayer.polygon(pts).fill('none').stroke({width:2,color:'#34495e'}); } else { const raw=el.array().map(p=>({x:p[0],y:p[1]})); const n=raw.length; let area=0; for(let i=0;i<n;i++){ area+=raw[i].x*raw[(i+1)%n].y - raw[(i+1)%n].x*raw[i].y; } const sign= area<0? -1: 1; const lines=[]; for(let i=0;i<n;i++){ const j=(i+1)%n; const dx=raw[j].x-raw[i].x, dy=raw[j].y-raw[i].y; const len=Math.hypot(dx,dy)||1; const nx=-dy*sign/len, ny=dx*sign/len; lines.push({ p1:{x:raw[i].x+nx*tPx[i], y:raw[i].y+ny*tPx[i]}, p2:{x:raw[j].x+nx*tPx[i], y:raw[j].y+ny*tPx[i]} }); } const newPts=[]; for(let i=0;i<n;i++){ const prev=(i-1+n)%n; const ip=lineIntersection(lines[prev].p1,lines[prev].p2,lines[i].p1,lines[i].p2); newPts.push(ip?[ip.x,ip.y]:[lines[i].p1.x,lines[i].p1.y]); } shellLayer.polygon(newPts).fill('none').stroke({width:2,color:'#34495e'}); } } else { const x1=+el.attr('x1'), y1=+el.attr('y1'); const x2=+el.attr('x2'), y2=+el.attr('y2'); const dx=x2-x1, dy=y2-y1; const len=Math.hypot(dx,dy)||1; const nx=-dy/len, ny=dx/len; shellLayer.line(x1+nx*tPx[0], y1+ny*tPx[0], x2+nx*tPx[0], y2+ny*tPx[0]).stroke({width:2,color:'#34495e'}); } }); shellLayer.back(); }

  // --- Labels ---
  function renderLabels(){ labelsGroup.clear(); if(!showLabels) return; labelsGroup.front(); draw.children().forEach(el=>{ if (el===labelsGroup||el===shellLayer||el.hasClass('indicator')||!el.visible()) return; const name=el.data('name')||'Room'; const fRoom={anchor:'middle',size:12,fill:'#7f8c8d',family:'sans-serif',weight:'bold'}; const fWall={anchor:'middle',size:11,fill:'#bdc3c7',family:'sans-serif'}; if(el.hasClass('room')){ if(el.type==='rect'){ const x=el.x(),y=el.y(),w=el.width(),h=el.height(); if(w<20||h<20) return; const cx=x+w/2,cy=y+h/2; labelsGroup.text(`${name}\n${(w/20).toFixed(1)}×${(h/20).toFixed(1)}m`).font(fRoom).cx(cx).cy(cy); labelsGroup.text('W1').font(fWall).cx(cx).cy(y-10); labelsGroup.text('W2').font(fWall).cx(x+w+15).cy(cy); labelsGroup.text('W3').font(fWall).cx(cx).cy(y+h+12); labelsGroup.text('W4').font(fWall).cx(x-15).cy(cy); } else { const pts=el.array(); let cx=0,cy=0; pts.forEach(p=>{cx+=p[0]; cy+=p[1];}); labelsGroup.text(name).font(fRoom).cx(cx/pts.length).cy(cy/pts.length); for(let i=0;i<pts.length;i++){ const mx=(pts[i][0]+pts[(i+1)%pts.length][0])/2; const my=(pts[i][1]+pts[(i+1)%pts.length][1])/2; labelsGroup.text(`W${i+1}`).font(fWall).cx(mx).cy(my-10); } } } else if (el.hasClass('wall')&&el.type==='line'){ const x1=+el.attr('x1'),y1=+el.attr('y1'); const x2=+el.attr('x2'),y2=+el.attr('y2'); labelsGroup.text('Wall').font(fWall).cx((x1+x2)/2).cy((y1+y2)/2 - 10); } }); }

  // --- XML I/O ---
  function generateXMLString(){ let xml = `<floorplan units=\"m\" scale_pixels_per_meter=\"${PIXELS_PER_METER}\">\n`; let rId=1,wId=1; draw.children().forEach(el=>{ if(el===labelsGroup||el===shellLayer||el.hasClass('indicator')||!el.visible()) return; if(el.hasClass('room')){ const name=el.data('name')||''; const thickness=el.data('thickness')||''; if (el.type==='rect'){ xml += `  <room id=\"room_${rId++}\" type=\"rect\" name=\"${name}\" x_m=\"${(el.x()/20).toFixed(3)}\" y_m=\"${(el.y()/20).toFixed(3)}\" width_m=\"${(el.width()/20).toFixed(3)}\" height_m=\"${(el.height()/20).toFixed(3)}\" thickness_m_list=\"${thickness}\" />\n`; } else { const pts=el.array().map(p=> (p[0]/20).toFixed(3)+","+(p[1]/20).toFixed(3)).join(' '); xml += `  <room id=\"room_${rId++}\" type=\"polygon\" name=\"${name}\" points_m=\"${pts}\" thickness_m_list=\"${thickness}\" />\n`; } } else if (el.hasClass('wall')&&el.type==='line'){ const tArr=getThicknessArray(el,1); const x1=+el.attr('x1'),y1=+el.attr('y1'); const x2=+el.attr('x2'),y2=+el.attr('y2'); const left=(el.data('rooms_left')||[]).join(','); const right=(el.data('rooms_right')||[]).join(','); xml += `  <wall id=\"wall_${wId++}\" x1_m=\"${(x1/20).toFixed(3)}\" y1_m=\"${(y1/20).toFixed(3)}\" x2_m=\"${(x2/20).toFixed(3)}\" y2_m=\"${(y2/20).toFixed(3)}\" thickness_m=\"${tArr[0]}\" rooms_left=\"${left}\" rooms_right=\"${right}\" />\n`; } }); xml += '</floorplan>'; return xml; }

  function loadFromXMLString(xmlStr){ draw.clear(); shellLayer = draw.group().addClass('shell-layer').back(); labelsGroup = draw.group().addClass('labels-layer').front(); snapIndicator = draw.circle(10).fill('none').stroke({color:'#e74c3c',width:2}).addClass('indicator').hide(); setActiveShape(null); const xmlDoc = new DOMParser().parseFromString(xmlStr,'text/xml'); const rooms=Array.from(xmlDoc.getElementsByTagName('room')); rooms.forEach(r=>{ let room; const name=r.getAttribute('name')||'Room'; const tlist=r.getAttribute('thickness_m_list')||''; if (r.getAttribute('type')==='rect'){ const x=parseFloat(r.getAttribute('x_m'))*20; const y=parseFloat(r.getAttribute('y_m'))*20; const w=parseFloat(r.getAttribute('width_m'))*20; const h=parseFloat(r.getAttribute('height_m'))*20; room=draw.rect(w,h).move(x,y).addClass('room'); } else { const pts=(r.getAttribute('points_m')||'').split(/\s+/).filter(Boolean).map(pair=>{ const [sx,sy]=pair.split(',').map(parseFloat); return [sx*20, sy*20]; }); room=draw.polygon(pts).addClass('room'); } room.data('name',name); if (tlist) room.data('thickness', tlist); }); const walls=Array.from(xmlDoc.getElementsByTagName('wall')); walls.forEach(w=>{ const x1=parseFloat(w.getAttribute('x1_m'))*20; const y1=parseFloat(w.getAttribute('y1_m'))*20; const x2=parseFloat(w.getAttribute('x2_m'))*20; const y2=parseFloat(w.getAttribute('y2_m'))*20; const t=parseFloat(w.getAttribute('thickness_m'))||DEFAULT_THICKNESS_M; const left=(w.getAttribute('rooms_left')||'').split(',').filter(Boolean); const right=(w.getAttribute('rooms_right')||'').split(',').filter(Boolean); draw.line(x1,y1,x2,y2).addClass('wall').data({ thickness:t, rooms_left:left, rooms_right:right }); }); updateOuterShells(); renderLabels(); }

  function pushState(){ undoStack.push(generateXMLString()); if (undoStack.length>30) undoStack.shift(); redoStack.length=0; }
  function undo(){ if (undoStack.length<=1) return; const cur=undoStack.pop(); redoStack.push(cur); const prev=undoStack[undoStack.length-1]; loadFromXMLString(prev); }
  function redo(){ if (!redoStack.length) return; const next=redoStack.pop(); undoStack.push(next); loadFromXMLString(next); }

  // --- Tools & UI ---
  document.querySelectorAll('.tool-btn:not(#tool-magnet)').forEach(btn=>{ btn.addEventListener('click',()=>{ document.querySelectorAll('.tool-btn:not(#tool-magnet)').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentTool = btn.id.replace('tool-',''); if (currentTool !== 'select') setActiveShape(null); }); });
  document.getElementById('tool-magnet').addEventListener('click', function(){ snapToVertices=!snapToVertices; this.classList.toggle('active', snapToVertices); if(!snapToVertices) snapIndicator.hide(); });
  document.getElementById('grid-size').addEventListener('change', e=>{ const val=Math.max(0.05, parseFloat(e.target.value)||1.0); GRID_SIZE = val * PIXELS_PER_METER; });
  document.getElementById('snap-thresh').addEventListener('change', e=>{ SNAP_THRESH = Math.max(1, parseInt(e.target.value)||15); });
  document.getElementById('menu-toggle-labels').addEventListener('click', function(){ showLabels=!showLabels; this.textContent = showLabels? '✔️ Show Labels':'❌ Show Labels'; renderLabels(); });
  document.getElementById('menu-toggle-rulers').addEventListener('click', function(){ showRulers=!showRulers; this.textContent = showRulers? '✔️ Show Rulers':'❌ Show Rulers'; document.getElementById('ruler-top-scroll').style.display = showRulers? 'block':'none'; document.getElementById('ruler-left-scroll').style.display = showRulers? 'block':'none'; });
  document.getElementById('menu-undo').addEventListener('click', undo);
  document.getElementById('menu-redo').addEventListener('click', redo);
  document.getElementById('menu-new').addEventListener('click', ()=>{ loadFromXMLString('<floorplan></floorplan>'); pushState(); });
  document.getElementById('menu-clear').addEventListener('click', ()=>{ loadFromXMLString('<floorplan></floorplan>'); pushState(); });
  document.getElementById('menu-convert').addEventListener('click', ()=>{ document.getElementById('output').value = generateXMLString(); document.getElementById('output-modal').style.display='block'; });
  document.getElementById('btn-close-output').addEventListener('click', ()=>{ document.getElementById('output-modal').style.display='none'; });
  document.getElementById('menu-save').addEventListener('click', ()=>{ const a=document.createElement('a'); a.href = URL.createObjectURL(new Blob([generateXMLString()], {type:'text/xml'})); a.download='floorplan.xml'; document.body.appendChild(a); a.click(); document.body.removeChild(a); });

  const fileInput = document.getElementById('file-input');
  document.getElementById('menu-open').addEventListener('click', ()=> fileInput.click());
  document.getElementById('menu-import').addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', e=>{ if (!e.target.files[0]) return; const reader=new FileReader(); reader.onload = evt=>{ loadFromXMLString(evt.target.result); pushState(); fileInput.value=''; }; reader.readAsText(e.target.files[0]); });

  // Drag & Drop import
  drawingArea.addEventListener('dragover', (e)=>{ e.preventDefault(); });
  drawingArea.addEventListener('drop', (e)=>{ e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; const reader=new FileReader(); reader.onload = evt=>{ loadFromXMLString(evt.target.result); pushState(); }; reader.readAsText(f); });

  // Reset view button
  document.getElementById('menu-reset-zoom').addEventListener('click', ()=>{ draw.viewbox(0,0,3000,3000); saveView(); updateStatus(); });

  // --- Zoom & Pan ---
  let minZoom=0.25, maxZoom=8.0;
  drawingArea.addEventListener('wheel', (e)=>{ e.preventDefault(); const vb=draw.viewbox(); const mouse=getWorldPoint(e); const factor=(e.deltaY<0)?0.9:1.1; let newW=Math.max(3000*minZoom, Math.min(3000*maxZoom, vb.width*factor)); let newH=newW; const nx=mouse.x - (mouse.x - vb.x) * (newW / vb.width); const ny=mouse.y - (mouse.y - vb.y) * (newH / vb.height); draw.viewbox(nx,ny,newW,newH); saveView(); updateStatus(e); }, {passive:false});

  let panning=false, panStart=null, panStartVB=null;
  drawingArea.addEventListener('mousedown', (e)=>{
    // Ctrl+click selects in any tool without switching
    if (e.target.tagName!=='svg' && e.target.id!=='drawing-area'){
      let node = e.target; while (node && !node.instance) node = node.parentNode; const clicked = node && node.instance ? node.instance : null;
      if (e.ctrlKey && clicked && !clicked.hasClass('indicator') && !clicked.parent('.labels-layer') && !clicked.parent('.shell-layer')){ setActiveShape(clicked); return; }
    }

    const isMMB = e.button===1; const isSpace = e.button===0 && e.getModifierState && e.getModifierState('Spacebar');
    if (isMMB || isSpace){ e.preventDefault(); panning=true; panStart={x:e.clientX,y:e.clientY}; panStartVB={...draw.viewbox()}; return; }

    if (currentTool==='select'){
      if (e.target.tagName!=='svg' && e.target.id!=='drawing-area'){
        let node = e.target; while (node && !node.instance) node = node.parentNode; const clicked = node && node.instance ? node.instance : null;
        if (clicked && !clicked.hasClass('indicator') && !clicked.parent('.labels-layer') && !clicked.parent('.shell-layer')){ setActiveShape(clicked); return; }
      }
      setActiveShape(null); return;
    }

    isDrawing = true; setActiveShape(null);
    const snap = getSnappedCoords(e); startX=snap.x; startY=snap.y;
    if (currentTool==='square'){ currentShape = draw.rect(0,0).move(startX,startY).addClass('room').data('name','Room'); }
    else if (currentTool==='pen'){ currentShape = draw.line(startX,startY,startX,startY).addClass('wall'); }
    else if (currentTool==='measure'){
      measuring.active = true; measuring.p1={x:startX,y:startY}; measuring.p2={x:startX,y:startY};
      measuring.line = draw.line(startX,startY,startX,startY).stroke({color:'#2c3e50', width:1, dasharray:'4 4'}).addClass('measure');
      measuring.label = draw.text('0.00 m').font({size:12, family:'monospace'}).fill('#2c3e50').addClass('measure-label').move(startX, startY);
    }
  });

  document.addEventListener('mousemove', (e)=>{
    if (panning){ const vb=panStartVB; const scaleX=vb.width/drawingArea.clientWidth; const scaleY=vb.height/drawingArea.clientHeight; const dx=(panStart.x-e.clientX)*scaleX; const dy=(panStart.y-e.clientY)*scaleY; draw.viewbox(vb.x+dx, vb.y+dy, vb.width, vb.height); saveView(); updateStatus(e); return; }

    const snap = getSnappedCoords(e);
    if (snapToVertices && snap.snapped) { snapIndicator.center(snap.x, snap.y).front().show(); } else { snapIndicator.hide(); }

    if (!isDrawing || !currentShape) { updateStatus(e); return; }

    if (currentTool==='square'){
      currentShape.size(Math.abs(snap.x-startX), Math.abs(snap.y-startY)).move(Math.min(snap.x,startX), Math.min(snap.y,startY));
      updateOuterShells(); renderLabels();
    } else if (currentTool==='pen'){
      let target={x:snap.x, y:snap.y}; if (e.shiftKey){ target=angleSnap({x:startX,y:startY}, target, 45); const ang=getAngleDeg(startX,startY,target.x,target.y); statusAngle.textContent = `Angle: ${Math.round(ang)}°`; } else { statusAngle.textContent='Angle: —'; }
      currentShape.plot(startX,startY,target.x,target.y);
      updateOuterShells(); renderLabels();
    } else if (currentTool==='measure' && measuring.active){
      measuring.p2={x:snap.x, y:snap.y}; measuring.line.plot(measuring.p1.x,measuring.p1.y,measuring.p2.x,measuring.p2.y);
      const lenM = px2m(Math.hypot(measuring.p2.x-measuring.p1.x, measuring.p2.y-measuring.p1.y));
      const mx=(measuring.p1.x+measuring.p2.x)/2, my=(measuring.p1.y+measuring.p2.y)/2; measuring.label.text(`${lenM.toFixed(2)} m`).center(mx, my-10);
    }

    updateStatus(e);
  });

  document.addEventListener('mouseup', (e)=>{
    if (panning){ panning=false; return; }
    if (!isDrawing) return; isDrawing=false;

    if (currentTool==='square'){
      if (currentShape.width()===0 || currentShape.height()===0) currentShape.remove(); currentShape=null;
    } else if (currentTool==='pen'){
      if (startX===+currentShape.attr('x2') && startY===+currentShape.attr('y2')){ currentShape.remove(); }
      else { checkAndConvertClosedLoop(currentShape); }
      currentShape=null; statusAngle.textContent='Angle: —';
    } else if (currentTool==='measure'){
      measuring.active=false; // keep last measurement
    }

    updateOuterShells(); renderLabels(); pushState();
  });

  // Double-click to select (also switches to select tool)
  drawingArea.addEventListener('dblclick', (e)=>{
    if (e.target.tagName!=='svg' && e.target.id!=='drawing-area'){
      let node=e.target; while(node && !node.instance) node=node.parentNode; const clicked=node && node.instance? node.instance : null;
      if (clicked && !clicked.hasClass('indicator') && !clicked.parent('.labels-layer') && !clicked.parent('.shell-layer')){ document.getElementById('tool-select').click(); setActiveShape(clicked); }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if ((e.key==='Delete' || e.key==='Backspace') && activeShape){ activeShape.remove(); setActiveShape(null); updateOuterShells(); renderLabels(); pushState(); }
    if (e.key==='Escape'){ if (measuring.line){ measuring.line.remove(); measuring.label.remove(); measuring={active:false,p1:null,p2:null,line:null,label:null}; } currentShape=null; isDrawing=false; statusAngle.textContent='Angle: —'; }
    if (e.ctrlKey && e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); }
    const step = m2px(0.05); // 5 cm nudge
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && selection.size){ selection.forEach(el=>{ if (el.type==='rect' || el.type==='polygon'){ const dx=(e.key==='ArrowLeft')?-step:(e.key==='ArrowRight')?step:0; const dy=(e.key==='ArrowUp')?-step:(e.key==='ArrowDown')?step:0; el.dmove(dx,dy); } else if (el.hasClass('wall') && el.type==='line'){ const dx=(e.key==='ArrowLeft')?-step:(e.key==='ArrowRight')?step:0; const dy=(e.key==='ArrowUp')?-step:(e.key==='ArrowDown')?step:0; el.attr({ x1:+el.attr('x1')+dx, y1:+el.attr('y1')+dy, x2:+el.attr('x2')+dx, y2:+el.attr('y2')+dy }); } }); updateOuterShells(); renderLabels(); pushState(); }
  });

  // --- View persistence & autosave ---
  function saveView(){ localStorage.setItem('fp_vb', JSON.stringify(draw.viewbox())); }
  function restoreView(){ const v=localStorage.getItem('fp_vb'); if (v){ try{ const vb=JSON.parse(v); if (vb && vb.width && vb.height) draw.viewbox(vb.x, vb.y, vb.width, vb.height);}catch{} } }
  restoreView(); updateStatus();
  function autosave(){ localStorage.setItem('fp_autosave', generateXMLString()); }
  setInterval(autosave, 30000);
  const last = localStorage.getItem('fp_autosave'); if (last){ loadFromXMLString(last); pushState(); }
  if (!undoStack.length){ pushState(); }
})();
