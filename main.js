/* main.js - Entry point สำหรับโหลดและเริ่มการทำงานของเกม */

// ===== CONFIG =====
// ดึงค่าเวอร์ชันล่าสุดจาก LocalStorage (ถ้าเข้าครั้งแรกจะเป็น 1.0.0)
let APP_VERSION = localStorage.getItem('td_version') || "1.0.0";

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
let draggingTowerType = null, dragTowerX = 0, dragTowerY = 0;
let weatherParticles=[];
let autoUpgradeEnabled=false;
let isPaused = false;
let waveCountdown = 0;
let pickups=[];
let paths=[];
let animFrame=null, lastTime=0, waveTimer=0, waveQueue=[];
let heroShieldCount=0;
let syncTimer = 0; // เพิ่มตัวจับเวลาสำหรับการซิงค์
let sessionGems = 0;
let sessionItems = [];

// ===== CANVAS LISTENER =====
const _gameCanvas = document.getElementById('game-canvas');
_gameCanvas.addEventListener('pointerdown', onPointerDown);
_gameCanvas.addEventListener('pointermove', onPointerMove);
_gameCanvas.addEventListener('pointerup', onPointerUp);
_gameCanvas.addEventListener('pointercancel', onPointerUp);

// ===== BOOT =====
loadGame();
gotoHome();
renderHomeHeroes();
syncVersion(true); // ตรวจสอบและแจ้งเตือนอัปเดตทันทีที่เข้าแอป

// ===== DATA =====
// ... (HEROES, STAGES, etc. remain the same)