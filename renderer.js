/* renderer.js - สำหรับวาดภาพหน้าจอ (Canvas Rendering) */

// ===== RENDER =====
function render(){
  const s=STAGES[stageIdx%STAGES.length];
  
  ctx.save();
  if(shakeAmt > 0) {
    ctx.translate(Math.random()*shakeAmt - shakeAmt/2, Math.random()*shakeAmt - shakeAmt/2);
    shakeAmt *= 0.9; if(shakeAmt < 0.5) shakeAmt = 0;
  }

  ctx.fillStyle=s.bg;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Cloud Parallax (วาดเมฆหลังทางเดินและป้อม)
  ctx.save();
  for(let i=0; i<3; i++) {
    const cx = ((bgAnimTime * (8 + i * 4)) % (canvas.width + 300)) - 150;
    const cy = (i * 150) + 100;
    ctx.fillStyle = s.cloud;
    ctx.beginPath(); ctx.arc(cx, cy, 60 + i * 20, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const x = c * CS, y = r * CS;
    if(isPath(c,r)){
      // 1. วาดพื้นทางเดินหลัก (Track Base)
      ctx.fillStyle=s.track;
      ctx.fillRect(x, y, CS, CS);
      
      // 2. เพิ่ม Texture กรวดหินและดินสุ่ม (คงที่ตามตำแหน่งเพื่อให้ภาพไม่กะพริบ)
      const noise = Math.abs(Math.sin(c * 12.3 + r * 45.6));
      ctx.fillStyle = 'rgba(0,0,0,0.1)'; // รอยเข้ม (หลุม/เงาหิน)
      if(noise > 0.7) ctx.fillRect(x + CS*0.2, y + CS*0.2, CS*0.5, CS*0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; // รอยสว่าง (แสงสะท้อนหิน)
      if(noise < 0.3) ctx.fillRect(x + CS*0.4, y + CS*0.6, CS*0.3, CS*0.3);

      // 3. วาดเส้นขอบขรุขระ (Edge) เฉพาะด้านที่ติดกับพื้นหญ้าเพื่อให้ดูมีมิติ
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      if(!isPath(c, r-1)) { ctx.beginPath(); ctx.moveTo(x, y+1); ctx.lineTo(x+CS, y+1); ctx.stroke(); }
      if(!isPath(c, r+1)) { ctx.beginPath(); ctx.moveTo(x, y+CS-1); ctx.lineTo(x+CS, y+CS-1); ctx.stroke(); }
      if(!isPath(c-1, r)) { ctx.beginPath(); ctx.moveTo(x+1, y); ctx.lineTo(x+1, y+CS); ctx.stroke(); }
      if(!isPath(c+1, r)) { ctx.beginPath(); ctx.moveTo(x+CS-1, y); ctx.lineTo(x+CS-1, y+CS); ctx.stroke(); }

    } else if(!hasTower(c,r)){
      // วาดพื้นหลัง (หญ้า/ดิน) แบบมีรายละเอียดเบาๆ
      ctx.fillStyle='rgba(255,255,255,0.02)';
      ctx.fillRect(x+1, y+1, CS-2, CS-2);
      // อนิเมชั่นหญ้าพริ้วไหว
      if((c*13 + r*7) % 10 < 2) {
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
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(!isPath(c,r)&&!hasTower(c,r)){ctx.fillStyle='rgba(88,166,255,0.1)';ctx.fillRect(c*CS+1,r*CS+1,CS-2,CS-2);}
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
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
  const x=t.c*CS+CS/2, y=t.r*CS+CS/2, r2=CS*.38;

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
  ctx.font=`${CS*.36}px serif`;ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(td.emoji,0,0);

  // Draw level badge
  if(t.level>0){
    const lx=r2*.5,ly=-r2*.5; // Relative to tower center (0,0)
    ctx.beginPath();ctx.arc(lx,ly,7,0,Math.PI*2);ctx.fillStyle='#f0a500';ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText(t.level+1,lx,ly+3);
  }

  ctx.restore(); // Restore context after tower body transformations
}

function drawEnemy(e){
  const r2 = e.isBoss ? CS * 0.45 : CS * 0.28;
  
  // คำนวณอนิเมชั่น (Squash, Stretch, Bobbing) ตามการเคลื่อนที่
  const animFreq = e.isBoss ? 2.5 : 5;
  const animProg = e.progress * animFreq;
  const bobY = Math.abs(Math.sin(animProg)) * (e.isBoss ? -3 : -6); // กระโดดขึ้นลง
  const wobble = Math.sin(animProg) * (e.isBoss ? 0.05 : 0.15);     // เอียงซ้ายขวา
  const squash = 1 + Math.sin(animProg * 2) * 0.08;                // ยืดหดตัว

  // 1. วาดเงาที่พื้น (สร้างมิติแบบ 3D Perspective)
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + r2 * 0.8, r2 * squash, r2 * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  // เลื่อนตำแหน่งและหมุนตามอนิเมชั่น
  ctx.translate(e.x, e.y + bobY);
  ctx.rotate(wobble);
  ctx.scale(2 - squash, squash); 
  
  // Define base colors and their darker counterparts for gradients
  const baseColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#95a5a6']; // เพิ่มสีเทาสำหรับ Skeleton
  const darkColors = ['#cc5555', '#ccaa33', '#55aa66', '#7f8c8d'];
  const startColor = (e.isBoss ? '#8B0000' : baseColors[e.type]) || '#fff';
  const endColor = (e.isBoss ? '#660000' : darkColors[e.type]) || '#333';

  // Draw outer boss ring if applicable
  if (e.isBoss) {
    ctx.beginPath(); ctx.arc(0, 0, r2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
  }

  // Create radial gradient for the enemy body
  const gradient = ctx.createRadialGradient(-r2*0.2, -r2*0.2, r2 * 0.1, 0, 0, r2);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);

  ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2);
  ctx.fillStyle = gradient; ctx.fill();
  ctx.strokeStyle = endColor; ctx.lineWidth = 1.5; ctx.stroke(); // Add a subtle border

  if (e.slowTimer > 0) { ctx.fillStyle = 'rgba(100,181,246,0.35)'; ctx.beginPath(); ctx.arc(0, 0, r2 + 2, 0, Math.PI * 2); ctx.fill(); }
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${e.isBoss ? CS * 0.5 : CS * 0.35}px serif`;
  const enemyEmoji = e.isBoss ? '👹' : WALK_EMOJIS[e.type][e.walkAnimState];
  ctx.fillText(enemyEmoji, 0, 0);
  ctx.restore();

  // แถบเลือด (วาดแยกไม่ให้หมุนหรือกระโดดตามตัวละครเพื่อให้ดูง่าย)
  const bw=CS*1.1,bh=3,bx=e.x-bw/2,by=e.y-r2-12;
  ctx.fillStyle='#30363d';ctx.fillRect(bx,by,bw,bh);
  ctx.fillStyle=e.hp/e.maxHp>.5?'#3fb950':'#ff6b6b';ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),bh);
  if(e.isBoss){ctx.font='bold 8px sans-serif';ctx.fillStyle='#ff4444';ctx.textAlign='center';ctx.fillText('BOSS',e.x,by-4);}
}

function drawBullet(b){
  // เพิ่มสีให้ครบตามจำนวนชนิดป้อมที่มี (9 ชนิด) และใส่ Fallback เป็นสีขาว
  const cols=['#4CAF50','#FF6B35','#64B5F6','#FFD700','#f1c40f','#95a5a6','#e67e22','#3498db','#9b59b6'];
  ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);
  ctx.fillStyle=cols[b.type] || '#ffffff';ctx.fill();
}