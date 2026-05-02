/* main.js - Entry point สำหรับโหลดและเริ่มการทำงานของเกม */

// ===== CONFIG =====
let APP_VERSION = "1.0.2"; // เวอร์ชันเริ่มต้นในเครื่อง

// ===== GAME STATE =====
let canvas, ctx;
const COLS=10, ROWS=15;
let CS=34;
let GAME_WIDTH, GAME_HEIGHT;
let gold, hp, mana, maxMana, wave, waveRunning, gameOver, won;
let towers, enemies, bullets, partList;
let selectedType = null, selectedTower = null;
let speedMult, speedMode;
let stageIdx=0, currentLevel=1, enemyBullets = [], heroBullets = [];
let shakeAmt=0, heroEntity=null;
let bgAnimTime=0;
let weatherParticles=[];
let autoWaveEnabled=false;
let autoUpgradeEnabled=false;
let pickups=[];
let paths=[];
let animFrame=null, lastTime=0, waveTimer=0, waveQueue=[];
let heroShieldCount=0;
let syncTimer = 0; // เพิ่มตัวจับเวลาสำหรับการซิงค์

// ===== CANVAS LISTENER =====
document.getElementById('game-canvas').addEventListener('click',onCanvasClick);

// ===== BOOT =====
loadGame();
gotoHome();
renderHomeHeroes();
syncVersion(true); // ตรวจสอบและแจ้งเตือนอัปเดตทันทีที่เข้าแอป

// ===== DATA =====
// ... (HEROES, STAGES, etc. remain the same)