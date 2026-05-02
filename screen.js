/* screen.js - สำหรับจัดการการเปลี่ยนหน้าจอ (Screen Navigation) และสถานะแอประดับบนสุด */

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

// Function for Android to call to handle back button
function goBackInApp() {
  if (typeof screenHistory !== 'undefined' && screenHistory.length > 1) {
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