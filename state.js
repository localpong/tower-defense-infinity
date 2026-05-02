/* state.js - สำหรับจัดการ saveData และสถานะต่างๆ ในเกม */

// ===== SAVE / LOAD =====
let saveData = {
  heroLevels:[0,0,0,0], equippedHero:0, coins:0, gems:0,
  heroMaxHps:[20,20,20,20], nickname: '', friends: [],
  inventory: [], equippedWeapons: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  infinityLevel:1, bestLevel:1, currentPath: null,
  selectedTowers: [0, 1, 2, 3], // เริ่มเกมมีป้อมให้เลือก 4 ชนิดเลย
  towerLevels: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // เพิ่มการเก็บเลเวลป้อมถาวร 20 ชนิด
  invSeen: false,
  isMuted: false,
  autoNextEnabled: false
};
function saveGame(){
  try{ localStorage.setItem('td_save', JSON.stringify(saveData)); showToast('💾 บันทึกอัตโนมัติ', 'var(--green)'); }catch(e){}
}
function loadGame(){
  try{ const d=localStorage.getItem('td_save'); if(d){ const p=JSON.parse(d); Object.assign(saveData,p); } }catch(e){}
}
function showToast(txt, color = '#238636'){
  const t = document.getElementById('autosave-toast');
  if(!t) return;
  t.textContent = txt;
  t.style.background = color;
  t.style.opacity = '1';
  clearTimeout(window._st);
  window._st = setTimeout(() => { t.style.opacity = '0'; }, 2000);
}