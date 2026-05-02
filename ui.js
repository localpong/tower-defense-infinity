/* ui.js - สำหรับจัดการหน้าจอ (Screen), ปุ่มกด (DOM Updates), และ UI ต่างๆ */

// ===== HUD =====
function updateHUD(){
  const s = STAGES[stageIdx % STAGES.length];
  document.getElementById('hud-stage-info').textContent = `${s.emoji} ${s.name}`;
  document.getElementById('hud-hp').textContent=hp;
  document.getElementById('hud-mana').textContent=Math.round(mana);
  document.getElementById('hud-gold').textContent=gold;
  document.getElementById('hud-wave').textContent=wave;
  document.getElementById('hud-level').textContent=currentLevel;
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
function toggleAutoWave(){
  playSfx('click');
  autoWaveEnabled = !autoWaveEnabled;
  updateAutoWaveUI();
  if(autoWaveEnabled && !waveRunning && wave < 10) {
    startWave(); // Start next wave immediately if conditions met
  }
}
function updateAutoWaveUI(){
  const btn=document.getElementById('auto-wave-btn');
  if (autoWaveEnabled) btn.classList.add('active');
  else btn.classList.remove('active');
  btn.textContent = autoWaveEnabled ? 'ON🌊' : 'A🌊';
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
  document.getElementById('msg-title2').textContent=title;
  document.getElementById('msg-sub2').textContent=sub;
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
function cancelGame(){
  showMsg('❌ ยกเลิกเกม','คุณแน่ใจหรือว่าจะออกจากเกม? จะไม่ได้รับเพรชที่ได้มา','ใช่ ออกจากเกม',()=>{
    if (isMultiplayer) {
      cancelMultiplayer();
    } else {
      gotoHome();
    }
    if(animFrame) cancelAnimationFrame(animFrame);
  },'ยกเลิก',hideMsg);
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
    btn.onclick = () => selectTower(tIdx);
    btn.innerHTML = `${t.emoji}<span class="tn">${t.name}</span><span class="tc">${t.cost}g</span>`;
    container.appendChild(btn);
  });
}

function updateHeroHud(){
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  document.getElementById('hh-em').textContent=h.emoji;
  document.getElementById('hh-name').textContent=`${h.name} Lv.${lv+1}`;
  
  // Update Hero HP Bar in HUD
  if (heroEntity) {
    const hpPct = Math.max(0, (heroEntity.hp / heroEntity.maxHp) * 100);
    const hpBar = document.getElementById('hh-hp-bar');
    if (hpBar) {
      hpBar.style.width = hpPct + '%';
      hpBar.style.background = hpPct > 40 ? 'var(--green)' : 'var(--red)';
    }
  }

  // Update Mana Bar width
  document.getElementById('hh-mana-bar').style.width = (mana / maxMana * 100) + '%';

  const cost = h.skill.manaCost;
  const btn=document.getElementById('hh-use');
  if(mana < cost){
    btn.disabled=true; btn.textContent=`💧 ${Math.round(mana)}/${cost}`;
    document.getElementById('hh-skill').textContent=h.skill.name+' (มานาไม่พอ)';
  } else {
    btn.disabled=false; btn.textContent=`${h.skill.emoji} ใช้ทักษะ (${cost})`;
    document.getElementById('hh-skill').textContent=`${h.skill.name} (พร้อมใช้งาน)`;
  }
}

function onCanvasClick(ev){
  if(gameOver||won)return;
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/rect.width;
  const mx=(ev.clientX-rect.left)*sx, my=(ev.clientY-rect.top)*sx;
  const c=Math.floor(mx/CS), r=Math.floor(my/CS);

  // 1. Hero Selection Priority (คลิกที่ตัว Hero)
  if(heroEntity && !heroEntity.dead) {
    const distH = Math.sqrt((mx - heroEntity.x)**2 + (my - heroEntity.y)**2);
    if (distH < 35) {
      heroEntity.selected = !heroEntity.selected;
      playSfx('click');
      if(heroEntity.selected) {
        closeSelType(); // ยกเลิกการเลือกป้อมที่จะวางทันทีเพื่อให้คุม Hero ได้
        closeUpgrade(); // ปิดหน้าต่างอัพเกรดถ้าเปิดอยู่
        addPart(heroEntity.x, heroEntity.y - 20, '☝️', 20);
      }
      return;
    }
  }

  // 2. คำสั่งเดิน Hero หรือโต้ตอบกับวัตถุ (ถ้าเราเลือก Hero ตัวนั้นอยู่)
  if (heroEntity && heroEntity.selected && !heroEntity.dead) {
    // ตรวจสอบว่าคลิกโดน Item หรือไม่
    const clickedPickup = pickups.find(p => Math.sqrt((mx - p.x)**2 + (my - p.y)**2) < 30);
    if (clickedPickup) {
      heroEntity.targetX = clickedPickup.x;
      heroEntity.targetY = clickedPickup.y;
      addPart(clickedPickup.x, clickedPickup.y, '🏃', 16);
      return; // เดินไปเก็บของแล้วจบการทำงานคลิกนี้
    }

    // ตรวจสอบว่าคลิกโดน Enemy หรือไม่
    const clickedEnemy = enemies.find(e => !e.dead && Math.sqrt((mx - e.x)**2 + (my - e.y)**2) < 30);
    if (clickedEnemy) {
      heroEntity.targetX = clickedEnemy.x;
      heroEntity.targetY = clickedEnemy.y;
      addPart(clickedEnemy.x, clickedEnemy.y, '⚔️', 16);
      return; // เดินไปโจมตีศัตรูแล้วจบการทำงานคลิกนี้
    }

    // ถ้าไม่โดนอะไรเลย ให้เดินไปยังจุดที่คลิก
    heroEntity.targetX = mx;
    heroEntity.targetY = my;
    // heroEntity.selected = false; // นำออก: เพื่อให้เลือกค้างไว้สำหรับการสั่งเดินต่อเนื่อง
    addPart(mx, my, '📍', 16);
    return;
  }

  // 3. จัดการป้อมที่มีอยู่เดิม (อัพเกรด/เลือกดูข้อมูล)
  const existing=towers.find(t=>t.c===c&&t.r===r);
  if(existing){
    if(selectedTower === existing){ closeUpgrade(); return; }
    selectedTower=existing; closeSelType(); openUpgrade(existing); return;
  }
  closeUpgrade();
  
  // 4. วางป้อมใหม่ (เฉพาะเมื่อไม่ได้เลือก Hero อยู่)
  const td=TOWER_TYPES[selectedType];
  if(!td || isPath(c,r)) { return; }
  if(gold<td.cost){showNotEnoughGold(td, mx, my);return;}

  if (isMultiplayer && !isHost) {
    sendNetData('REQUEST_BUILD', { c, r, t: selectedType });
    // แสดงผลทันที (Prediction)
    playSfx('build');
    addPart(c*CS+CS/2, r*CS+CS/2, '🏗', 22);
    return;
  }

  gold-=td.cost; updateHUD();
  towers.push({c,r,x:c*CS+CS/2,y:r*CS+CS/2,type:selectedType,level:0,cooldown:0,aimAngle:undefined,recoilAmt:0});
  playSfx('build');
  addPart(c*CS+CS/2,r*CS+CS/2,'🏗',22);
  if (isMultiplayer && isHost) sendNetData('BUILD', { c, r, t: selectedType });
}

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
}

function closeSelType(){
  selectedType=null;
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
  const unlockThresholds = [1, 5, 10, 15];

  for(let s=0; s<4; s++) {
    const isLocked = s >= maxSlots;
    const tIdx = saveData.selectedTowers[s];
    const slot = document.createElement('div');
    slot.className = 'tw-summary-slot' + (!isLocked && tIdx !== undefined ? ' active' : '');
    
    if (isLocked) {
      slot.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; opacity:0.5;">
        <span style="font-size:16px;">🔒</span>
        <span style="font-size:7px; color:var(--muted); margin-top:2px; font-weight:800;">ⓘ Lv.${unlockThresholds[s]}</span>
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
  if (best >= 15) return 4;
  if (best >= 10) return 3;
  if (best >= 5) return 2;
  return 1;
}

function renderHomeTowerSelect() {
  const maxSlots = getUnlockedSlots();
  const selected = saveData.selectedTowers || [0];
  if (!saveData.selectedTowers) saveData.selectedTowers = [0];

  document.getElementById('home-ts-slots-title').textContent = `Loadout (${selected.length}/${maxSlots})`;
  const visualDiv = document.getElementById('ts-slot-visuals');
  visualDiv.innerHTML = '';
  for(let i=0; i<4; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `width:20px; height:4px; border-radius:2px; background:${i < maxSlots ? (selected[i] !== undefined ? 'var(--gold)' : 'var(--bg3)') : 'rgba(239, 68, 68, 0.2)'};`;
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
    [0, 1, 3, 2], // ทุ่งหญ้า: สมดุล
    [1, 3, 0, 2], // ป่าทึบ: เน้นดาเมจหมู่และเลเซอร์
    [2, 0, 1, 3], // ทะเลทราย: เน้นสโลว์
    [3, 2, 1, 0], // ภูเขาไฟ: เน้นดาเมจแรง
    [0, 3, 1, 2]  // ดินแดนน้ำแข็ง: เน้นพิสัยไกล
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
  saveData.gems += coinsEarned;
  let itemDropMessage = '- ไม่มี -';
  
  if(success){
    let droppedTypes = [];
    saveData.invSeen = false; 
    
    if (isMultiplayer && !isHost && syncedDrops) {
      droppedTypes = syncedDrops;
    } else {
      droppedTypes.push(Math.floor(Math.random() * 4));
      if(Math.random() < 0.5) droppedTypes.push(Math.floor(Math.random() * 4));
      if(Math.random() < 0.25) droppedTypes.push(Math.floor(Math.random() * 4));
      if (isMultiplayer && isHost) sendNetData('STAGE_CLEAR', { drops: droppedTypes });
    }

    let droppedNames = [];
    droppedTypes.forEach(t => {
      saveData.inventory.push({type: t, tier: 1});
      droppedNames.push(TOWER_TYPES[t].name);
    });

    itemDropMessage = "🎁 ได้รับ: " + droppedNames.map(n => n + " (T1)").join(", ");
    checkAndMergeItems();

    saveData.currentPath = null;
    saveData.infinityLevel = currentLevel + 1;
    if(currentLevel > saveData.bestLevel) saveData.bestLevel = currentLevel;
    
    saveGame();
    showToast(`🎉 เลเวล ${currentLevel} สำเร็จ! +${coinsEarned} 💎 ${droppedNames.length > 0 ? '🎁' : ''}`, 'var(--green)');
    setTimeout(continueInfinity, 1500);
    return;
  }
  
  if (isMultiplayer && isHost && !success) sendNetData('STAGE_FAILED', {});
  saveGame();
  document.getElementById('res-title').textContent = success ? '🎉 ชนะ!' : '💀 แพ้แล้ว';
  const lvTxt = success ? `⭐ Level ${currentLevel} → ${currentLevel+1}` : `⭐ Level ${currentLevel} | สถิติ: Lv.${saveData.bestLevel}`;
  document.getElementById('res-stage').textContent = `${stg.emoji} ${stg.name} — คลื่น ${wave}/10 | ${lvTxt}`;
  document.getElementById('res-gold').textContent = gold+'g';
  document.getElementById('res-coins').textContent = '+'+coinsEarned;
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  const bonus=getHeroStats(h,lv);
  document.getElementById('item-drop-content').textContent = itemDropMessage;
  document.getElementById('rhb-content').innerHTML = `${h.emoji} ${h.name} Lv.${lv+1} — ATK +${bonus.atkBonus}% | ระยะ +${bonus.rangeBonus} | ทอง +${bonus.goldBonus}% | HP +${bonus.hpBonus}`;
  const btns=document.getElementById('res-btns');
  
  if(success){
    btns.innerHTML=`<button class="res-btn secondary" onclick="gotoHero()">🦸 อัพเกรด Hero</button><button class="res-btn primary" onclick="continueInfinity()">⭐ ด่านถัดไป Lv.${currentLevel+1}</button>`;
  } else {
    btns.innerHTML=`<button class="res-btn secondary" onclick="gotoHero()">🦸 อัพเกรด Hero</button><button class="res-btn primary" onclick="tryAgain()">🔄 ลองใหม่</button>`;
  }
  showScreen('result-screen');
}

function continueInfinity(){
  playSfx('click');
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