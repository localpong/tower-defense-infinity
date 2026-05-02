/* network.js - สำหรับจัดการ Multiplayer (PeerJS, Lobby Server) */

// ===== MULTIPLAYER VARIABLES =====
let isMultiplayer = false;
let isHost = false;
let peer = null;
let conn = null;
let remoteHero = null;

let lobbyPeer = null;
let globalPublicRooms = {};
let lobbyBroadcastInterval = null;
const LOBBY_PEER_ID = 'TDINF-GLOBAL-LOBBY-V2';

function gotoMultiplayer() {
  initAudio(); playSfx('click');
  
  // รีเซ็ตสถานะหน้าจอและปุ่มให้พร้อมใช้งาน
  document.getElementById('mp-setup-host').style.display = 'block';
  document.getElementById('mp-setup-join').style.display = 'block';
  document.getElementById('mp-status').style.display = 'none';
  document.getElementById('my-peer-id').textContent = 'กำลังโหลด...';
  document.getElementById('btn-connect-peer').disabled = false;
  document.getElementById('btn-connect-peer').textContent = 'เข้าเล่น';

  document.getElementById('mp-nickname').value = saveData.nickname || '';
  renderFriendsList();
  const pubList = document.getElementById('public-rooms-list');
  if (pubList) pubList.innerHTML = '<div style="font-size:10px; color:var(--muted); text-align:center;">คลิกปุ่มรีเฟรชเพื่อหาห้อง...</div>';

  if (lobbyBroadcastInterval) { clearInterval(lobbyBroadcastInterval); lobbyBroadcastInterval = null; }

  // ตรวจสอบว่าต้องสร้าง Peer ใหม่หรือไม่
  if (!peer || peer.destroyed) {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    peer = new Peer('TDINF-' + randomId);
    
    peer.on('open', id => { 
      document.getElementById('my-peer-id').textContent = id.replace('TDINF-', ''); 
      initLobbyServer();
      fetchPublicRooms();
    });
    
    peer.on('connection', c => {
      if (conn) { c.close(); return; } // รับได้แค่ 1 การเชื่อมต่อเท่านั้น
      conn = c; isHost = true;
      const pubCheck = document.getElementById('mp-is-public');
      if (pubCheck) pubCheck.checked = false; // ปิดโหมด Public ทันทีที่มีคนเข้า
      setupConnection();
      setTimeout(() => {
        sendNetData('HELLO', { nickname: saveData.nickname || 'Unknown Host' });
      }, 500);
      showMPWaiting();
    });

    peer.on('error', (err) => {
      console.error('Peer Error:', err.type);
      if(err.type === 'unavailable-id') {
        peer.destroy(); peer = null; setTimeout(gotoMultiplayer, 100);
      } else if (err.type === 'peer-unavailable') {
        showToast('❌ ไม่พบรหัสห้องนี้', 'var(--red)');
        document.getElementById('btn-connect-peer').disabled = false;
        document.getElementById('btn-connect-peer').textContent = 'เข้าเล่น';
      }
    });
  } else {
    // ถ้ามี Peer อยู่แล้วให้แสดงรหัสเดิม
    document.getElementById('my-peer-id').textContent = peer.id.replace('TDINF-', '');
    fetchPublicRooms();
  }

  // ประกาศห้องสาธารณะทุกๆ 8 วินาที
  lobbyBroadcastInterval = setInterval(() => {
    if (!conn) broadcastToLobby();
  }, 8000);

  showScreen('multiplayer-screen');
}
function updateNickname(val) {
  saveData.nickname = val.trim();
  saveGame();
}
function showMPWaiting() {
  document.getElementById('mp-setup-host').style.display = 'none';
  document.getElementById('mp-setup-join').style.display = 'none';
  document.getElementById('mp-status').style.display = 'block';
  document.getElementById('mp-status-text').textContent = 'เชื่อมต่อสำเร็จ! กำลังเริ่มเกม...';
}

function copyPeerId() {
  const id = document.getElementById('my-peer-id').textContent;
  navigator.clipboard.writeText(id);
  showToast('📋 คัดลอก ID แล้ว', 'var(--blue)');
}

function connectToPeer(forcedId = null) {
  let targetId = forcedId || document.getElementById('join-peer-id').value.trim();
  if (!targetId) return;
  
  // เติม Prefix ถ้ายังไม่มี
  if (!targetId.startsWith('TDINF-')) targetId = 'TDINF-' + targetId;

  document.getElementById('btn-connect-peer').disabled = true;
  document.getElementById('btn-connect-peer').textContent = 'กำลังเชื่อมต่อ...';
  conn = peer.connect(targetId);
  isHost = false;
  setupConnection();
}

function renderFriendsList() {
  const container = document.getElementById('friends-list');
  if (saveData.friends.length === 0) {
    container.innerHTML = '<div style="font-size:10px; color:var(--muted); text-align:center; padding:10px;">ยังไม่มีรายชื่อเพื่อนล่าสุด</div>';
    return;
  }
  container.innerHTML = '';
  saveData.friends.slice(0, 5).forEach(f => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px;';
    div.innerHTML = `
      <div style="font-size:12px; font-weight:700;">${f.name}</div>
      <button onclick="connectToPeer('${f.id}')" style="background:var(--blue); border:none; color:#fff; font-size:10px; padding:4px 10px; border-radius:5px; cursor:pointer;">Join</button>
    `;
    container.appendChild(div);
  });
}

function saveFriend(id, name) {
  const cleanId = id.replace('TDINF-', '');
  saveData.friends = saveData.friends.filter(f => f.id !== cleanId);
  saveData.friends.unshift({ id: cleanId, name: name });
  saveData.friends = saveData.friends.slice(0, 10); // เก็บไว้แค่ 10 คนล่าสุด
  saveGame();
}

function initLobbyServer() {
  if (lobbyPeer) return;
  lobbyPeer = new Peer(LOBBY_PEER_ID);
  lobbyPeer.on('open', () => {
    console.log("P2P Lobby Server Active");
    lobbyPeer.on('connection', (c) => {
      c.on('data', (data) => {
        if (data.action === 'REGISTER') {
          globalPublicRooms[data.id] = { name: data.name, time: Date.now() };
        } else if (data.action === 'GET_ROOMS') {
          const now = Date.now();
          for (let id in globalPublicRooms) {
            if (now - globalPublicRooms[id].time > 20000) delete globalPublicRooms[id];
          }
          c.send({ action: 'ROOM_LIST', rooms: globalPublicRooms });
        }
      });
    });
  });
  lobbyPeer.on('error', (err) => {
    if (err.type === 'unavailable-id') { lobbyPeer.destroy(); lobbyPeer = null; }
  });
}

function broadcastToLobby() {
  const isPublic = document.getElementById('mp-is-public');
  if (conn || !peer || peer.destroyed || !isPublic || !isPublic.checked) return;
  const c = peer.connect(LOBBY_PEER_ID);
  c.on('open', () => {
    c.send({ action: 'REGISTER', id: peer.id, name: saveData.nickname || 'Host Player' });
    setTimeout(() => { if (c && c.open) c.close(); }, 1000);
  });
  c.on('error', () => { initLobbyServer(); });
}

function fetchPublicRooms() {
  if (conn || !peer || peer.destroyed) return;
  const container = document.getElementById('public-rooms-list');
  if (container) container.innerHTML = '<div style="font-size:10px; color:var(--muted); text-align:center;">กำลังค้นหาห้อง...</div>';
  
  const c = peer.connect(LOBBY_PEER_ID);
  let timeout = setTimeout(() => {
    if (container) container.innerHTML = '<div style="font-size:10px; color:var(--red); text-align:center;">ไม่พบเซิร์ฟเวอร์ Lobby (คุณอาจเป็นคนแรก)</div>';
    if(c && c.open) c.close();
    initLobbyServer();
  }, 4000);

  c.on('open', () => {
    c.send({ action: 'GET_ROOMS' });
    c.on('data', (data) => {
      if (data.action === 'ROOM_LIST') {
        clearTimeout(timeout);
        renderPublicRooms(data.rooms);
        setTimeout(() => { if (c && c.open) c.close(); }, 1000);
      }
    });
  });
  c.on('error', () => {
    clearTimeout(timeout);
    if (container) container.innerHTML = '<div style="font-size:10px; color:var(--muted); text-align:center;">ยังไม่มีห้องสาธารณะ (คุณเป็นคนแรก)</div>';
    initLobbyServer();
  });
}

function renderPublicRooms(rooms) {
  const container = document.getElementById('public-rooms-list');
  const roomKeys = Object.keys(rooms).filter(id => id !== peer.id); // ซ่อนห้องตัวเอง
  if (roomKeys.length === 0) {
    container.innerHTML = '<div style="font-size:10px; color:var(--muted); text-align:center;">ยังไม่มีห้องสาธารณะที่เปิดอยู่</div>';
    return;
  }
  container.innerHTML = '';
  roomKeys.forEach(id => {
    const r = rooms[id];
    const cleanId = id.replace('TDINF-', '');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(16, 185, 129, 0.1); padding:8px 12px; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.3);';
    div.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:var(--green);">${r.name} <span style="font-size:9px; color:var(--muted);">(${cleanId})</span></div>
      <button onclick="connectToPeer('${cleanId}')" style="background:var(--green); border:none; color:#fff; font-size:10px; padding:4px 10px; border-radius:5px; cursor:pointer;">Join</button>
    `;
    container.appendChild(div);
  });
}

function setupConnection() {
  conn.on('open', () => {
    isMultiplayer = true;
    // Guest ส่ง Nickname ให้ Host ทันที
    if (!isHost) {
      sendNetData('HELLO', { nickname: saveData.nickname || 'Guest Player' });
    }
    if (isHost) {
      // Host ส่งข้อมูล Level, Paths และ Hero ของตนเอง
      setTimeout(() => {
        currentLevel = saveData.infinityLevel;
        let numPaths = currentLevel >= 20 ? 3 : currentLevel >= 10 ? 2 : 1;
        paths = [];
        for(let i=0; i<numPaths; i++) paths.push(generateRandomPath(COLS, ROWS));
        saveData.currentPath = paths;
        sendNetData('START_GAME', { level: currentLevel, paths: paths, hero: saveData.equippedHero });
        gotoGame();
      }, 1500);
    }
  });

  conn.on('data', data => { handleNetData(data.type, data.payload); });
  conn.on('close', () => {
    isMultiplayer = false;
    conn = null;
    if (waveRunning || hp > 0) {
      showMsg('🌐 หลุดการเชื่อมต่อ', 'เพื่อนของคุณออกจากเกมแล้ว', 'กลับหน้าแรก', cancelMultiplayer);
    } else {
      cancelMultiplayer();
    }
  });
}

function sendNetData(type, payload) {
  if (conn && conn.open) conn.send({ type, payload });
}

function handleNetData(type, p) {
  switch(type) {
    case 'HELLO':
      // บันทึกเพื่อนลงในรายการ Recent
      saveFriend(conn.peer, p.nickname);
      showToast(`🤝 เชื่อมต่อกับ ${p.nickname}`, 'var(--blue)');
      break;
    case 'BUILD':
      const tdBuild = TOWER_TYPES[p.t];
      const twB = tdBuild.w || 1, thB = tdBuild.h || 1;
      towers.push({c:p.c, r:p.r, x:p.c*CS+(twB*CS)/2, y:p.r*CS+(thB*CS)/2, type:p.t, level:0, cooldown:0, recoilAmt:0});
      playSfx('build');
      break;
    case 'UPGRADE':
      const tw = towers.find(t => t.c === p.c && t.r === p.r);
      if (tw) { 
        tw.level++; 
        playSfx('build'); 
        addPart(tw.x, tw.y, '⬆', 26); 
        if (selectedTower === tw) openUpgrade(tw);
      }
      break;
    case 'SELL':
      towers = towers.filter(t => !(t.c === p.c && t.r === p.r));
      if (selectedTower && selectedTower.c === p.c && selectedTower.r === p.r) {
        if (typeof closeUpgrade === 'function') closeUpgrade();
      }
      playSfx('death');
      break;
    case 'START_WAVE':
      wave = p.wave; waveRunning = true; updateHUD();
      document.getElementById('wave-btn').disabled = true;
      break;
    case 'REQUEST_WAVE':
      if (isHost) startWave();
      break;
    case 'SPAWN_ENEMY':
      spawnEnemy(p.hpM, p.boss, p.spd, p.pIdx, p.type, p.id);
      break;
    case 'SPAWN_MINION':
      spawnMinion(p.hpM, p.pIdx, p.prog, p.id);
      break;
    case 'START_GAME':
      hideMsg();
      currentLevel = p.level; paths = p.paths; saveData.currentPath = p.paths;
      gotoGame(p);
      break;
    case 'REQUEST_TRY_AGAIN':
      if (isHost) {
        // Host receives request from guest to try again
        currentLevel = saveData.infinityLevel; // Use current level
        
        // Ensure paths are generated for the host if they are null or don't match the current level's path count
        let numPaths = currentLevel >= 20 ? 3 : currentLevel >= 10 ? 2 : 1;
        if (!saveData.currentPath || saveData.currentPath.length !== numPaths) {
          saveData.currentPath = [];
          for(let i = 0; i < numPaths; i++) {
            saveData.currentPath.push(generateRandomPath(COLS, ROWS));
          }
          saveGame(); // Save the newly generated paths
        }
        
        // Send START_GAME to guest
        sendNetData('START_GAME', { 
          level: currentLevel, 
          paths: saveData.currentPath, 
          hero: saveData.equippedHero 
        });
        showScreen('game-screen');
        setTimeout(initGame, 0);
      }
      break;
    case 'REQUEST_USE_SKILL':
      if (isHost) {
        const h = HEROES[p.heroId];
        if (mana >= p.cost) {
          mana -= p.cost;
          if(heroEntity) heroEntity.combatTimer = 5.0;
          executeHeroSkillEffect(p.heroId);
          playSfx('skill');
          // No explicit broadcast needed for skill effect, as SYNC_STATS will update mana
          // and skill effects are visual/enemy-related, which are already synced or local to host
        }
      }
      break;
    case 'REQUEST_BUILD':
      if (isHost) {
        const td = TOWER_TYPES[p.t];
        const tw = td.w || 1, th = td.h || 1;
        if (gold >= td.cost) {
          gold -= td.cost;
          towers.push({c:p.c, r:p.r, x:p.c*CS+(tw*CS)/2, y:p.r*CS+(th*CS)/2, type:p.t, level:0, cooldown:0, recoilAmt:0});
          sendNetData('BUILD', { c:p.c, r:p.r, t:p.t }); // Host broadcasts the actual build
        }
      }
      break;
    case 'REQUEST_UPGRADE':
      if (isHost) {
        const tw = towers.find(t => t.c === p.c && t.r === p.r);
        if (tw && tw.level < 3 && gold >= p.cost) {
          gold -= p.cost; tw.level++;
          sendNetData('UPGRADE', { c:p.c, r:p.r }); // Host broadcasts the actual upgrade
          if (selectedTower === tw && typeof openUpgrade === 'function') openUpgrade(tw);
        }
      }
      break;
    case 'REQUEST_SELL':
      if (isHost) {
        const t = towers.find(t => t.c === p.c && t.r === p.r);
        if (t) {
          gold += p.sellAmount;
          towers = towers.filter(x => x !== t);
          sendNetData('SELL', { c:p.c, r:p.r }); // Host broadcasts the actual sell
          if (selectedTower === t && typeof closeUpgrade === 'function') closeUpgrade();
        }
      }
      break;
    case 'ENEMY_HIT':
      const target = enemies.find(e => e.id === p.id);
      if (target) target.hp -= p.dmg;
      break;
    case 'SYNC_ENEMIES':
      if (p && Array.isArray(p)) {
        // สร้าง Map เพื่อลดเวลาค้นหาจาก O(N^2) ให้เหลือ O(N) ช่วยลดอาการกระตุกเมื่อศัตรูเยอะ
        const enemyMap = new Map(enemies.map(e => [e.id, e]));
        p.forEach(data => {
          const e = enemyMap.get(data.id);
          if (e) { 
            // เคลื่อนที่ศัตรูแบบ Smooth ถ้าตำแหน่งไม่ห่างกันเกินไป
            if (Math.abs(e.progress - data.p) < 0.5) {
              e.progress = e.progress * 0.7 + data.p * 0.3;
            } else {
              e.progress = data.p; // Hard snap ถ้าห่างกันมากเกินไป (กันการหลุดด่าน)
            }
            e.hp = data.hp; 
          }
        });
      }
      break;
    case 'SYNC_HERO':
      if (!remoteHero) {
        const hData = typeof HEROES !== 'undefined' ? HEROES[p.heroId] : null;
        if (!hData) return;
        remoteHero = { x: p.c * CS + CS / 2, y: p.r * CS + CS / 2, emoji: hData.emoji, heroId: p.heroId, color: hData.color };
      }
      // กำหนดเป้าหมายเพื่อให้ด่าน Guest ใช้การทำ Interpolation ในจังหวะวาดภาพ
      remoteHero.targetX = p.c * CS + CS / 2;
      remoteHero.targetY = p.r * CS + CS / 2;
      remoteHero.hp = p.hp;
      break;
    case 'SYNC_STATS':
      gold = p.gold; hp = p.hp; mana = p.mana; wave = p.wave;
      waveRunning = p.waveRunning;
      speedMode = p.speedMode; speedMult = p.speedMult;
      isPaused = p.isPaused; waveCountdown = p.waveCountdown;
      autoUpgradeEnabled = p.autoUpgradeEnabled;
      updateHUD(); updateSpeedUI();
      updateAutoUpgradeUI();
      if (!waveRunning) {
        const btn = document.getElementById('wave-btn');
        btn.disabled = false;
        if (waveCountdown > 0) {
          btn.innerHTML = `<span style="font-size:16px;">${Math.ceil(waveCountdown)}s</span><br><span style="font-size:8px; line-height:0.8;">SKIP</span>`;
        } else {
          btn.innerHTML = '⚔️';
        }
      }
      break;
    case 'STAGE_CLEAR':
      won = true;
      gotoResult(true, p.drops);
      break;
    case 'STAGE_FAILED':
      gameOver = true;
      gotoResult(false);
      break;
  }
}

function cancelMultiplayer() {
  if (conn) {
    conn.close();
    conn = null;
  }
  if (peer) {
    peer.destroy(); // ปิดการทำงาน Peer ทั้งหมด เพื่อหยุดการรับสาย/เชื่อมต่อ
    peer = null;
  }
  if (lobbyPeer) { lobbyPeer.destroy(); lobbyPeer = null; }
  if (lobbyBroadcastInterval) { clearInterval(lobbyBroadcastInterval); lobbyBroadcastInterval = null; }
  isMultiplayer = false;
  isHost = false;
  remoteHero = null;
  gotoHome();
}