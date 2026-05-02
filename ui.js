/* ui.js - สำหรับจัดการหน้าจอ (Screen), ปุ่มกด (DOM Updates), และ UI ต่างๆ */

// ===== HUD =====
function updateHUD(){
  const s = STAGES[stageIdx % STAGES.length];
  document.getElementById('hud-stage-info').innerHTML = `${s.emoji} ${s.name} <span style="background:linear-gradient(135deg,#bc8cff,#58a6ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-weight:900;margin-left:4px;">⭐ LV ${currentLevel}</span>`;
  document.getElementById('hud-hp').textContent=hp;
  document.getElementById('hud-gold').textContent=gold;
  document.getElementById('hud-wave').textContent=wave;
  updateUpgradePanelButton();
}
function updateUpgradePanelButton(){
  if(!selectedTower)return;
  const upBtn=document.getElementById('up-upgrade');
  if(!upBtn)return;
  const td=TOWER_TYPES[selectedTower.type], lv=selectedTower.level;
  if(lv>=3){upBtn.disabled=true;}
  else{const cost=UPGRADE_COST[lv+1];upBtn.disabled=gold<cost;}
}
function cycleSpeed(){
  playSfx('click');
  speedMode=(speedMode+1)%3;speedMult=[1,2,3][speedMode];updateSpeedUI();
}
function updateSpeedUI(){
  const btn=document.getElementById('speed-btn');
  btn.textContent=['1x','2x','3x'][speedMode];
  btn.className=['','x2','x3'][speedMode];
}
function toggleAutoUpgrade(){
  playSfx('click');
  autoUpgradeEnabled = !autoUpgradeEnabled;
  updateAutoUpgradeUI();
}
function updateAutoUpgradeUI(){
  const btn=document.getElementById('auto-upgrade-btn');
  if(!btn) return;
  if (autoUpgradeEnabled) btn.classList.add('active');
  else btn.classList.remove('active');
  btn.textContent = autoUpgradeEnabled ? 'ON⬆' : 'A⬆';
}

// ===== MINIMAP =====
function buildMinimap(){
  const bar=document.getElementById('minimap-bar'); bar.innerHTML='';
  const label=document.createElement('div');
  label.style.cssText='font-size:10px;color:var(--muted);white-space:nowrap;display:flex;align-items:center;padding-right:4px;border-right:1px solid var(--border);margin-right:4px;';
  label.textContent='ด่านถัดไป →';
  bar.appendChild(label);
  for(let i=0;i<8;i++){
    const lvNum=currentLevel+i;
    const si=(lvNum-1)%STAGES.length;
    const st=STAGES[si];
    const isBossLv=(lvNum%5===0);
    const btn=document.createElement('div');
    btn.className='stage-btn'+(i===0?' active':'');
    btn.style.position='relative';
    btn.innerHTML=`${st.emoji}<span class="s-lbl">Lv${lvNum}</span>`;
    if(isBossLv){
      const badge=document.createElement('span');
      badge.style.cssText='position:absolute;top:-4px;right:-4px;font-size:8px;background:var(--red);color:#fff;border-radius:4px;padding:0 3px;font-weight:700;';
      badge.textContent='BOSS';
      btn.appendChild(badge);
    }
    bar.appendChild(btn);
  }
}

// ===== MSG OVERLAY =====
function hideMsg(){document.getElementById('msg-overlay').classList.remove('show');}
function startGame(){ initGame(); }
function showMsg(title,sub,btn1Text,btn1Fn,btn2Text,btn2Fn){
  document.getElementById('msg-title2').innerHTML=title; // เปลี่ยนเป็น innerHTML เพื่อให้จัดรูปแบบได้
  document.getElementById('msg-sub2').innerHTML=sub;
  const btn1=document.getElementById('msg-btn');
  const btn2=document.getElementById('msg-btn2');
  const btn3=document.getElementById('msg-btn3');
  btn1.textContent=btn1Text;
  btn1.onclick=btn1Fn;
  if(btn2Text){btn2.textContent=btn2Text;btn2.onclick=btn2Fn;btn2.style.display='block';}else{btn2.style.display='none';}
  btn3.style.display='none';
  document.getElementById('msg-overlay').classList.add('show');
}
function showNotEnoughGold(td, x, y){
  addPart(x, y - 20, `💰 ไม่พอ ${td.cost}g`, 20); // แสดงข้อความลอยขึ้น
}
function pauseGame(){
  playSfx('click');
  if(gameOver || won) {
    if (isMultiplayer) cancelMultiplayer(); else gotoHome();
    if(animFrame) cancelAnimationFrame(animFrame);
    return;
  }
  isPaused = true;
  showMsg('⏸️ หยุดเกมชั่วคราว','ต้องการเล่นต่อหรือออกจากด่าน?','▶ เล่นต่อ',()=>{
    isPaused = false;
    lastTime = performance.now(); // ป้องกันการกระตุกเมื่อกลับเข้าเกม
    hideMsg();
  },'🏠 ออกจากเกม',()=>{
    isPaused = false;
    if (isMultiplayer) cancelMultiplayer(); else gotoHome();
    if(animFrame) cancelAnimationFrame(animFrame);
  });
}

// ===== UI ACTIONS / CANVAS INTERACTION =====
let _selectedHeroIdx=0;

function renderHomeHeroes(){
  const box=document.getElementById('hero-showcase'); box.innerHTML='';
  HEROES.forEach((h,i)=>{
    const lv=saveData.heroLevels[i];
    const el=document.createElement('div');
    el.className='hero-card'+(i===saveData.equippedHero?' selected':'');
    el.innerHTML=`<div class="hc-emoji">${h.emoji}</div><div class="hc-name">${h.name}</div><div class="hc-lv">Lv.${lv+1}</div>`;
    el.onclick=()=>{ 
      saveData.equippedHero=i; 
      document.getElementById('main-hero-display').textContent = h.emoji;
      renderHomeHeroes(); renderHomeTowerSelect(); saveGame(); 
    };
    box.appendChild(el);
  });
}

function renderHeroList(){
  const box=document.getElementById('hero-list'); box.innerHTML='';
  HEROES.forEach((h,i)=>{
    const el=document.createElement('div');
    el.className='hl-btn'+(i===_selectedHeroIdx?' active':'');
    el.innerHTML=`<div class="hlb-em">${h.emoji}</div><div class="hlb-name">${h.name}</div>`;
    el.onclick=()=>selectHeroDetail(i);
    box.appendChild(el);
  });
}

function selectHeroDetail(i){
  _selectedHeroIdx=i; renderHeroList();
  const h=HEROES[i], lv=saveData.heroLevels[i];
  const stats=getHeroStats(h,lv), nextStats=lv<h.maxLv?getHeroStats(h,lv+1):null;
  const hdEm = document.getElementById('hd-em');
  hdEm.textContent=h.emoji;
  hdEm.style.filter = `drop-shadow(0 0 30px ${h.color || 'var(--purple)'})`;
  document.getElementById('hd-portrait-glow').style.background = h.color || 'var(--purple)';
  document.getElementById('hd-name').textContent=h.name;
  document.getElementById('hd-lv').textContent=`Level ${lv+1} / ${h.maxLv+1}`;
  document.getElementById('hd-lv-fill').style.width=`${(lv/h.maxLv)*100}%`;
  document.getElementById('hd-stats').innerHTML=`
    <div class="hd-stat"><div class="s-label">⚔️ พลังโจมตี</div><div class="s-val">+${stats.atkBonus}%</div>${nextStats?`<div class="s-next">→ +${nextStats.atkBonus}%</div>`:''}</div>
    <div class="hd-stat"><div class="s-label">🎯 พิสัย</div><div class="s-val">+${stats.rangeBonus}</div>${nextStats?`<div class="s-next">→ +${nextStats.rangeBonus}</div>`:''}</div>
    <div class="hd-stat"><div class="s-label">💰 โบนัสทอง</div><div class="s-val">+${stats.goldBonus}%</div>${nextStats?`<div class="s-next">→ +${nextStats.goldBonus}%</div>`:''}</div>
    <div class="hd-stat"><div class="s-label">❤️ โบนัส HP</div><div class="s-val">+${stats.hpBonus}</div>${nextStats?`<div class="s-next">→ +${nextStats.hpBonus}</div>`:''}</div>`;
  document.getElementById('hd-skills').innerHTML=`
    <div class="skill-row">
      <div class="sk-em">${h.skill.emoji}</div>
      <div class="sk-info"><div class="sk-name">${h.skill.name}</div><div class="sk-desc">${h.skill.desc}</div></div>
      <div class="sk-lv">Lv.${lv+1}</div>
    </div>`;
  const cost=lv<h.maxLv?h.upgradeCost[lv]:null;
  const upBtn=document.getElementById('hd-upgrade-btn');
  if(cost===null){upBtn.textContent='✅ Level สูงสุดแล้ว';upBtn.disabled=true;}
  else if(saveData.gems<cost){upBtn.textContent=`⬆ อัพเกรด (${cost}💎) — ไม่พอ`;upBtn.disabled=true;}
  else{upBtn.textContent=`⬆ อัพเกรด Lv.${lv+2} (${cost}💎)`;upBtn.disabled=false;}
  const eqBtn=document.getElementById('hd-equip-btn');
  if(saveData.equippedHero===i){eqBtn.textContent='✅ กำลังใช้งาน';eqBtn.className='equipped';eqBtn.style.background='var(--green)';eqBtn.style.color='#fff';}
  else{eqBtn.textContent=`เลือกใช้ ${h.name}`;eqBtn.className='';eqBtn.style.background='transparent';eqBtn.style.color='var(--green)';}
}

function doHeroUpgrade(){
  const h=HEROES[_selectedHeroIdx], lv=saveData.heroLevels[_selectedHeroIdx];
  if(lv>=h.maxLv)return;
  const cost=h.upgradeCost[lv];
  if(saveData.gems<cost)return;
  saveData.gems-=cost; saveData.heroLevels[_selectedHeroIdx]++;
  saveGame();
  document.getElementById('hero-coins-val').textContent=saveData.gems;
  selectHeroDetail(_selectedHeroIdx);
}

function doEquip(){ saveData.equippedHero=_selectedHeroIdx; selectHeroDetail(_selectedHeroIdx); }

function renderGameToolbar() {
  const container = document.getElementById('toolbar-towers');
  container.innerHTML = '';
  saveData.selectedTowers.forEach(tIdx => {
    const t = TOWER_TYPES[tIdx];
    const btn = document.createElement('button');
    btn.className = 'tower-btn';
    btn.id = `tbtn-${tIdx}`;
    btn.onpointerdown = (ev) => startDragTower(ev, tIdx);
    btn.innerHTML = `${t.emoji}<span class="tn">${t.name}</span><span class="tc">${t.cost}g</span>`;
    container.appendChild(btn);
  });
}

let _lastHeroHudState = {};
function updateHeroHud(){
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  
  if (_lastHeroHudState.hero !== h.id || _lastHeroHudState.lv !== lv) {
    document.getElementById('hh-em').textContent=h.emoji;
    document.getElementById('hh-name').textContent=`${h.name} Lv.${lv+1}`;
    _lastHeroHudState.hero = h.id;
    _lastHeroHudState.lv = lv;
  }
  
  // Update Hero HP Bar in HUD
  if (heroEntity) {
    const hpPct = Math.max(0, (heroEntity.hp / heroEntity.maxHp) * 100);
    if (_lastHeroHudState.hpPct !== hpPct) {
      const hpBar = document.getElementById('hh-hp-bar');
      if (hpBar) {
        hpBar.style.width = hpPct + '%';
        hpBar.style.background = hpPct > 40 ? 'var(--green)' : 'var(--red)';
      }
      _lastHeroHudState.hpPct = hpPct;
    }
  }

  // Update Mana Bar width
  const manaPct = (mana / maxMana * 100);
  if (_lastHeroHudState.manaPct !== manaPct) {
    document.getElementById('hh-mana-bar').style.width = manaPct + '%';
    _lastHeroHudState.manaPct = manaPct;
  }

  const cost = h.skill.manaCost;
  const canCast = mana >= cost;
  const btnText = canCast ? `${h.skill.emoji} ใช้ทักษะ (${cost})` : `💧 ${Math.round(mana)}/${cost}`;
  
  if (_lastHeroHudState.btnText !== btnText || _lastHeroHudState.canCast !== canCast) {
    const btn=document.getElementById('hh-use');
    btn.disabled = !canCast;
    btn.textContent = btnText;
    document.getElementById('hh-skill').textContent = canCast ? `${h.skill.name} (พร้อมใช้งาน)` : `${h.skill.name} (มานาไม่พอ)`;
    _lastHeroHudState.btnText = btnText;
    _lastHeroHudState.canCast = canCast;
  }
}

let isPointerDown = false;
let isDraggingHero = false;
let dragStartX = 0;
let dragStartY = 0;

function onPointerDown(ev) {
  if (gameOver || won) return;
  isPointerDown = true;
  const rect = canvas.getBoundingClientRect();
  const sx = GAME_WIDTH / rect.width;
  const mx = (ev.clientX - rect.left) * sx, my = (ev.clientY - rect.top) * sx;
  dragStartX = mx;
  dragStartY = my;

  if (heroEntity && !heroEntity.dead) {
    const distH = Math.sqrt((mx - heroEntity.x) ** 2 + (my - heroEntity.y) ** 2);
    if (distH < 50) { // ระยะจับกว้างขึ้นเพื่อให้จิ้มง่าย
      isDraggingHero = true;
      heroEntity.selected = true;
      playSfx('click');
      closeSelType();
      closeUpgrade();
      addPart(heroEntity.x, heroEntity.y - 20, '☝️', 20);
    }
  }
}

function onPointerMove(ev) {
  if (!isPointerDown) return;
  const rect = canvas.getBoundingClientRect();
  const sx = GAME_WIDTH / rect.width;
  const mx = (ev.clientX - rect.left) * sx, my = (ev.clientY - rect.top) * sx;

  if (isDraggingHero && heroEntity && !heroEntity.dead) {
    heroEntity.targetX = mx;
    heroEntity.targetY = my;
  }
}

function onPointerUp(ev) {
  if (gameOver || won) return;
  isPointerDown = false;
  const rect = canvas.getBoundingClientRect();
  const sx = GAME_WIDTH / rect.width;
  const mx = (ev.clientX - rect.left) * sx, my = (ev.clientY - rect.top) * sx;

  if (isDraggingHero) {
    isDraggingHero = false;
    if (heroEntity) {
      heroEntity.selected = false;
      heroEntity.targetX = mx;
      heroEntity.targetY = my;
      addPart(mx, my, '📍', 16);
    }
  } else {
    // ถ้าไม่ได้ลาก แต่เป็นการจิ้มธรรมดาที่พื้น (เคลื่อนที่ไม่เกิน 10px) ให้ถือว่าเป็นการสร้าง/เลือกป้อม
    const distSq = (mx - dragStartX) ** 2 + (my - dragStartY) ** 2;
    if (distSq < 100) {
      handleCanvasClick(mx, my);
    }
  }
}

function handleCanvasClick(mx, my) {
  const c = Math.floor(mx / CS), r = Math.floor(my / CS);

  // 1. จัดการป้อมที่มีอยู่เดิม (อัพเกรด/เลือกดูข้อมูล)
  const existing = towers.find(t => {
    const tw = TOWER_TYPES[t.type].w || 1;
    const th = TOWER_TYPES[t.type].h || 1;
    return c >= t.c && c < t.c + tw && r >= t.r && r < t.r + th;
  });
  if(existing){
    if(selectedTower === existing){ closeUpgrade(); return; }
    selectedTower=existing; closeSelType(); openUpgrade(existing); return;
  }
  closeUpgrade();
  
  // 2. วางป้อมใหม่
  const td = TOWER_TYPES[selectedType];
  if (!td) { return; }
  const tw = td.w || 1, th = td.h || 1;
  
  let canBuild = true;
  for (let i = 0; i < tw; i++) {
    for (let j = 0; j < th; j++) {
      if (c + i >= COLS || r + j >= ROWS || isPath(c + i, r + j) || hasTower(c + i, r + j)) {
        canBuild = false; break;
      }
    }
  }
  if (!canBuild) return;
  
  const px = c * CS + (tw * CS) / 2;
  const py = r * CS + (th * CS) / 2;

  if (gold < td.cost) { showNotEnoughGold(td, mx, my); return; }

  if (isMultiplayer && !isHost) {
    sendNetData('REQUEST_BUILD', { c, r, t: selectedType });
    playSfx('build');
    addPart(px, py, '🏗', 22);
    return;
  }

  gold -= td.cost; updateHUD();
  towers.push({ c, r, x: px, y: py, type: selectedType, level: 0, cooldown: 0, aimAngle: undefined, recoilAmt: 0 });
  playSfx('build');
  addPart(px, py, '🏗', 22);
  if (isMultiplayer && isHost) sendNetData('BUILD', { c, r, t: selectedType });
  closeSelType(); // เมื่อสร้างป้อมเสร็จให้เคลียร์การเลือกทันทีเพื่อป้องกันการเผลอกดซ้ำ
}

/* ฟังก์ชันเก่า ยกเลิกการใช้งานเพราะนำไปรวมกับลอจิก startDragTower แล้ว 
function selectTower(i){
  playSfx('click');
  
  // เมื่อคลิกเลือกป้อมที่แถบเครื่องมือ ให้ยกเลิกการเลือก Hero ทันที
  if (heroEntity) heroEntity.selected = false;

  if(selectedType===i){
    selectedType=null;
    const btn = document.getElementById('tbtn-'+i);
    if(btn) btn.classList.remove('selected');
    return;
  }
  // ปรับแก้ Null Check เพื่อป้องกันบั๊กวางป้อมไม่ได้
  TOWER_TYPES.forEach((_, j) => {
    const btn = document.getElementById('tbtn-'+j);
    if(btn) btn.classList.remove('selected');
  });
  selectedType=i; selectedTower=null; closeUpgrade();
  const btn = document.getElementById('tbtn-'+i);
  if(btn) btn.classList.add('selected');
} */

let dragTowerStartX = 0;
let dragTowerStartY = 0;

function startDragTower(ev, tIdx) {
  playSfx('click');
  if (heroEntity) heroEntity.selected = false;
  
  try {
    ev.target.setPointerCapture(ev.pointerId); // ล็อคนิ้วไม่ให้ไปกระตุ้นคำสั่งระบบมือถือ
  } catch (e) {}
  
  if (selectedType === tIdx) {
    closeSelType();
    return;
  }
  
  selectedType = tIdx;
  draggingTowerType = tIdx;
  dragTowerX = ev.clientX;
  dragTowerY = ev.clientY;
  dragTowerStartX = ev.clientX;
  dragTowerStartY = ev.clientY;
  selectedTower = null; 
  closeUpgrade();
  
  TOWER_TYPES.forEach((_, j) => {
    const b = document.getElementById('tbtn-'+j);
    if(b) b.classList.remove('selected');
  });
  const btn = document.getElementById('tbtn-'+tIdx);
  if(btn) btn.classList.add('selected');
  
  document.addEventListener('pointermove', onDragTowerMove);
  document.addEventListener('pointerup', onDragTowerUp);
  document.addEventListener('pointercancel', onDragTowerUp);
}

function onDragTowerMove(ev) {
  if (draggingTowerType === null) return;
  dragTowerX = ev.clientX;
  dragTowerY = ev.clientY;
}

function onDragTowerUp(ev) {
  if (draggingTowerType === null) return;
  
  try { ev.target.releasePointerCapture(ev.pointerId); } catch(e) {}

  if (ev.type === 'pointercancel') {
    if (selectedType !== null) closeSelType();
    draggingTowerType = null;
    document.removeEventListener('pointermove', onDragTowerMove);
    document.removeEventListener('pointerup', onDragTowerUp);
    document.removeEventListener('pointercancel', onDragTowerUp);
    return;
  }
  
  const distSq = (ev.clientX - dragTowerStartX) ** 2 + (ev.clientY - dragTowerStartY) ** 2;
  const isDrag = distSq > 100; // ตรวจสอบว่าเป็นการลาก ไม่ใช่แค่จิ้มธรรมดา
  
  const rect = canvas.getBoundingClientRect();
  const sx = GAME_WIDTH / rect.width;
  const mx = (ev.clientX - rect.left) * sx;
  const my = (ev.clientY - rect.top) * sx;

  if (isDrag) {
    if (my >= 0 && my <= GAME_HEIGHT && mx >= 0 && mx <= GAME_WIDTH) {
      handleCanvasClick(mx, my); // พยายามสร้างป้อมถ้าลากมาปล่อยในจอ
    }
    if (selectedType !== null) closeSelType(); // ยกเลิกการเลือกเมื่อปล่อยนิ้ว
  }
  
  draggingTowerType = null;
  document.removeEventListener('pointermove', onDragTowerMove);
  document.removeEventListener('pointerup', onDragTowerUp);
  document.removeEventListener('pointercancel', onDragTowerUp);
}

function closeSelType(){
  selectedType=null;
  draggingTowerType=null;
  TOWER_TYPES.forEach((_, j) => {
    const btn = document.getElementById('tbtn-'+j);
    if(btn) btn.classList.remove('selected');
  });
}

function openUpgrade(t){
  const td=TOWER_TYPES[t.type], lv=t.level, lvM=UPGRADE_MULT[lv];
  const h=HEROES[saveData.equippedHero], stats=getHeroStats(h,saveData.heroLevels[saveData.equippedHero]);
  const dmgMult=1+(stats.atkBonus||0)/100;
  document.getElementById('up-title').textContent=`${td.emoji} ${td.name} Lv.${lv+1}`;
  document.getElementById('up-stats').textContent=`พลัง: ${Math.round(td.dmg*lvM*dmgMult)} | ระยะ: ${Math.round(td.range*Math.sqrt(lvM)+(stats.rangeBonus||0))} | ยิง: ${(td.rate*lvM).toFixed(1)}/s`;
  document.getElementById('up-lvbar').style.width=`${(lv+1)*25}%`;
  const upBtn=document.getElementById('up-upgrade');
  const sCost=Math.round(td.cost*(lv+1)*.5);
  document.getElementById('up-sell').textContent=`💰 ขาย (${sCost}g)`;
  if(lv>=3){upBtn.textContent='MAX';upBtn.disabled=true;}
  else{const cost=UPGRADE_COST[lv+1];upBtn.textContent=`⬆ อัพ (${cost}g)`;upBtn.disabled=gold<cost;}
  document.getElementById('upgrade-panel').classList.add('show');
}

function closeUpgrade(){selectedTower=null;document.getElementById('upgrade-panel').classList.remove('show');}

function doUpgrade(){
  if(!selectedTower||selectedTower.level>=3)return;
  const cost=UPGRADE_COST[selectedTower.level+1];
  if(gold<cost)return;

  if (isMultiplayer && !isHost) {
    sendNetData('REQUEST_UPGRADE', { c: selectedTower.c, r: selectedTower.r, cost: cost });
    // แสดงผลทันที (Prediction)
    playSfx('build');
    addPart(selectedTower.x, selectedTower.y, '⬆', 26);
    return;
  }

  // Host (or single player) upgrades tower
  playSfx('build'); // Play sound locally for immediate feedback
  gold -= cost; selectedTower.level++; updateHUD(); addPart(selectedTower.x, selectedTower.y, '⬆', 26); openUpgrade(selectedTower);
  if (isMultiplayer && isHost) sendNetData('UPGRADE', { c: selectedTower.c, r: selectedTower.r });
}

function doSell(){
  if(!selectedTower)return;
  const t=selectedTower, td=TOWER_TYPES[t.type];
  playSfx('death');
  const sellAmount = Math.round(td.cost * (t.level + 1) * 0.5);

  if (isMultiplayer && !isHost) {
    sendNetData('REQUEST_SELL', { c: t.c, r: t.r, sellAmount: sellAmount });
    // แสดงผลทันที
    playSfx('death');
    return;
  }

  // Host (or single player) sells tower
  gold += sellAmount; updateHUD();
  towers=towers.filter(x=>x!==t);closeUpgrade();
}

// ===== TOWER SCREEN & LOADOUT LOGIC =====
let _selectedTwIdx = 0;

function renderTowerScreenList() {
  const box = document.getElementById('tw-list-container');
  box.innerHTML = '';
  TOWER_TYPES.forEach((t, i) => {
    const isSelected = saveData.selectedTowers.includes(i);
    const el = document.createElement('div');
    el.className = 'hl-btn' + (i === _selectedTwIdx ? ' active' : '') + (isSelected ? ' in-loadout' : ''); 
    el.innerHTML = `<div class="hlb-em">${t.emoji}</div><div class="hlb-name">${t.name}</div>`; 
    el.onclick = () => selectTowerForUpgrade(i);
    box.appendChild(el);
  });
}

function selectTowerForUpgrade(i) {
  _selectedTwIdx = i;
  renderTowerScreenList();
  const t = TOWER_TYPES[i];
  const lv = saveData.towerLevels[i] || 0;
  
  const summary = document.getElementById('tw-loadout-summary');
  const maxSlots = getUnlockedSlots();
  summary.innerHTML = '';
  const unlockThresholds = [1, 1, 1, 1, 10, 20, 30, 40]; // เลเวลที่ปลดล็อกช่องที่ 5 ถึง 8
  const displaySlots = Math.min(8, maxSlots + 1); // แสดงช่องที่ปลดล็อกแล้ว + 1 ช่องที่กำลังจะปลดล็อก

  for(let s=0; s<displaySlots; s++) {
    const isLocked = s >= maxSlots;
    const tIdx = saveData.selectedTowers[s];
    const slot = document.createElement('div');
    slot.className = 'tw-summary-slot' + (!isLocked && tIdx !== undefined ? ' active' : '');
    
    if (isLocked) {
      slot.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; opacity:0.5;">
        <span style="font-size:16px;">🔒</span>
        <span style="font-size:7px; color:var(--muted); margin-top:2px; font-weight:800;">Lv.${unlockThresholds[s]}</span>
      </div>`;
    } else {
      slot.textContent = tIdx !== undefined ? TOWER_TYPES[tIdx].emoji : '';
      if (tIdx !== undefined) {
        slot.style.cursor = 'pointer';
        slot.onclick = (e) => {
          e.stopPropagation();
          const currentTowers = saveData.selectedTowers;
          if (currentTowers.length > 1) {
            currentTowers.splice(s, 1);
            playSfx('click');
            saveGame();
            selectTowerForUpgrade(_selectedTwIdx);
          } else {
            showToast('ต้องมีป้อมอย่างน้อย 1 ชนิดเสมอ', 'var(--red)');
          }
        };
      }
    }
    summary.appendChild(slot);
  }
  
  document.getElementById('tw-em-big').textContent = t.emoji;
  document.getElementById('tw-name-big').textContent = t.name;
  document.getElementById('tw-lv-big').textContent = `ถาวรเลเวล ${lv + 1}`;
  
  const permMult = 1 + (lv * 0.1);
  const nextMult = 1 + ((lv + 1) * 0.1);
  
  document.getElementById('tw-stats-grid').innerHTML = `
    <div class="tw-stat-card"><div class="tw-stat-label">ดาเมจพื้นฐาน</div><div class="tw-stat-val">${Math.round(t.dmg * permMult)}</div><div class="tw-stat-next">→ ${Math.round(t.dmg * nextMult)}</div></div>
    <div class="tw-stat-card"><div class="tw-stat-label">โบนัสถาวร</div><div class="tw-stat-val">+${lv * 10}%</div><div class="tw-stat-next">→ +${(lv + 1) * 10}%</div></div>
  `;
  
  const loadoutBtn = document.getElementById('tw-loadout-toggle');
  const isInLoadout = saveData.selectedTowers.includes(i);
  loadoutBtn.textContent = isInLoadout ? 'ถอดออก' : 'เลือกใช้';
  loadoutBtn.className = isInLoadout ? 'active' : '';
  
  const upBtn = document.getElementById('tw-upgrade-btn');
  const cost = (lv + 1) * 100;
  if (lv >= 20) {
    upBtn.textContent = 'เลเวลสูงสุดแล้ว';
    upBtn.disabled = true;
  } else {
    upBtn.textContent = `อัพเกรดดาเมจ (${cost} 💎)`;
    upBtn.disabled = saveData.gems < cost;
  }
}

function toggleTowerLoadout() {
  const i = _selectedTwIdx;
  const maxSlots = getUnlockedSlots();
  const idx = saveData.selectedTowers.indexOf(i);
  const currentTowers = saveData.selectedTowers;
  
  if (idx > -1) {
    if (currentTowers.length > 1) {
      currentTowers.splice(idx, 1);
      playSfx('click');
    } else { showToast('ต้องมีป้อมอย่างน้อย 1 ชนิดเสมอ', 'var(--red)'); }
  } else {
    if (currentTowers.length < maxSlots) {
      currentTowers.push(i);
      playSfx('build');
    } else if (maxSlots === 1) {
      saveData.selectedTowers = [i];
      playSfx('build');
    } else { showToast('ช่อง Loadout เต็มแล้ว!', 'var(--red)'); }
  }
  saveGame(); selectTowerForUpgrade(i); renderHomeTowerSelect();
}

function doTowerPermanentUpgrade() {
  const i = _selectedTwIdx;
  const lv = saveData.towerLevels[i] || 0;
  const cost = (lv + 1) * 100;
  if (saveData.gems >= cost && lv < 20) {
    saveData.gems -= cost; saveData.towerLevels[i] = lv + 1;
    saveGame(); document.getElementById('tower-gems-val').textContent = saveData.gems;
    selectTowerForUpgrade(i);
  }
}

function getUnlockedSlots() {
  const best = saveData.bestLevel || 1;
  if (best >= 40) return 8;
  if (best >= 30) return 7;
  if (best >= 20) return 6;
  if (best >= 10) return 5;
  return 4; // เริ่มต้นให้เลือกได้ 4 ป้อม
}

function renderHomeTowerSelect() {
  const maxSlots = getUnlockedSlots();
  const selected = saveData.selectedTowers || [0];
  if (!saveData.selectedTowers) saveData.selectedTowers = [0];

  document.getElementById('home-ts-slots-title').textContent = `Loadout (${selected.length}/${maxSlots})`;
  const visualDiv = document.getElementById('ts-slot-visuals');
  visualDiv.innerHTML = '';
  for(let i=0; i<maxSlots; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `width:${maxSlots > 5 ? 14 : 20}px; height:4px; border-radius:2px; background:${selected[i] !== undefined ? 'var(--gold)' : 'var(--bg3)'};`;
    visualDiv.appendChild(dot);
  }

  const grid = document.getElementById('home-tower-selection');
  grid.innerHTML = '';
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  const stats=getHeroStats(h,lv);
  const atkMult=1+(stats.atkBonus/100);

  saveData.selectedTowers.forEach(i => {
    const t = TOWER_TYPES[i];
    const eq = saveData.equippedWeapons[i];
    const eqMult = eq ? (1 + (eq.tier * 0.25)) : 1;
    const permLv = saveData.towerLevels[i] || 0;
    const permMult = 1 + (permLv * 0.1);
    const totalDmg = Math.round(t.dmg * permMult * atkMult * eqMult);

    const div = document.createElement('div');
    div.className = `ts-item-compact selected`;
    div.innerHTML = `<div class="ts-em">${t.emoji}</div><div class="ts-dmg">${totalDmg}</div><div class="ts-name">${t.name}</div>`;
    div.onclick = () => { gotoTower(); selectTowerForUpgrade(i); };
    grid.appendChild(div);
  });
}

function autoRecommendTowers() {
  const maxSlots = getUnlockedSlots();
  const lvl = saveData.infinityLevel || 1;
  const sIdx = (lvl - 1) % STAGES.length;
  
  const recommendations = [
    [0, 1, 3, 2, 4, 6, 7, 5, 8, 12, 16, 17], // ทุ่งหญ้า: สมดุล
    [1, 3, 0, 2, 6, 7, 4, 8, 5, 11, 14, 18], // ป่าทึบ: เน้นดาเมจหมู่และเลเซอร์
    [2, 0, 1, 3, 4, 7, 6, 5, 8, 10, 13, 15], // ทะเลทราย: เน้นสโลว์
    [3, 2, 1, 0, 6, 4, 7, 8, 5, 11, 16, 19], // ภูเขาไฟ: เน้นดาเมจแรง
    [0, 3, 1, 2, 4, 5, 6, 7, 8, 9, 15, 17]  // ดินแดนน้ำแข็ง: เน้นพิสัยไกล
  ];
  
  saveData.selectedTowers = recommendations[sIdx % recommendations.length].slice(0, maxSlots);
  renderHomeTowerSelect();
  playSfx('click');
}

// ===== RESULT LOGIC =====
function gotoResult(success, syncedDrops = null){
  if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }
  const stg = STAGES[stageIdx % STAGES.length];
  const lvBonus = Math.floor((currentLevel-1)/5)*10;
  const coinsEarned = success ? (30 + stageIdx*15 + wave*5 + lvBonus) : 0;
  
  // รวมเพชรที่ได้รับจากการดรอปและโบนัสเคลียร์ด่านเข้าด้วยกัน
  const totalGemsEarned = coinsEarned + (typeof sessionGems !== 'undefined' ? sessionGems : 0);
  saveData.gems += coinsEarned;
  let itemDropMessage = '<div style="color:var(--muted); font-size:12px;">- ไม่มีไอเทมดรอป -</div>';
  
  let newlyGeneratedDrops = [];
  if(success){
    saveData.invSeen = false; 
    
    if (isMultiplayer && !isHost && syncedDrops) {
      newlyGeneratedDrops = syncedDrops;
    } else {
      const maxT = TOWER_TYPES.length;
      newlyGeneratedDrops.push(Math.floor(Math.random() * maxT));
      if(Math.random() < 0.5) newlyGeneratedDrops.push(Math.floor(Math.random() * maxT));
      if(Math.random() < 0.25) newlyGeneratedDrops.push(Math.floor(Math.random() * maxT));
      if (isMultiplayer && isHost) sendNetData('STAGE_CLEAR', { drops: newlyGeneratedDrops });
    }

    newlyGeneratedDrops.forEach(t => {
      saveData.inventory.push({type: t, tier: 1});
    });

    checkAndMergeItems();

    saveData.currentPath = null;
    saveData.infinityLevel = currentLevel + 1;
    if(currentLevel > saveData.bestLevel) saveData.bestLevel = currentLevel;
  }
  
  // รวมไอเทมทั้งหมดที่ได้รับ ทั้งจากการเก็บในด่าน (sessionItems) และโบนัสจบด่าน
  let allDisplayedItems = [];
  if (typeof sessionItems !== 'undefined') {
    allDisplayedItems = allDisplayedItems.concat(sessionItems);
  }
  allDisplayedItems = allDisplayedItems.concat(newlyGeneratedDrops);

  if(allDisplayedItems.length > 0) {
    const droppedHtml = allDisplayedItems.map(t => {
      const td = TOWER_TYPES[t];
      return `<span style="display:inline-block; background:rgba(255,255,255,0.15); padding:4px 8px; border-radius:6px; margin:2px; font-size:12px; border:1px solid rgba(255,255,255,0.1);">${td.emoji} ${td.name} <span style="color:var(--muted);font-size:10px;">(T1)</span></span>`;
    }).join('');
    itemDropMessage = `<div style="margin-bottom:6px; font-weight:bold; color:var(--gold); font-size:14px;">🎁 ได้รับชิ้นส่วนอาวุธรวม:</div>${droppedHtml}`;
    saveData.invSeen = false; // แปะป้ายว่ามีของใหม่เสมอถ้ามีของดรอป
  }

  if (isMultiplayer && isHost && !success) sendNetData('STAGE_FAILED', {});
  saveGame();

  document.getElementById('res-title').innerHTML = success 
    ? '<div style="color:var(--green); text-shadow:0 0 20px rgba(63,185,80,0.5); font-size:1.2em;">🎉 ชนะด่าน!</div>' 
    : '<div style="color:var(--red); text-shadow:0 0 20px rgba(255,107,107,0.5); font-size:1.2em;">💀 พ่ายแพ้</div>';

  const lvTxt = success ? `⭐ Level ${currentLevel} <span style="color:var(--green)">→ ${currentLevel+1}</span>` : `⭐ Level ${currentLevel} <span style="color:var(--muted)">| สถิติ: Lv.${saveData.bestLevel}</span>`;
  document.getElementById('res-stage').innerHTML = `${stg.emoji} ${stg.name} — คลื่น ${wave}/10<br><div style="margin-top:6px; font-size:14px;">${lvTxt}</div>`;

  document.getElementById('res-gold').innerHTML = `<span style="color:var(--gold); font-weight:bold;">💰 ${gold}g</span>`;
  document.getElementById('res-coins').innerHTML = `<span style="color:#64B5F6; font-weight:bold; text-shadow:0 0 10px rgba(100,181,246,0.4);">💎 +${totalGemsEarned}</span>`;

  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  const bonus=getHeroStats(h,lv);
  document.getElementById('item-drop-content').innerHTML = itemDropMessage;
  
  document.getElementById('rhb-content').innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap:16px; background:rgba(0,0,0,0.3); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); margin-top:8px;">
      <div style="font-size:40px; filter:drop-shadow(0 0 15px ${h.color || 'var(--purple)'});">${h.emoji}</div>
      <div style="text-align:left; line-height:1.4;">
        <div style="font-weight:bold; font-size:16px; color:${h.color || 'var(--purple)'};">${h.name} <span style="color:#fff;font-size:11px;background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">Lv.${lv+1}</span></div>
        <div style="font-size:12px; color:var(--muted); margin-top:4px; display:grid; grid-template-columns:auto auto; column-gap:12px; row-gap:2px;">
          <span>⚔️ +${bonus.atkBonus}%</span>
          <span>🎯 +${bonus.rangeBonus}</span>
          <span>💰 +${bonus.goldBonus}%</span>
          <span>❤️ +${bonus.hpBonus}</span>
        </div>
      </div>
    </div>`;

  const btns=document.getElementById('res-btns');
  btns.style.display = 'flex';
  btns.style.gap = '10px';
  btns.style.flexWrap = 'wrap';
  
  if(success){
    let autoNextHtml = '';
    if (!isMultiplayer || isHost) {
      autoNextHtml = `
        <div style="width:100%; text-align:center; margin-top:5px;">
          <label style="color:var(--muted); font-size:12px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px;">
            <input type="checkbox" id="auto-next-checkbox" ${saveData.autoNextEnabled ? 'checked' : ''} onchange="toggleAutoNext(this.checked)" style="cursor:pointer; width:14px; height:14px;">
            <span>⏭️ ไปด่านต่อไปอัตโนมัติ (Auto Next)</span>
          </label>
        </div>
      `;
    } else {
      autoNextHtml = `<div style="width:100%; text-align:center; margin-top:5px; font-size:12px; color:var(--muted);">⏳ รอ Host เริ่มด่านถัดไป...</div>`;
    }

    btns.innerHTML=`<button class="res-btn secondary" style="flex:1;" onclick="gotoHero()">🦸 อัพเกรด Hero</button><button id="btn-next-stage" class="res-btn primary" style="flex:1.5; font-weight:bold; box-shadow:0 0 15px rgba(63,185,80,0.4);" onclick="continueInfinity()">⭐ ถัดไป Lv.${currentLevel+1}</button>${autoNextHtml}`;

    if (window._autoNextTimer) clearInterval(window._autoNextTimer);
    if (saveData.autoNextEnabled && (!isMultiplayer || isHost)) {
      let countdown = 3;
      const btnNext = document.getElementById('btn-next-stage');
      if (btnNext) btnNext.innerHTML = `⭐ ถัดไป Lv.${currentLevel+1} (${countdown}s)`;
      window._autoNextTimer = setInterval(() => {
        countdown--;
        const btn = document.getElementById('btn-next-stage');
        if (countdown > 0 && btn) { 
          btn.innerHTML = `⭐ ถัดไป Lv.${currentLevel+1} (${countdown}s)`; 
        } else {
          clearInterval(window._autoNextTimer);
          if (document.getElementById('result-screen').classList.contains('active')) continueInfinity();
        }
      }, 1000);
    }
  } else {
    btns.innerHTML=`<button class="res-btn secondary" style="flex:1;" onclick="gotoHero()">🦸 อัพเกรด Hero</button><button class="res-btn primary" style="flex:1.5; font-weight:bold;" onclick="tryAgain()">🔄 ลองใหม่</button>`;
  }
  showScreen('result-screen');
}

function toggleAutoNext(isChecked) {
  saveData.autoNextEnabled = isChecked;
  saveGame();
  if (window._autoNextTimer) clearInterval(window._autoNextTimer);
  const btnNext = document.getElementById('btn-next-stage');
  if (!isChecked) {
    if (btnNext) btnNext.innerHTML = `⭐ ถัดไป Lv.${currentLevel+1}`;
  } else {
    if (!isMultiplayer || isHost) {
      let countdown = 3;
      if (btnNext) btnNext.innerHTML = `⭐ ถัดไป Lv.${currentLevel+1} (${countdown}s)`;
      window._autoNextTimer = setInterval(() => {
        countdown--;
        const btn = document.getElementById('btn-next-stage');
        if (countdown > 0 && btn) { btn.innerHTML = `⭐ ถัดไป Lv.${currentLevel+1} (${countdown}s)`; } 
        else {
          clearInterval(window._autoNextTimer);
          if (document.getElementById('result-screen').classList.contains('active')) continueInfinity();
        }
      }, 1000);
    }
  }
}

function continueInfinity(){
  playSfx('click');
  if (window._autoNextTimer) clearInterval(window._autoNextTimer);
  if (isMultiplayer) {
    if (isHost) {
      currentLevel = saveData.infinityLevel;
      stageIdx = (currentLevel-1) % STAGES.length;
      let numPaths = currentLevel >= 20 ? 3 : currentLevel >= 10 ? 2 : 1;
      if (!saveData.currentPath || saveData.currentPath.length !== numPaths) {
        saveData.currentPath = [];
        for(let i = 0; i < numPaths; i++) saveData.currentPath.push(generateRandomPath(COLS, ROWS));
        saveGame();
      }
      sendNetData('START_GAME', { level: currentLevel, paths: saveData.currentPath, hero: saveData.equippedHero });
      showScreen('game-screen');
      setTimeout(initGame, 0);
    } else {
      showMsg('รอ Host', 'กำลังรอ Host เริ่มด่านถัดไป...', 'ยกเลิก', cancelMultiplayer);
    }
  } else {
    currentLevel = saveData.infinityLevel;
    stageIdx = (currentLevel-1) % STAGES.length;
    showScreen('game-screen');
    setTimeout(initGame,0);
  }
}

function tryAgain(){
  playSfx('click');
  if (window._autoNextTimer) clearInterval(window._autoNextTimer);
  if (isMultiplayer) {
    if (isHost) {
      currentLevel = saveData.infinityLevel;
      let numPaths = currentLevel >= 20 ? 3 : currentLevel >= 10 ? 2 : 1;
      if (!saveData.currentPath || saveData.currentPath.length !== numPaths) {
        saveData.currentPath = [];
        for(let i = 0; i < numPaths; i++) saveData.currentPath.push(generateRandomPath(COLS, ROWS));
        saveGame(); 
      }
      sendNetData('START_GAME', { level: currentLevel, paths: saveData.currentPath, hero: saveData.equippedHero });
      showScreen('game-screen');
      setTimeout(initGame, 0);
    } else {
      sendNetData('REQUEST_TRY_AGAIN', {});
      showMsg('รอ Host', 'กำลังรอ Host เริ่มเกมใหม่...', 'ยกเลิก', cancelMultiplayer);
    }
  } else {
    showScreen('game-screen');
    setTimeout(initGame,0);
  }
}

function restartInfinity(){
  saveData.infinityLevel=1; saveData.currentPath=null; saveGame();
  currentLevel=1; stageIdx=0;
  showScreen('game-screen');
  setTimeout(initGame,0);
}

// ===== EQUIPMENT & MERGE LOGIC =====
function renderInventory() {
  const equipBox = document.getElementById('equip-slots');
  equipBox.innerHTML = '';
  TOWER_TYPES.forEach((td, i) => {
    const eq = saveData.equippedWeapons[i];
    const div = document.createElement('div');
    const tCls = eq ? `tier-${Math.min(eq.tier, 5)}` : '';
    div.className = 'equip-box' + (eq ? ` active ${tCls}` : '');
    div.innerHTML = eq 
      ? `<span style="font-size:22px;">${td.emoji}</span><span class="item-tier">T${eq.tier}</span>`
      : `<span style="font-size:18px; opacity:0.3;">${td.emoji}</span>`;
    div.innerHTML += `<div class="eb-type">${td.name}</div>`;
    if(eq) div.onclick = () => { saveData.equippedWeapons[i] = null; renderInventory(); saveGame(); };
    equipBox.appendChild(div);
  });

  const grid = document.getElementById('inv-grid');
  grid.innerHTML = '';
  const groups = {};
  saveData.inventory.forEach((item, idx) => {
    const key = `${item.type}_${item.tier}`;
    if(!groups[key]) groups[key] = { ...item, count: 0, indices: [] };
    groups[key].count++;
    groups[key].indices.push(idx);
  });

  Object.values(groups).forEach(g => {
    const td = TOWER_TYPES[g.type];
    const div = document.createElement('div');
    const tierClass = `tier-${Math.min(g.tier, 5)}`;
    div.className = `inv-slot ${tierClass}`;
    div.innerHTML = `<span class="item-em">${td.emoji}</span><span class="item-tier">T${g.tier}</span><span class="item-count">x${g.count}</span>`;
    div.onclick = () => {
      saveData.equippedWeapons[g.type] = { type: g.type, tier: g.tier };
      renderInventory();
      saveGame();
    };
    grid.appendChild(div);
  });
}

function checkAndMergeItems() {
  let merged = false;
  const counts = {};
  saveData.inventory.forEach(item => {
    const key = `${item.type}_${item.tier}`;
    counts[key] = (counts[key] || 0) + 1;
    if(counts[key] >= 4) {
      const [type, tier] = key.split('_').map(Number);
      let removed = 0;
      saveData.inventory = saveData.inventory.filter(it => {
        if(it.type === type && it.tier === tier && removed < 4) { removed++; return false; }
        return true;
      });
      saveData.inventory.push({type, tier: tier + 1});
      merged = true;
    }
  });
  if(merged) checkAndMergeItems();
}

// ===== ELEMENTAL INFO DIALOG =====
function showElementInfo() {
  playSfx('click');
  const sIdx = (currentLevel - 1) % STAGES.length;
  
  let monstersHtml = '';
  let bossHtml = '';
  
  if (sIdx === 0) {
    monstersHtml = `🧌 โทรลล์ (พืช) : <span style="color:#FF6B35;font-weight:bold;">แพ้ไฟ 🔥</span><br>👺 ก๊อบลิน (พืช) : <span style="color:#FF6B35;font-weight:bold;">แพ้ไฟ 🔥</span><br>🦅 นกยักษ์ (บิน) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span><br>🧙 พ่อมดก๊อบลิน (มืด) : <span style="color:#9b59b6;font-weight:bold;">แพ้เวทมนตร์ 🪄</span><br><div style="color:var(--red); font-weight:900; margin-top:8px; margin-bottom:4px;">การต้านทาน (Resist)</div><span style="color:var(--muted);font-size:10px;">🛡️ ศัตรูพืช กันน้ำแข็ง</span>`;
    bossHtml = `🐉 มังกร (ไฟ) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันไฟ</span><br>🦑 คราเคน (น้ำ) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันน้ำแข็ง</span>`;
  } else if (sIdx === 1) {
    monstersHtml = `🕷️ แมงมุม (แมลง) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span><br>🐺 หมาป่า (สัตว์) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span><br>🐝 ผึ้งนักฆ่า (บิน) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span><br>🥀 ดอกไม้กินคน (พืช) : <span style="color:#FF6B35;font-weight:bold;">แพ้ไฟ 🔥</span><br><div style="color:var(--red); font-weight:900; margin-top:8px; margin-bottom:4px;">การต้านทาน (Resist)</div><span style="color:var(--muted);font-size:10px;">🛡️ แมลง กันสายฟ้า | พืช กันน้ำแข็ง</span>`;
    bossHtml = `🐉 มังกร (ไฟ) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันไฟ</span><br>🦑 คราเคน (น้ำ) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันน้ำแข็ง</span>`;
  } else if (sIdx === 2) {
    monstersHtml = `🪨 โกเลมทราย (ดิน) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span><br>🦂 แมงป่อง (แมลง) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span><br>🦇 ค้างคาวทราย (บิน) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span><br>🥷 โจรทะเลทราย (มืด) : <span style="color:#9b59b6;font-weight:bold;">แพ้เวทมนตร์ 🪄</span><br><div style="color:var(--red); font-weight:900; margin-top:8px; margin-bottom:4px;">การต้านทาน (Resist)</div><span style="color:var(--muted);font-size:10px;">🛡️ ดิน/หิน กันสายฟ้า</span>`;
    bossHtml = `🐛 หนอนทะเลทราย (ดิน) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันไฟ/ระเบิด</span>`;
  } else if (sIdx === 3) {
    monstersHtml = `🌋 โกเลมลาวา (ไฟ) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span><br>🦖 กิ้งก่าไฟ (สัตว์) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span><br>🐉 ลูกมังกร (บิน) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span><br>👿 อิมป์ (มืด) : <span style="color:#9b59b6;font-weight:bold;">แพ้เวทมนตร์ 🪄</span><br><div style="color:var(--red); font-weight:900; margin-top:8px; margin-bottom:4px;">การต้านทาน (Resist)</div><span style="color:var(--muted);font-size:10px;">🛡️ ศัตรูทุกตัวในด่าน กันไฟ 🔥</span>`;
    bossHtml = `🐉 มังกร (ไฟ) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันไฟ</span><br>🦑 คราเคน (น้ำ) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันน้ำแข็ง</span>`;
  } else {
    monstersHtml = `⛄ เยติ (น้ำแข็ง) : <span style="color:#FF6B35;font-weight:bold;">แพ้ไฟ 🔥</span><br>🐻‍❄️ หมีขาว (สัตว์) : <span style="color:#FF6B35;font-weight:bold;">แพ้ไฟ 🔥</span><br>🦉 นกฮูกหิมะ (บิน) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span><br>👻 วิญญาณน้ำแข็ง (มืด) : <span style="color:#9b59b6;font-weight:bold;">แพ้เวทมนตร์ 🪄</span><br><div style="color:var(--red); font-weight:900; margin-top:8px; margin-bottom:4px;">การต้านทาน (Resist)</div><span style="color:var(--muted);font-size:10px;">🛡️ ศัตรูทุกตัวในด่าน กันน้ำแข็ง ❄️</span>`;
    bossHtml = `🐉 มังกร (ไฟ) : <span style="color:#64B5F6;font-weight:bold;">แพ้น้ำแข็ง ❄️</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันไฟ</span><br>🦑 คราเคน (น้ำ) : <span style="color:#FFD700;font-weight:bold;">แพ้สายฟ้า ⚡</span> <span style="color:var(--muted);font-size:10px;">| 🛡️ กันน้ำแข็ง</span>`;
  }

  const info = `
    <div style="text-align:left; font-size:13px; line-height:1.7; color:var(--text); margin-top:10px; background:rgba(0,0,0,0.3); padding:12px; border-radius:10px; border:1px solid var(--border); max-height:60vh; overflow-y:auto;">
      <div style="color:var(--gold); font-weight:900; margin-bottom:4px;">ศัตรูในด่านนี้ (${STAGES[sIdx].name})</div>
      ${monstersHtml}
      <div style="color:var(--red); font-weight:900; margin-top:8px; margin-bottom:4px;">บอสประจำด่าน (Wave 10)</div>
      ${bossHtml}
      <div style="margin-top:8px; font-size:10px; color:var(--muted); line-height:1.4;">
        * โจมตีจุดอ่อน ดาเมจ <span style="color:var(--green);font-weight:bold;">x1.5</span> เท่า<br>
        * โจมตีธาตุที่ต้านทาน ดาเมจ <span style="color:var(--red);font-weight:bold;">ลดลง 50%</span>
      </div>
    </div>
  `;
  showMsg('📖 ข้อมูลแพ้ทางธาตุ', info, 'ปิดหน้าต่าง', hideMsg);
}