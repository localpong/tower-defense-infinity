/* engine.js - สำหรับ Game Loop, การอัปเดตตำแหน่ง, และ Game Logic ต่างๆ */

// ===== MAIN LOOP =====
function loop(ts){
  animFrame=requestAnimationFrame(loop);
  const rawDt=Math.min((ts-lastTime)/1000,.1);
  lastTime=ts;
  const dt=rawDt*speedMult;
  if(!gameOver&&!won){
    bgAnimTime += dt;
    updateHeroHud();

    if (heroEntity && heroEntity.dead) {
      heroEntity.respawnTimer -= dt;
      if (heroEntity.respawnTimer <= 0) {
        heroEntity.dead = false;
        heroEntity.hp = heroEntity.maxHp;
        heroEntity.cooldown = 0; // รีเซ็ตคูลดาวน์เมื่อเกิดใหม่
      }
    }

    waveTimer+=dt;
    updateEnemies(dt); updateBullets(dt); updateEnemyBullets(dt); updateHeroBullets(dt); updateTowers(dt); updateParts(dt);
    updateHero(dt);
    updateWeather(dt);
    updatePickups(dt);

    // ===== MULTIPLAYER SYNC (HOST) =====
    if (isMultiplayer && isHost) {
      // ซิงค์ข้อมูลหลักและตำแหน่งทุก 0.1 วินาที (10Hz) เพื่อความลื่นไหล
      syncTimer += rawDt;
      if (syncTimer >= 0.1) {
        sendNetData('SYNC_STATS', { gold, hp, mana, wave, speedMode, speedMult, waveRunning, autoWaveEnabled, autoUpgradeEnabled });
        const syncData = enemies.map(e => ({ id: e.id, p: e.progress, hp: e.hp }));
        sendNetData('SYNC_ENEMIES', syncData);
        syncTimer = 0;
      }

      // Host ควบคุมการเกิดของศัตรู
      while(waveQueue.length > 0 && waveTimer >= waveQueue[0].delay){
        const q = waveQueue.shift();
        const pathIdx = Math.floor(Math.random() * paths.length);
        const type = Math.floor(Math.random() * 4);
        const newE = spawnEnemy(q.hpMult, q.isBoss, q.spd, pathIdx, type);
        sendNetData('SPAWN_ENEMY', { id: newE.id, hpM: q.hpMult, boss: q.isBoss, spd: q.spd, pIdx: pathIdx, type: type });
      }
    }

    // Single Player Logic
    if (!isMultiplayer) {
      while(waveQueue.length>0 && waveTimer>=waveQueue[0].delay){
        const q=waveQueue.shift(); spawnEnemy(q.hpMult,q.isBoss,q.spd);
      }
    }

    if(waveRunning && enemies.length===0 && (isMultiplayer ? (isHost && waveQueue.length===0) : waveQueue.length===0)){
      waveRunning=false;
      if(wave>=10){ won=true; gotoResult(true); return; }
      // Auto start next wave if enabled
      if(autoWaveEnabled) {
        startWave();
      }
      document.getElementById('wave-btn').disabled=false;
    }
    if(autoUpgradeEnabled) checkAutoUpgrades();
  }
  render();
}

// ===== HERO ENTITY LOGIC =====
function updateHero(dt) {
  if (!heroEntity || heroEntity.dead || gameOver || won) return;

  // HP Regeneration Logic
  if (heroEntity.combatTimer > 0) {
    heroEntity.combatTimer -= dt;
  } else if (heroEntity.hp < heroEntity.maxHp) {
    const regenRate = heroEntity.maxHp * 0.01; // ฟื้นฟู 1% ของเลือดสูงสุดต่อวินาที
    heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + regenRate * dt);
  }

  // Movement: Move towards target location
  const dx = heroEntity.targetX - heroEntity.x;
  const dy = heroEntity.targetY - heroEntity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 5) {
    heroEntity.x += (dx / dist) * heroEntity.speed * dt;
    heroEntity.y += (dy / dist) * heroEntity.speed * dt;

    // ส่งตำแหน่งให้เพื่อนในโหมด Multiplayer
    if (isMultiplayer) {
      sendNetData('SYNC_HERO', { 
        c: heroEntity.x / CS, 
        r: heroEntity.y / CS, 
        heroId: heroEntity.heroId, 
        hp: heroEntity.hp 
      });
    }
  }

  // Combat: Auto-attack nearest enemy in range
  heroEntity.cooldown -= dt;
  if (heroEntity.cooldown <= 0) {
    let target = null, minDist = heroEntity.range;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = Math.sqrt((e.x - heroEntity.x)**2 + (e.y - heroEntity.y)**2);
      if (d < minDist) { target = e; minDist = d; }
    });
    if (target) {
      const hIdx = saveData.equippedHero;
      const dmg = heroEntity.baseAtk * heroEntity.atkMult;

      if (hIdx === 1) { // Warrior (นักรบ) - โจมตีประชิด
        dealDmg(target, dmg, false, true);
        addPart(target.x, target.y, '⚔️', 24);
      } else { // สายยิง (Mage, Archer, Ice)
        const projEmojis = ['✨', '', '🏹', '❄️'];
        heroBullets.push({
          x: heroEntity.x, y: heroEntity.y,
          tx: target, dmg: dmg, spd: 500,
          heroId: hIdx, emoji: projEmojis[hIdx],
          angle: 0
        });
      }
      
      // เอฟเฟกต์ Cast ตอนปล่อยพลัง
      const castEmojis = ['🔮', '💨', '✨', '🧊'];
      const soundTypes = [3, 0, 0, 2]; 
      
      addPart(heroEntity.x, heroEntity.y, castEmojis[hIdx], 20); // เอฟเฟกต์ตอนปล่อยพลังจาก Hero
      
      heroEntity.cooldown = 1.0; // โจมตีทุก 1 วินาที
      playSfx('shoot', soundTypes[hIdx]);
      heroEntity.combatTimer = 5.0; // รีเซ็ตสถานะการต่อสู้เพื่อหยุดการรีเจนเลือดชั่วคราว
    }
  }

  // Collection: Pick up gold and items nearby
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    const d = Math.sqrt((p.x - heroEntity.x)**2 + (p.y - heroEntity.y)**2);
    if (d < 30) {
      if (p.type === 'gold') { gold += p.value; addPart(p.x, p.y, `+${p.value}g`, 18); }
      else { mana = maxMana; addPart(p.x, p.y, '🧪 MAX', 22); }
      playSfx('skill'); pickups.splice(i, 1); updateHUD();
    }
  }
}

// ===== PATH GENERATOR =====
function generateRandomPath(cols, rows) {
  let path;
  let attempts = 0;
  do {
    // เริ่มต้นที่แถว 0 สุ่มคอลัมน์ให้กว้างขึ้น (1 ถึง cols-2)
    let startC = Math.floor(Math.random() * (cols - 2)) + 1;
    path = [[startC, 0]];

    while (path[path.length - 1][1] < rows - 1) {
      let curr = path[path.length - 1];
      let neighbors = [
        [curr[0], curr[1] + 1], // ลง (Priority)
        [curr[0] + 1, curr[1]], // ขวา
        [curr[0] - 1, curr[1]]  // ซ้าย
      ];

      // กรองเฉพาะทางที่เดินได้: อยู่ในจอ, ไม่เดินย้อนกลับ, และไม่ชิดจุดอื่นในเส้นทางเกินไป
      let valid = neighbors.filter(m => {
        if (m[0] < 1 || m[0] >= cols - 1 || m[1] < 0 || m[1] >= rows) return false;
        if (path.some(p => p[0] === m[0] && p[1] === m[1])) return false;
        
        // ตรวจสอบว่าจุดถัดไปต้องไม่ติดกับจุดอื่นในเส้นทาง ยกเว้นจุดปัจจุบัน (Head)
        // เพื่อให้เส้นทาง "คดเคี้ยว" แบบมีช่องว่าง ไม่เดินเบียดกัน
        let adjCount = 0;
        for (let p of path) {
          if (Math.abs(p[0] - m[0]) + Math.abs(p[1] - m[1]) === 1) adjCount++;
        }
        return adjCount === 1;
      });

      if (valid.length === 0) break; // ทางตัน สุ่มใหม่

      // ปรับน้ำหนักการเดินลงให้เหลือ 35% เพื่อบังคับให้เกิดการเลี้ยวซ้าย-ขวามากขึ้น
      let next;
      let moveDown = valid.find(m => m[1] > curr[1]);
      let moveSide = valid.filter(m => m[0] !== curr[0]);

      if (moveDown && Math.random() < 0.35) {
        next = moveDown;
      } else if (moveSide.length > 0) {
        next = moveSide[Math.floor(Math.random() * moveSide.length)];
      } else {
        next = valid[Math.floor(Math.random() * valid.length)];
      }
      path.push(next);
    }
    attempts++;
    // เพิ่มความยาวขั้นต่ำเป็น 22 เพื่อให้การันตีความคดเคี้ยว
  } while ((path[path.length - 1][1] < rows - 1 || path.length < 22) && attempts < 200);
  return path;
}

// ===== PATH =====
function isPath(c,r){ return paths.some(path => path.some(p=>p[0]===c && p[1]===r)); }
function hasTower(c,r){ return towers.some(t=>t.c===c && t.r===r); }

// ===== GAME STATE TRACKER =====
let initialGold = 150; // Slightly reduced starting gold

// ===== GAME INIT =====
function initGame(remoteHeroInitialData = null){ // รับข้อมูล Hero ของเพื่อน
  // Reset state
  gold=initialGold; wave=0; waveRunning=false; gameOver=false; won=false;
  towers=[]; enemies=[]; bullets=[]; partList=[];
  selectedType=null; selectedTower=null;
  weatherParticles=[];
  speedMult=1; speedMode=0;
  autoWaveEnabled=false;
  autoUpgradeEnabled=false;
  pickups=[];
  enemyBullets=[];
  heroBullets=[];
  waveQueue=[]; waveTimer=0;
  heroShieldCount=0;

  // จัดการระบบหลายเส้นทางตามเลเวล
  let numPaths = currentLevel >= 20 ? 3 : currentLevel >= 10 ? 2 : 1;

  // ตรวจสอบความถูกต้องของข้อมูลเส้นทางเดิม (ถ้าไม่ใช่โหมด Multiplayer ให้สุ่มใหม่)
  if (!isMultiplayer && (!saveData.currentPath || !Array.isArray(saveData.currentPath[0]) || saveData.currentPath.length !== numPaths)) {
    saveData.currentPath = [];
    for(let i = 0; i < numPaths; i++) {
      saveData.currentPath.push(generateRandomPath(COLS, ROWS));
    }
    saveGame();
  }
  paths = saveData.currentPath;

  // Hero bonuses and mana setup
  const h=HEROES[saveData.equippedHero];
  const lv=saveData.heroLevels[saveData.equippedHero];
  const stats=getHeroStats(h,lv);
  hp=saveData.heroMaxHps[saveData.equippedHero]+stats.hpBonus; // HP upgrade still available
  maxMana=100; // Fixed max mana
  mana=100; // Start with full mana
  
  if (isMultiplayer && !isHost && remoteHeroInitialData) {
    const h = HEROES[remoteHeroInitialData.hero];
    const initialRemoteX = remoteHeroInitialData.paths[0][0][0] * CS + CS / 2;
    const initialRemoteY = remoteHeroInitialData.paths[0][0][1] * CS + CS / 2;
    remoteHero = { x: initialRemoteX, y: initialRemoteY, emoji: h.emoji, heroId: h.id, hp: 100, maxHp: 100, color: h.color };
  }

  heroEntity = {
    x: paths[0][0][0] * CS + CS / 2,
    y: paths[0][0][1] * CS + CS / 2,
    targetX: paths[0][0][0] * CS + CS / 2,
    targetY: paths[0][0][1] * CS + CS / 2,
    emoji: h.emoji,
    speed: 160,
    range: 100 + stats.rangeBonus,
    cooldown: 0,
    baseAtk: 25,
    atkMult: 1 + (stats.atkBonus / 100),
    color: h.color || 'var(--purple)',
    hp: 100 + (stats.hpBonus * 10),
    maxHp: 100 + (stats.hpBonus * 10),
    dead: false,
    respawnTimer: 0,
    combatTimer: 0,
    selected: false,
    heroId: h.id
  };

  // Canvas — screen must be visible before this
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  // Resize: read real width now that screen is visible
  const area = document.getElementById('game-area');
  let w = area.clientWidth;
  if (!w || w < 100) w = window.innerWidth; // Fallback หาก clientWidth ยังเป็น 0
  CS = Math.floor(w / COLS);
  canvas.width  = w;
  canvas.height = ROWS * CS;

  updateHeroHud();
  updateHUD();
  updateSpeedUI();
  updateAutoWaveUI();
  updateAutoUpgradeUI();
  document.getElementById('wave-btn').disabled=false;
  renderGameToolbar();
  closeUpgrade(); hideMsg();

  if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }
  playStageBGM();
  lastTime=0;
  animFrame=requestAnimationFrame(loop);
}

// ===== HERO SKILL =====
function getHeroStats(h,lv){
  return {
    atkBonus:   h.baseStats.atkBonus   + h.perLv.atkBonus*lv,
    rangeBonus: h.baseStats.rangeBonus + h.perLv.rangeBonus*lv,
    goldBonus:  h.baseStats.goldBonus  + h.perLv.goldBonus*lv,
    hpBonus:    h.baseStats.hpBonus    + h.perLv.hpBonus*lv,
  };
}

function useHeroSkill(){
  if(enemies.length===0)return;
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  const cost = h.skill.manaCost;
  if(mana < cost) return;

  if (isMultiplayer && !isHost) {
    sendNetData('REQUEST_USE_SKILL', { heroId: h.id, cost: cost });
    document.getElementById('hh-use').disabled = true; // Disable button temporarily
    // Guest does not update mana or HUD locally, waits for host's SYNC_STATS
    return;
  }

  // Host (or single player) executes skill
  mana -= cost; // Mana is reduced locally on host
  if(heroEntity) heroEntity.combatTimer = 5.0; // การใช้สกิลนับเป็นการเข้าสู่สถานะต่อสู้
  if(typeof executeHeroSkillEffect === 'function') executeHeroSkillEffect(h.id); // Execute skill effect
  playSfx('skill');
  updateHeroHud();
}

// ===== HERO BULLETS LOGIC =====
function updateHeroBullets(dt) {
  for (let i = heroBullets.length - 1; i >= 0; i--) {
    const b = heroBullets[i];
    if (b.tx.dead) { heroBullets.splice(i, 1); continue; }
    
    const dx = b.tx.x - b.x;
    const dy = b.tx.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 10) {
      dealDmg(b.tx, b.dmg, false, true);
      if (b.heroId === 3) b.tx.slowTimer = 2; // จอมน้ำแข็งยิงแล้วสโลว์ศัตรู
      heroBullets.splice(i, 1);
      const hitEmojis = ['✨', '', '💥', '❄️'];
      if (hitEmojis[b.heroId]) addPart(b.tx.x, b.tx.y, hitEmojis[b.heroId], 24);
    } else {
      b.x += (dx / dist) * b.spd * dt;
      b.y += (dy / dist) * b.spd * dt;
      b.angle = Math.atan2(dy, dx);
    }
  }
}

// ===== ENEMY BULLETS LOGIC =====
function updateEnemyBullets(dt) {
  if (!heroEntity) { enemyBullets = []; return; }
  
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    // ถ้า Hero ตาย ลบกระสุนทั้งหมดทิ้งเพื่อลดภาระเครื่องและป้องกันบั๊ก
    if (heroEntity.dead) { enemyBullets.splice(i, 1); continue; }
    
    const dx = (heroEntity.x || 0) - b.x;
    const dy = (heroEntity.y || 0) - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 12) {
      heroEntity.hp = Math.max(0, heroEntity.hp - 8); // ดาเมจจากกระสุน
      heroEntity.combatTimer = 5.0; // รีเซ็ตเวลาการต่อสู้เมื่อโดนยิง
      if (heroEntity.hp <= 0) {
        heroEntity.dead = true;
        heroEntity.respawnTimer = 10;
        addPart(heroEntity.x, heroEntity.y, '💀', 30);
      }
      enemyBullets.splice(i, 1);
      playSfx('hit');
      shakeAmt = 5;
    } else {
      b.x += (dx / dist) * b.spd * dt;
      b.y += (dy / dist) * b.spd * dt;
    }
  }
}

// ===== PICKUP SYSTEM =====
function updatePickups(dt) {
  for(let i=pickups.length-1; i>=0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.offsetY = Math.sin(Date.now() / 200) * 5; // อนิเมชั่นลอยขึ้นลง
    
    // Auto-collect gold when it expires
    if(p.life <= 0) {
      if(p.type === 'gold') {
        gold += p.value;
        updateHUD();
        addPart(p.x, p.y, `+${p.value}g`, 16);
      }
      pickups.splice(i, 1);
    }
  }
}

// ===== WEATHER SYSTEM =====
function updateWeather(dt){
  const s = STAGES[stageIdx % STAGES.length];
  if(weatherParticles.length < 40) {
    weatherParticles.push({
      x: Math.random() * canvas.width, y: -20,
      vx: s.weather === 'rain' ? 2 : (Math.random() - 0.5) * 50,
      vy: s.weather === 'rain' ? 400 : s.weather === 'snow' ? 50 : 120,
      size: s.weather === 'rain' ? 2 : 4 + Math.random() * 4,
      life: 5
    });
  }
  for(let i=weatherParticles.length-1; i>=0; i--) {
    const p = weatherParticles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(p.y > canvas.height) { weatherParticles.splice(i, 1); }
  }
}

// ===== WAVES =====
function startWave(){
  initAudio(); playSfx('wave');
  if(waveRunning||wave>=10)return;
  
  // ถ้าเป็น Multiplayer และเป็น Guest ให้ส่งคำขอไปหา Host
  if (isMultiplayer && !isHost) {
    sendNetData('REQUEST_WAVE', {});
    return;
  }

  wave++; updateHUD();
  document.getElementById('wave-btn').disabled=true;
  const lvScale = currentLevel-1;
  const count = WAVE_COUNTS[wave-1] + Math.floor(lvScale*1.8); // More enemies at higher levels
  const hpM   = WAVE_HP[wave-1] * (1 + lvScale*0.3); // More HP at higher levels
  const spdM  = 1 + lvScale*0.05;
  waveQueue=[]; waveTimer=0;
  for(let i=0;i<count;i++){
    const isBoss=(i===count-1)&&(wave===5||wave===10);
    waveQueue.push({delay:i*0.8, isBoss, hpMult:hpM, spd:spdM});
  }
  waveRunning=true;
  
  if (isMultiplayer && isHost) {
    sendNetData('START_WAVE', { wave, speedMode, speedMult });
  }
}

let enemyIdCounter = 0;
function spawnEnemy(hpMult,isBoss,spdMult=1, forcedPathIdx=null, forcedType=null, forcedId=null){
  const lvScale=currentLevel-1;
  const baseHP = isBoss ? 400*(1+lvScale*0.3) : 60;

  // ป้องกัน Error หาก Paths ยังไม่ถูกซิงค์
  if (!paths || !paths[0]) {
    if (isMultiplayer && !isHost) return null;
    paths = saveData.currentPath || [generateRandomPath(COLS, ROWS)];
  }

  // Enemy Types Logic
  const type = forcedType !== null ? forcedType : Math.floor(Math.random()*4);
  let typeHpM = 1, typeSpdM = 1, typeGoldM = 1;
  
  if(type === 1) { typeHpM = 1.8; typeSpdM = 0.6; } // Tanky
  if(type === 2) { typeHpM = 0.6; typeSpdM = 1.6; } // Fast
  if(type === 3) { typeHpM = 0.8; typeSpdM = 0.9; } // Ranged

  // สุ่มเลือกเส้นทางให้ศัตรูตัวนี้
  const pIdx = forcedPathIdx !== null ? forcedPathIdx : Math.floor(Math.random() * paths.length);
  const hp2 = Math.round(baseHP * hpMult * typeHpM);
  const e = {
    id: forcedId !== null ? forcedId : enemyIdCounter++,
    x: paths[pIdx][0][0]*CS+CS/2, y: paths[pIdx][0][1]*CS+CS/2,
    hp:hp2, maxHp:hp2,
    speed: (isBoss?0.7:(1.2+(wave*0.07)) * typeSpdM) * spdMult,
    progress:0, dead:false, isBoss, slowTimer:0, walkAnimState:0, walkAnimTimer:0, pathIdx: pIdx,
    reward: isBoss ? Math.round(50*(1+lvScale*0.2)) : Math.round(8*(1+lvScale*0.1) * typeHpM),
    type: type,
    shootTimer: type === 3 ? 1.5 : 0,
    shootRange: type === 3 ? 160 : 0,
    summonTimer: isBoss ? 5.0 : 0
  };
  enemies.push(e);
  return e;
}

function spawnMinion(hpMult, pIdx, progress, forcedId = null) {
  const lvScale = currentLevel - 1;
  const baseHP = 50; // สมุนจะเลือดน้อยกว่าปกติเล็กน้อย
  const type = Math.floor(Math.random() * 3); // สมุนจะไม่เป็นสายยิงเพื่อไม่ให้รกเกินไป
  const hp2 = Math.round(baseHP * hpMult);
  const pos = getPathPos(progress, pIdx);
  if (!pos) return;

  const e = {
    id: forcedId !== null ? forcedId : enemyIdCounter++,
    x: pos.x, y: pos.y,
    hp: hp2, maxHp: hp2,
    speed: (1.2 + (wave * 0.07)),
    progress: progress, dead: false, isBoss: false, slowTimer: 0, 
    walkAnimState: 0, walkAnimTimer: 0, pathIdx: pIdx,
    reward: Math.round(5 * (1 + lvScale * 0.1)),
    type: type,
    shootTimer: 0,
    shootRange: 0
  };
  enemies.push(e);
  return e;
}

function getPathPos(progress, pIdx){
  const path = paths[pIdx];
  const seg=Math.floor(progress), frac=progress-seg;
  if(seg>=path.length-1)return null;
  const[c1,r1]=path[seg],[c2,r2]=path[seg+1];
  return{x:(c1+(c2-c1)*frac)*CS+CS/2, y:(r1+(r2-r1)*frac)*CS+CS/2};
}

function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(e.dead){enemies.splice(i,1);continue;}
    e.slowTimer=Math.max(0,(e.slowTimer||0)-dt);
    if (!e.isBoss) {
      e.walkAnimTimer += dt;
      if (e.walkAnimTimer >= 0.2) { // Toggle every 0.2 seconds
        e.walkAnimState = 1 - e.walkAnimState; e.walkAnimTimer = 0; }
    }

    // Boss Summoning Logic
    if (e.isBoss && !e.dead && (!isMultiplayer || isHost)) {
      e.summonTimer -= dt;
      if (e.summonTimer <= 0) {
        const lvScale = currentLevel - 1;
        const hpM = WAVE_HP[Math.min(wave - 1, 9)] * (1 + lvScale * 0.3);
        for(let j = 0; j < 2; j++) {
          const m = spawnMinion(hpM, e.pathIdx, e.progress);
          if (m && isMultiplayer && isHost) {
            sendNetData('SPAWN_MINION', { id: m.id, hpM, pIdx: e.pathIdx, prog: e.progress });
          }
        }
        e.summonTimer = 8.0; // คูลดาวน์สกิล 8 วินาที
        addPart(e.x, e.y, '🌀', 30);
      }
    }

    // Ranged Enemy Shooting Logic
    let isShooting = false;
    if (e.shootRange > 0 && heroEntity && !heroEntity.dead) {
      const distH = Math.sqrt((e.x - heroEntity.x)**2 + (e.y - heroEntity.y)**2);
      if (distH <= e.shootRange) {
        isShooting = true;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          enemyBullets.push({ x: e.x, y: e.y, spd: 220, color: '#ff4444' });
          e.shootTimer = 2.0; // Cooldown 2 วินาที
        }
      }
    }

    if (!isShooting) {
      e.progress += e.speed*(e.slowTimer>0?.4:1)*dt;
    }

    // Damage Hero if close
    if (heroEntity && !heroEntity.dead) {
      const distH = Math.sqrt((e.x - heroEntity.x)**2 + (e.y - heroEntity.y)**2);
      if (distH < 25) {
        heroEntity.hp = Math.max(0, heroEntity.hp - (e.isBoss ? 20 : 5) * dt);
        heroEntity.combatTimer = 5.0; // รีเซ็ตเวลาการต่อสู้เมื่อโดนศัตรูประชิดตัว
        if (heroEntity.hp <= 0) {
          heroEntity.dead = true;
          heroEntity.respawnTimer = 10; // 10s to respawn
          addPart(heroEntity.x, heroEntity.y, '💀', 30);
          playSfx('death');
        }
      }
    }

    const pos=getPathPos(e.progress, e.pathIdx);
    if(!pos){
      if(heroShieldCount>0){heroShieldCount--;addPart(canvas.width/2,canvas.height/2,'🛡️',30);}
      else{hp-=e.isBoss?5:1; updateHUD(); addPart(canvas.width/2,canvas.height/2,'💔',36); shakeAmt=10;}
      e.dead=true;
      if(hp<=0){gameOver=true; gotoResult(false); return;}
      continue;
    }
    e.x=pos.x; e.y=pos.y;
  }
}

function updateTowers(dt){
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  const stats=getHeroStats(h,lv);
  towers.forEach(t=>{
    t.recoilAmt = Math.max(0, (t.recoilAmt || 0) - dt * 20); // Decay recoil
    t.cooldown=(t.cooldown||0)-dt;
    if(t.cooldown>0)return;
    const td=TOWER_TYPES[t.type], lvM=UPGRADE_MULT[t.level];
    const rate=td.rate*lvM;
    const range=td.range*Math.sqrt(lvM)+(stats.rangeBonus||0);
    
    // Equipment Bonus (25% per Tier)
    const eq = saveData.equippedWeapons[t.type];
    const eqMult = eq ? (1 + (eq.tier * 0.25)) : 1;
    const permLv = saveData.towerLevels[t.type] || 0;
    const permMult = 1 + (permLv * 0.1);
    const dmg = td.dmg * lvM * permMult * (1 + (stats.atkBonus||0)/100) * eqMult;

    let target=null, minP=-1;
    enemies.forEach(e=>{
      if(e.dead)return;
      const dx=e.x-t.x, dy=e.y-t.y;
      if(Math.sqrt(dx*dx+dy*dy)<=range && e.progress>minP){target=e;minP=e.progress;}
    });
    if(!target)return;
    t.cooldown=1/rate;
    t.aimAngle=Math.atan2(target.y-t.y,target.x-t.x);
    if(td.splashR>0){
      enemies.forEach(e=>{if(e.dead)return;const dx=e.x-target.x,dy=e.y-target.y;if(Math.sqrt(dx*dx+dy*dy)<=td.splashR)dealDmg(e,dmg);});
      addPart(target.x,target.y,'💥',22);
    } else {
      bullets.push({x:t.x,y:t.y,tx:target,dmg,type:t.type,slow:td.slow,spd:300});
    }
    playSfx('shoot', t.type);
    t.recoilAmt = 5; // Apply recoil when firing
  });
}

function dealDmg(e,dmg,isSkill=false,isHero=false){
  const h=HEROES[saveData.equippedHero], lv=saveData.heroLevels[saveData.equippedHero];
  const stats=getHeroStats(h,lv);
  
  // ได้รับมานาเล็กน้อยเมื่อโจมตีโดน (เฉพาะการโจมตีจากป้อม ไม่รวมสกิล)
  // Mana gain from hits removed as per request

  // Crit System: Hero has higher chance (15%+) and higher multiplier (3x)
  const critChance = isHero ? (0.15 + lv * 0.02) : (0.05 + lv * 0.01);
  const isCrit = Math.random() < critChance;
  const critMult = isHero ? 3 : 2;
  const finalDmg = isCrit ? dmg * critMult : dmg;
  
  e.hp-=finalDmg;
  
  // ส่งข้อมูลความเสียหายให้เพื่อนในโหมด Multiplayer
  if (isMultiplayer) {
    sendNetData('ENEMY_HIT', { id: e.id, dmg: finalDmg });
  }

  // Floating Combat Text
  const dmgNum = Math.round(finalDmg);
  if (dmgNum > 0) {
    const critEmoji = isHero ? '🔥' : '💥';
    const size = (isHero && isCrit) ? 34 : (isCrit ? 24 : 14);
    addPart(e.x, e.y - 10, isCrit ? `${critEmoji}${dmgNum}` : dmgNum, size);
    if (isHero && isCrit) shakeAmt = 12; // Extra visual impact for Hero Crits
  }
  if(e.hp<=0){
    e.dead=true;
    const reward = Math.round((e.reward || 0)*(1+(stats.goldBonus||0)/100));
    pickups.push({ x: e.x, y: e.y, life: 15, offsetY: 0, type: 'gold', value: reward, emoji: '💰' });
    
    // ดรอปขวดมานา (โอกาส 3%)
    if(Math.random() < 0.03) {
      pickups.push({ x: e.x, y: e.y, life: 10, offsetY: 0, type: 'mana', emoji: '🧪' });
    }

    playSfx('death');
    updateHUD();
  } else { playSfx('hit'); }
}

function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    if(b.tx.dead){bullets.splice(i,1);continue;}
    const dx=b.tx.x-b.x,dy=b.tx.y-b.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<8){dealDmg(b.tx,b.dmg);if(b.slow>0&&!b.tx.dead)b.tx.slowTimer=2;bullets.splice(i,1);}
    else{b.x+=dx/d*b.spd*dt;b.y+=dy/d*b.spd*dt;}
  }
}

function addPart(x,y,emoji,size){partList.push({x,y,emoji,size,life:.7,maxLife:.7,vy:-60});}
function updateParts(dt){for(let i=partList.length-1;i>=0;i--){const p=partList[i];p.life-=dt;p.y+=p.vy*dt;if(p.life<=0)partList.splice(i,1);}}

function checkAutoUpgrades(){
  for(let t of towers){
    if(t.level < 3){
      const cost = UPGRADE_COST[t.level+1];
      if(gold >= cost){
        if (isMultiplayer && !isHost) {
          sendNetData('REQUEST_UPGRADE', { c: t.c, r: t.r, cost: cost });
          break; 
        }

        gold -= cost; t.level++; playSfx('build');
        addPart(t.x, t.y, '⬆', 26); updateHUD();
        if(selectedTower === t) openUpgrade(t);
        if (isMultiplayer && isHost) sendNetData('UPGRADE', { c: t.c, r: t.r });
        break; // อัพเกรดทีละ 1 ป้อมต่อเฟรมเพื่อให้ดูนุ่มนวล
      }
    }
  }
}