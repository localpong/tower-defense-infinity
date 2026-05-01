/* ui.js - สำหรับจัดการหน้าจอ (Screen), ปุ่มกด (DOM Updates), และ UI ต่างๆ */

// ===== SCREENS =====
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function gotoHome(){
  hideMsg(); // ปิดทุก Dialog เมื่อกลับหน้าหลัก
  renderHomeHeroes(); 
  renderHomeTowerSelect();
  document.getElementById('home-coins-val').textContent=saveData.gems;
  document.getElementById('app-version').textContent=APP_VERSION;
  document.getElementById('home-level-val').textContent=saveData.infinityLevel;
  document.getElementById('home-best-val').textContent=saveData.bestLevel;
  // ตรวจสอบไอเทมใหม่
  const invDot = document.getElementById('inv-new-dot');
  if(invDot) invDot.style.display = (saveData.inventory.length > 0 && !saveData.invSeen) ? 'block' : 'none';

  // ตรวจสอบการอัพเกรด Hero
  const heroDot = document.getElementById('hero-new-dot');
  if(heroDot) {
    const canUpgrade = HEROES.some((h, i) => {
      const lv = saveData.heroLevels[i];
      return lv < h.maxLv && saveData.gems >= h.upgradeCost[lv];
    });
    heroDot.style.display = canUpgrade ? 'block' : 'none';
  }

  // ตรวจสอบการอัพเกรด Tower ถาวร
  const towerDot = document.getElementById('tower-new-dot');
  if(towerDot) {
    const canUpgradeTw = TOWER_TYPES.some((_, i) => {
      const lv = saveData.towerLevels[i] || 0;
      const cost = (lv + 1) * 100;
      return lv < 20 && saveData.gems >= cost;
    });
    towerDot.style.display = canUpgradeTw ? 'block' : 'none';
  }
  syncVersion(false); // ตรวจสอบเงียบๆ ระหว่างสลับหน้า
  playMenuBGM(); // เล่นเพลงประกอบหน้าเมนู
  updateMuteUI();
  showScreen('home');
}
async function syncVersion(autoShow = false) {
  try {
    // ดึงไฟล์ version.json จาก GitHub Pages (เติม timestamp เพื่อป้องกัน cache ของ WebView)
    const response = await fetch('version.json?t=' + Date.now());
    if (response.ok) {
      const data = await response.json();
      if (data.version && data.version !== APP_VERSION) {
        const serverVer = data.version;
        // แสดงเลขเวอร์ชันใหม่ใน UI
        document.getElementById('app-version').textContent = serverVer;
        
        if (autoShow) {
          forceRefresh(serverVer);
        } else {
          showToast('🚀 พบเวอร์ชันใหม่: v' + serverVer, 'var(--blue)');
        }
        // อัปเดตตัวแปรในเครื่องเพื่อไม่ให้แจ้งเตือนซ้ำในเซสชันเดิม
        APP_VERSION = serverVer;
      } else {
        document.getElementById('app-version').textContent = APP_VERSION;
      }
    }
  } catch (e) { console.log("Offline mode: cannot fetch version"); }
}

function forceRefresh(newVer = null) {
  const title = newVer ? `🚀 พบเวอร์ชันใหม่ v${newVer}` : "🔄 อัปเดตเวอร์ชัน";
  const sub = newVer ? "มีการอัปเดตใหม่พร้อมใช้งาน ต้องการโหลดข้อมูลใหม่เพื่อใช้งานเวอร์ชันล่าสุดหรือไม่?" : "ต้องการโหลดข้อมูลใหม่จาก GitHub เพื่ออัปเดตเวอร์ชันล่าสุดหรือไม่?";
  showMsg(
    title,
    sub,
    "ตกลง",
    () => {
      const newUrl = window.location.origin + window.location.pathname + '?update=' + Date.now();
      window.location.replace(newUrl);
    },
    "ยกเลิก",
    hideMsg
  );
}
function toggleMute() {
  saveData.isMuted = !saveData.isMuted;
  updateBgmState(); // อัปเดตสถานะเพลง (เล่น/หยุด) ทันทีที่กด
  updateMuteUI();
  saveGame();
}

function updateMuteUI() {
  const icon = saveData.isMuted ? '🔇' : '🔊';
  const hBtn = document.getElementById('home-mute-btn');
  const gBtn = document.getElementById('game-mute-btn');
  if(hBtn) hBtn.textContent = icon;
  if(gBtn) gBtn.textContent = icon;
}
function gotoHero(){
  initAudio(); playSfx('click');
  renderHeroList();
  document.getElementById('hero-coins-val').textContent=saveData.gems;
  showScreen('hero-screen');
  selectHeroDetail(saveData.equippedHero);
}
function gotoTower(){
  initAudio(); playSfx('click');
  document.getElementById('tower-gems-val').textContent=saveData.gems;
  renderTowerScreenList();
  selectTowerForUpgrade(saveData.selectedTowers[0] || 0);
  showScreen('tower-screen');
}
function gotoStatus(){
  initAudio(); playSfx('click');
  renderStatusScreen();
  showScreen('status-screen');
}
function gotoInventory(){
  initAudio(); playSfx('click');
  saveData.invSeen = true; // ทำเครื่องหมายว่าเปิดดูแล้ว
  saveGame();
  renderInventory();
  showScreen('inventory-screen');
}
function gotoGame(remoteHeroInitialData = null){ // เพิ่มพารามิเตอร์สำหรับข้อมูล Hero ของเพื่อน
  initAudio(); playSfx('click');
  saveGame();
  hideMsg(); // เคลียร์ Dialog "รอ Host" ออกไป

  if (!isMultiplayer || isHost) {
    // เข้าสู่โหมดเต็มจอเฉพาะตอนที่เรากดเอง (Guest ทำไม่ได้เพราะติด Security)
    const doc = document.documentElement;
    try {
      if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
      else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
      else if (doc.msRequestFullscreen) doc.msRequestFullscreen();
    } catch (e) {
      console.log("Fullscreen not supported or blocked");
    }
  }

  // หากเป็น Multiplayer และเป็นเครื่อง Guest ให้ใช้เลเวลจาก Host
  if (isMultiplayer && !isHost && remoteHeroInitialData) {
    currentLevel = remoteHeroInitialData.level;
  } else {
    currentLevel = saveData.infinityLevel || 1;
  }
  stageIdx = (currentLevel - 1) % STAGES.length;
  showScreen('game-screen');
  setTimeout(() => initGame(remoteHeroInitialData), 0); // ส่งข้อมูล Hero ของเพื่อนไปยัง initGame
}

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

// Function for Android to call to handle back button
function goBackInApp() {
  if (screenHistory.length > 1) {
    screenHistory.pop(); // Remove current screen
    const prevScreenId = screenHistory[screenHistory.length - 1];
    // Call the appropriate internal goto function to re-render the previous screen
    switch (prevScreenId) {
      case 'home':
        _gotoHome();
        break;
      case 'hero-screen':
        _gotoHero();
        break;
      case 'tower-screen':
        _gotoTower();
        break;
      case 'inventory-screen':
        _gotoInventory();
        break;
      case 'game-screen':
        _gotoGame(); // Re-initialize the game
        break;
      default:
        _gotoHome(); // Fallback to home
        break;
    }
    return true; // Indicate that back navigation was handled
  }
  return false; // Indicate that back navigation was not handled
}