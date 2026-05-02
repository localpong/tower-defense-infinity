/* audio.js - สำหรับจัดการระบบเสียง (SFX, BGM) */

// ===== AUDIO ENGINE (Synthesized SFX) =====
let audioCtx = null;
let lastSfxTimes = {};

function initAudio() {
  if (saveData.isMuted) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSfx(type, subType = null) {
  if (!audioCtx || saveData.isMuted) return;
  const now = audioCtx.currentTime;
  const sfxKey = subType !== null ? type + '_' + subType : type;

  // ป้องกันเสียงตีกันมั่ว (Throttling) โดยเฉพาะเสียงที่เกิดบ่อยๆ อย่างการยิงและการโดนดาเมจ
  if (type === 'shoot' || type === 'hit') {
    if (lastSfxTimes[sfxKey] && now - lastSfxTimes[sfxKey] < 0.07) return;
    lastSfxTimes[sfxKey] = now;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  switch (type) {
    case 'build':
      osc.type = 'square'; osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(); osc.stop(now + 0.1);
      break;
    case 'shoot':
      if (subType === 1) { // ปืนใหญ่ (Cannon) - เสียงทุ้ม หนัก
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160 + Math.random() * 40, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(); osc.stop(now + 0.15);
      } else if (subType === 2) { // น้ำแข็ง (Ice) - เสียงใสๆ แหลม
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
      } else if (subType === 3) { // เลเซอร์ (Laser) - เสียง Pew Pew
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(); osc.stop(now + 0.08);
      } else { // ธนู (Archer) - เสียงเบา พรึ่บ
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700 + Math.random() * 100, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
        gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(); osc.stop(now + 0.06);
      }
      break;
    case 'hit':
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(90 + Math.random() * 30, now);
      gain.gain.setValueAtTime(0.02, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(); osc.stop(now + 0.05);
      break;
    case 'death':
      osc.type = 'sine'; osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(); osc.stop(now + 0.2);
      break;
    case 'skill':
      osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(); osc.stop(now + 0.3);
      break;
    case 'wave':
      osc.type = 'square'; osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.5);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(); osc.stop(now + 0.5);
      break;
    case 'click':
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(); osc.stop(now + 0.05);
      break;
  }
}

// ===== AUDIO SYSTEM =====
let bgmAudio = null;

function playMenuBGM() {
  // เพลงสำหรับหน้าเมนู (คุณสามารถเปลี่ยน URL เป็นไฟล์ .mp3 ในเครื่องได้)
  startBgm("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 0.2);
}

function playStageBGM() {
  // เพลงสำหรับช่วงตะลุยด่าน
  startBgm("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", 0.25);
}

function startBgm(src, vol) {
  if (!bgmAudio) {
    bgmAudio = new Audio();
    bgmAudio.loop = true;
  }
  bgmAudio.volume = vol;
  
  // เปลี่ยน Source เฉพาะเมื่อเป็นเพลงใหม่เท่านั้น
  const targetSrc = new URL(src, window.location.href).href;
  if (bgmAudio.src !== targetSrc) {
    bgmAudio.src = src;
    bgmAudio.load();
  }
  updateBgmState();
}

function updateBgmState() {
  if (!bgmAudio) return;
  if (saveData.isMuted || document.hidden) {
    bgmAudio.pause();
  } else {
    // พยายามเล่นเพลง (Browser อาจจะบล็อกจนกว่าจะมีการแตะหน้าจอครั้งแรก)
    bgmAudio.play().catch(() => console.log("BGM waiting for user interaction..."));
  }
}

// ===== VISIBILITY HANDLING =====
// ปิดเสียงทั้งหมดเมื่อผู้เล่นสลับแอปหรือปิดหน้าจอ
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
  } else {
    if (audioCtx && audioCtx.state === 'suspended' && !saveData.isMuted) audioCtx.resume();
  }
  updateBgmState();
});