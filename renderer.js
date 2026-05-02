/* renderer.js - สำหรับวาดภาพหน้าจอ (Canvas Rendering) */

// ===== OFFSCREEN CACHE (OPTIMIZATION) =====
let bgCacheCanvas = null;

function cacheBackground() {
  if (!bgCacheCanvas) bgCacheCanvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  bgCacheCanvas.width = GAME_WIDTH * dpr;
  bgCacheCanvas.height = GAME_HEIGHT * dpr;
  const bCtx = bgCacheCanvas.getContext('2d');
  bCtx.scale(dpr, dpr);
  bCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // พื้นหลังโปร่งใสเพื่อให้เห็นเมฆ

  const s = STAGES[stageIdx % STAGES.length];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const x = c * CS, y = r * CS;
    if(isPath(c,r)){
      bCtx.fillStyle=s.track;
      bCtx.fillRect(x, y, CS, CS);
      
      const noise = Math.abs(Math.sin(c * 12.3 + r * 45.6));
      bCtx.fillStyle = 'rgba(0,0,0,0.1)';
      if(noise > 0.7) bCtx.fillRect(x + CS*0.2, y + CS*0.2, CS*0.5, CS*0.5);
      bCtx.fillStyle = 'rgba(255,255,255,0.05)';
      if(noise < 0.3) bCtx.fillRect(x + CS*0.4, y + CS*0.6, CS*0.3, CS*0.3);

      bCtx.strokeStyle = 'rgba(0,0,0,0.3)';
      bCtx.lineWidth = 2;
      if(!isPath(c, r-1)) { bCtx.beginPath(); bCtx.moveTo(x, y+1); bCtx.lineTo(x+CS, y+1); bCtx.stroke(); }
      if(!isPath(c, r+1)) { bCtx.beginPath(); bCtx.moveTo(x, y+CS-1); bCtx.lineTo(x+CS, y+CS-1); bCtx.stroke(); }
      if(!isPath(c-1, r)) { bCtx.beginPath(); bCtx.moveTo(x+1, y); bCtx.lineTo(x+1, y+CS); bCtx.stroke(); }
      if(!isPath(c+1, r)) { bCtx.beginPath(); bCtx.moveTo(x+CS-1, y); bCtx.lineTo(x+CS-1, y+CS); bCtx.stroke(); }
    } else {
      bCtx.fillStyle='rgba(255,255,255,0.02)';
      bCtx.fillRect(x+1, y+1, CS-2, CS-2);
    }
  }
}

// ===== RENDER =====
function render(){
  const s=STAGES[stageIdx%STAGES.length];
  
  ctx.save();
  if(shakeAmt > 0) {
    ctx.translate(Math.random()*shakeAmt - shakeAmt/2, Math.random()*shakeAmt - shakeAmt/2);
    shakeAmt *= 0.9; if(shakeAmt < 0.5) shakeAmt = 0;
  }

  ctx.fillStyle=s.bg;
  ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);

  // Cloud Parallax (วาดเมฆหลังทางเดินและป้อม)
  ctx.save();
  for(let i=0; i<3; i++) {
    const cx = ((bgAnimTime * (8 + i * 4)) % (GAME_WIDTH + 300)) - 150;
    const cy = (i * 150) + 100;
    ctx.fillStyle = s.cloud;
    ctx.beginPath(); ctx.arc(cx, cy, 60 + i * 20, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  if(bgCacheCanvas) {
    ctx.drawImage(bgCacheCanvas, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  // อนิเมชั่นหญ้าพริ้วไหว (วาดเฉพาะส่วนที่เคลื่อนไหว)
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!isPath(c,r) && !hasTower(c,r)){
      if((c*13 + r*7) % 10 < 2) {
        const x = c * CS, y = r * CS;
        const sway = Math.sin(bgAnimTime * 1.5 + c + r) * 4;
        ctx.strokeStyle = s.detail;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + CS/2, y + CS*0.8);
        ctx.lineTo(x + CS/2 + sway, y + CS*0.4);
        ctx.stroke();
      }
    }
  }
  if(selectedType!==null){
    const td = TOWER_TYPES[selectedType];
    const tw = td.w || 1;
    const th = td.h || 1;

    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      let canBuild = true;
      for(let i=0; i<tw; i++){
        for(let j=0; j<th; j++){
          if(c+i >= COLS || r+j >= ROWS || isPath(c+i, r+j) || hasTower(c+i, r+j)) {
            canBuild = false; break;
          }
        }
      }
      if(canBuild){
        ctx.fillStyle='rgba(88,166,255,0.15)';
        ctx.fillRect(c*CS+1, r*CS+1, CS*tw-2, CS*th-2);
      }
    }
  }
  towers.forEach(t=>drawTower(t));
  enemies.forEach(e=>{if(!e.dead)drawEnemy(e);});
  bullets.forEach(b=>drawBullet(b));
  heroBullets.forEach(b=>drawHeroBullet(b));
  
  // Draw Enemy Bullets
  enemyBullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444';
    ctx.fill();
  });

  drawHeroEntity();
  if (isMultiplayer && remoteHero) drawRemoteHero();
  // วาด Item ที่ดรอปบนพื้น (พร้อมระบบกระพริบเมื่อใกล้หาย)
  pickups.forEach(p => {
    // Flashing effect when life < 3s
    if (p.life < 3 && Math.floor(p.life * 8) % 2 === 0) return;
    
    ctx.save();
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.type === 'gold' ? 'var(--gold)' : 'var(--blue)';
    ctx.fillText(p.emoji, p.x, p.y + p.offsetY);
    ctx.restore();
  });

  // Draw Weather Particles
  weatherParticles.forEach(p => {
    ctx.fillStyle = s.weather === 'rain' ? '#58a6ff' : s.weather === 'embers' ? '#ff6b6b' : '#fff';
    if(s.weather === 'rain') {
      ctx.fillRect(p.x, p.y, 1, 10);
    } else if(s.weather === 'leaves') {
      ctx.font = '8px serif'; ctx.fillText('🍃', p.x, p.y);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2); ctx.fill();
    }
  });

  // Screen Tint Overlay
  ctx.fillStyle = s.tint;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  partList.forEach(p=>{
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.font=`${p.size}px serif`; ctx.fillText(p.emoji,p.x-p.size/2,p.y);
    ctx.globalAlpha=1;
  });
  ctx.restore();
  
  const si=document.getElementById('speed-ind');
  si.className=speedMode===0?'':speedMode===1?'x2':'x3';
  si.textContent=speedMode===0?'▶ x1':speedMode===1?'▶▶ x2':'▶▶▶ x3';
}

function drawHeroEntity() {
  if (!heroEntity || heroEntity.dead || isNaN(heroEntity.x)) return;

  // วาดเส้นประและจุดหมายเมื่อ Hero กำลังเดินและถูกเลือกอยู่
  const dxDest = heroEntity.targetX - heroEntity.x;
  const dyDest = heroEntity.targetY - heroEntity.y;
  const distDest = Math.sqrt(dxDest * dxDest + dyDest * dyDest);
  
  if (distDest > 5 && heroEntity.selected) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 4]); // รูปแบบเส้นประ [ความยาวเส้น, ระยะห่าง]
    ctx.strokeStyle = heroEntity.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.moveTo(heroEntity.x, heroEntity.y);
    ctx.lineTo(heroEntity.targetX, heroEntity.targetY);
    ctx.stroke();
    
    // วาดวงกลมเล็กๆ ที่ตำแหน่งเป้าหมาย
    ctx.beginPath();
    ctx.arc(heroEntity.targetX, heroEntity.targetY, 5, 0, Math.PI * 2);
    ctx.fillStyle = heroEntity.color;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  // คำนวณอนิเมชั่น
  const time = Date.now() / 1000;
  const isMoving = distDest > 5;
  const breath = Math.sin(time * 3) * 0.05; // หายใจช้าๆ
  const walkBob = isMoving ? Math.abs(Math.sin(time * 12)) * 6 : 0; // กระโดดเวลาเดิน
  const side = (heroEntity.targetX < heroEntity.x) ? -1 : 1; // หันซ้ายขวา
  const scaleH = 1 + breath + (isMoving ? -0.05 : 0);
  const scaleW = (1 - breath) * side;

  ctx.translate(heroEntity.x, heroEntity.y);
  
  // 1. Shadow (เงาพื้น)
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 20 * (1-breath), 10 * (1-breath), 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Pseudo-3D Base (ฐานตัวละคร)
  const grad = ctx.createRadialGradient(0, 5, 5, 0, 5, 25);
  grad.addColorStop(0, heroEntity.color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(0, 10, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // 3. Hero Body & Emoji (ตัวละคร)
  ctx.save();
  ctx.translate(0, -walkBob); // ขยับขึ้นลงตามการเดิน
  ctx.scale(scaleW, scaleH); // ยืดหดตามการหายใจและทิศทาง
  
  // วาดออร่ารอบตัว
  const auraHpRatio = heroEntity.hp / heroEntity.maxHp;
  const auraColor = auraHpRatio < 0.3 ? '#ef4444' : heroEntity.color; // เปลี่ยนเป็นแดงเมื่อ HP < 30%

  ctx.shadowBlur = 15;
  ctx.shadowColor = auraColor;
  
  ctx.font = `${CS * 0.9}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(heroEntity.emoji, 0, 0);

  // วาดอาวุธที่ถือ (อิงตาม ID ของ Hero)
  const weaponEmojis = ['🪄', '🗡️', '🏹', '❄️'];
  ctx.font = `${CS * 0.45}px serif`;
  ctx.shadowBlur = 5;
  ctx.fillText(weaponEmojis[heroEntity.heroId], 14, 2);
  ctx.restore();

  // 4. Hero UI (แถบเลือด - วาดนิ่งๆ ไม่ส่ายตามตัว)
  const bw = 40, bh = 4;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-bw/2, 20, bw, bh);
  
  const hpRatio = Math.max(0, Math.min(1, heroEntity.hp / (heroEntity.maxHp || 100)));
  ctx.fillStyle = hpRatio > 0.4 ? 'var(--green)' : 'var(--red)';
  ctx.fillRect(-bw/2, 20, bw * hpRatio, bh);

  // Selection Ring
  if (heroEntity.selected) {
    ctx.strokeStyle = 'var(--blue)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(0, 5, 25, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.restore();
}

function drawRemoteHero() {
  if (!remoteHero || isNaN(remoteHero.x)) return;
  ctx.save();
  
  // Interpolation: ค่อยๆ เลื่อนตำแหน่ง Remote Hero เข้าหาเป้าหมาย
  if (remoteHero.targetX !== undefined) {
    remoteHero.x += (remoteHero.targetX - remoteHero.x) * 0.2;
    remoteHero.y += (remoteHero.targetY - remoteHero.y) * 0.2;
  }
  ctx.translate(remoteHero.x, remoteHero.y);
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 15, 15, 7, 0, 0, Math.PI * 2); ctx.fill();

  // Aura
  ctx.shadowBlur = 10;
  ctx.shadowColor = remoteHero.color || 'var(--blue)';
  
  // Emoji
  ctx.font = `${CS * 0.8}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(remoteHero.emoji, 0, 0);

  // Remote HP Bar
  if (remoteHero.hp !== undefined) {
    const bw = 30, bh = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-bw/2, 18, bw, bh);
    ctx.fillStyle = 'var(--blue)'; // ใช้สีน้ำเงินแยกความแตกต่าง
    ctx.fillRect(-bw/2, 18, bw * (remoteHero.hp / 100), bh);
  }
  ctx.restore();
}

function drawHeroBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  
  // ปรับองศาเพิ่มสำหรับ Emoji ธนู เพราะรูป 🏹 ปกติจะเอียง 45 องศา
  if (b.heroId === 2) {
    ctx.rotate(Math.PI / 4 + Math.PI / 2);
  }
  
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.emoji, 0, 0);
  ctx.restore();
}

function drawTower(t){
  const td=TOWER_TYPES[t.type];
  const tw = td.w || 1;
  const th = td.h || 1;
  const x = t.x, y = t.y;
  const scaleM = Math.min(tw, th);
  const r2 = CS * 0.38 * (1 + (scaleM - 1) * 0.6); // ขยายขนาดขึ้นถ้าวางพื้นที่กว้างกว่า

  // Draw range circle first, it should not recoil
  if(selectedTower===t){
    const h=HEROES[saveData.equippedHero], stats=getHeroStats(h,saveData.heroLevels[saveData.equippedHero]);
    const range=td.range*Math.sqrt(UPGRADE_MULT[t.level])+(stats.rangeBonus||0);
    ctx.beginPath();ctx.arc(x,y,range,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fill();
  }

  ctx.save(); // Save context for tower body transformations

  // Apply recoil translation
  let recoilOffsetX = 0;
  let recoilOffsetY = 0;
  if (t.recoilAmt > 0) {
    recoilOffsetX = Math.random() * t.recoilAmt - t.recoilAmt / 2;
    recoilOffsetY = Math.random() * t.recoilAmt - t.recoilAmt / 2;
  }
  ctx.translate(x + recoilOffsetX, y + recoilOffsetY);

  // Draw tower base
  ctx.beginPath();ctx.arc(0,0,r2+3,0,Math.PI*2);ctx.fillStyle=td.color+'40';ctx.fill();
  ctx.beginPath();ctx.arc(0,0,r2,0,Math.PI*2);ctx.fillStyle='#1e2a3a';ctx.fill();
  ctx.strokeStyle=td.color;ctx.lineWidth=2;ctx.stroke();

  // Draw aiming part (cannon/barrel)
  if(t.aimAngle!==undefined){
    ctx.save(); // Save for rotation of the aiming part
    ctx.rotate(t.aimAngle);
    ctx.fillStyle=td.color;ctx.fillRect(2,-2,r2*.9,4);
    ctx.restore(); // Restore after aiming part rotation
  }

  // Draw tower emoji
  const fontSize = CS * 0.36 * (1 + (scaleM - 1) * 0.5);
  ctx.font=`${fontSize}px serif`;ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(td.emoji,0,0);

  // Draw level badge
  if(t.level>0){
    const lx=r2*.5,ly=-r2*.5; // Relative to tower center (0,0)
    ctx.beginPath();ctx.arc(lx,ly,7,0,Math.PI*2);ctx.fillStyle='#f0a500';ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText(t.level+1,lx,ly+3);
  }

  // วาดเอฟเฟกต์ไฟไหม้และทำให้ป้อมสีทึบลงเมื่อถูกสถานะ Disabled
  if (t.disabledTimer > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath(); ctx.arc(0, 0, r2 + 2, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${CS * 0.6}px serif`;
    ctx.fillText('🔥', 0, 0);
  }

  ctx.restore(); // Restore context after tower body transformations
}

function drawEnemy(e){
  const r2 = e.isBoss ? CS * 0.5 : CS * 0.35; // ขยายขนาดรัศมีอ้างอิงให้เข้ากับไอคอนฮีโร่
  
  // คำนวณอนิเมชั่น (Squash, Stretch, Bobbing) ตามการเคลื่อนที่
  const animFreq = e.isBoss ? 2.5 : 5;
  const animProg = e.progress * animFreq;
  const bobY = Math.abs(Math.sin(animProg)) * (e.isBoss ? -4 : -8); // กระโดดขึ้นลงแบบ Hero
  const wobble = Math.sin(animProg) * (e.isBoss ? 0.05 : 0.15);     // เอียงซ้ายขวา
  const squash = 1 + Math.sin(animProg * 2) * 0.08;                // ยืดหดตัว
  const side = Math.cos(animProg) > 0 ? 1 : -1; // โยกซ้ายขวาคล้ายการเดินของ Hero

  // ชุดสีตามประเภทศัตรู
  const baseColors = ['#e53935', '#fb8c00', '#43a047', '#546e7a'];
  const enemyColor = e.isBoss ? '#ff1111' : (baseColors[e.type] || '#fff');

  // 1. วาดเงาที่พื้น (วาดก่อนให้ติดพื้น ไม่โยกตามตัว)
  if (!e.isBurrowed) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r2 * 0.8, r2 * squash, r2 * 0.5 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(e.x, e.y);

  // 2. Pseudo-3D Base (ฐานใต้ตัวแบบ Hero วาดที่พื้น)
  if (!e.isBurrowed) {
    const grad = ctx.createRadialGradient(0, r2*0.5, r2*0.2, 0, r2*0.5, r2*1.1);
    grad.addColorStop(0, enemyColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, r2*0.5, r2*1.1, r2*0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // เอฟเฟกต์น้ำแข็ง (เมื่อโดน Slow) ให้วาดที่ฐาน
    if (e.slowTimer > 0) { 
      ctx.fillStyle = 'rgba(100,181,246,0.3)'; 
      ctx.strokeStyle = 'rgba(100,181,246,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); 
      ctx.ellipse(0, r2*0.5, r2*1.1, r2*0.6, 0, 0, Math.PI * 2); 
      ctx.fill(); 
      ctx.stroke();
    }
  }
  
  // 3. เลื่อนตำแหน่งตัวอิโมจิขึ้นลงตามการเดิน
  if (!e.isBurrowed) {
    ctx.translate(0, bobY);
    ctx.rotate(wobble);
    ctx.scale(side * (2 - squash), squash); // พลิกซ้ายขวาและยืดหดตัว
  } else {
    ctx.translate(Math.random()*4-2, Math.random()*2-1); // สั่นตอนมุดดิน
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // สร้างออร่าเรืองแสงสีแดงหรือดำรอบๆ ไอคอนศัตรู
  ctx.shadowColor = e.isBoss ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = e.isBoss ? 25 : 12;

  // ปรับขนาดฟอนต์และทำตัวหนาให้ใหญ่ขึ้นเพราะเราเอาวงกลมพื้นหลังออกแล้ว
  ctx.font = `bold ${e.isBoss ? CS * 1.1 : CS * 0.75}px serif`;
  const enemyEmoji = e.isBoss ? (e.bossType === 2 ? (e.isBurrowed ? '🌪️' : '🐛') : (e.bossType === 1 ? '🐉' : '🦑')) : WALK_EMOJIS[e.type][e.walkAnimState];
  const textY = e.isBurrowed ? 0 : -r2 * 0.2;
  ctx.fillText(enemyEmoji, 0, textY);

  // วาดทับอีกชั้นแบบไม่มีเงาเพื่อให้สีหลักชัดเจนขึ้น ไม่จมไปกับเงา
  ctx.shadowBlur = 0;
  ctx.fillText(enemyEmoji, 0, textY);
  ctx.restore();

  // UI หลอดเลือดที่ปรับปรุงใหม่ให้ดูโมเดิร์น
  if (!e.isBurrowed) {
    const hpRatio = Math.max(0, Math.min(1, e.hp / e.maxHp));
    const bw = e.isBoss ? CS * 1.5 : CS * 1.1; // กว้างขึ้นสำหรับบอส
    const bh = e.isBoss ? 4.5 : 3.5;
    const bx = e.x - bw / 2;
    const by = e.y - r2 - (e.isBoss ? 24 : 16); // ขยับหลอดเลือดขึ้นให้พ้นหัวอิโมจิ

    // พื้นหลังหลอดเลือดแบบโปร่งแสงและมุมโค้ง
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 2); else ctx.fillRect(bx, by, bw, bh); ctx.fill();

    // สีหลอดเลือดเปลี่ยนสถานะ (เขียว -> ส้ม -> แดง)
    let hpColor = '#3fb950';
    if (hpRatio <= 0.25) hpColor = '#ff4444';
    else if (hpRatio <= 0.6) hpColor = '#f0a500';

    ctx.fillStyle = hpColor;
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx, by, bw * hpRatio, bh, 2); else ctx.fillRect(bx, by, bw * hpRatio, bh); ctx.fill();

    // ป้ายบอกบอส (Boss Badge) ที่ออกแบบเป็นกล่องข้อความดูพรีเมียมขึ้น
    if (e.isBoss) {
      const bdw = 32, bdh = 12, bdx = e.x - bdw / 2, bdy = by - bdh - 4;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bdx, bdy, bdw, bdh, 4); else ctx.fillRect(bdx, bdy, bdw, bdh); ctx.fill();
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BOSS', e.x, bdy + bdh / 2 + 1);
    }
  }
}

function drawBullet(b){
  // เพิ่มสีให้ครบตามจำนวนชนิดป้อมที่มี (9 ชนิด) และใส่ Fallback เป็นสีขาว
  const cols=['#4CAF50','#FF6B35','#64B5F6','#FFD700','#f1c40f','#95a5a6','#e67e22','#3498db','#9b59b6'];
  ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);
  ctx.fillStyle=cols[b.type] || '#ffffff';ctx.fill();
}