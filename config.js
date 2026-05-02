/* config.js - สำหรับเก็บค่าคงที่ เช่น HEROES, TOWER_TYPES, STAGES */

const HEROES = [
  { id:0, emoji:'🧙‍♂️', name:'พ่อมด', desc:'ผู้เชี่ยวชาญเวทย์มนตร์ เพิ่มพลังโจมตีป้อมทั้งหมด',
    color:'#bc8cff', baseStats:{atkBonus:10,rangeBonus:0,goldBonus:0,hpBonus:0}, // Mage
    perLv:{atkBonus:8,rangeBonus:2,goldBonus:0,hpBonus:2},
    skill:{name:'ไฟฝนฟ้า',emoji:'🔥',desc:'ดีลดาเมจกับศัตรูทั้งหมด 80 dmg',cd:35,manaCost:35}, // Increased CD/Mana
    upgradeCost:[50,80,120,160,200,250,300,360,420,500], maxLv:10 },
  { id:1, emoji:'💂', name:'นักรบ', desc:'นักรบผู้เก่งกาจ เพิ่ม HP และพลังป้อมใกล้ชิด',
    color:'#ff6b6b', baseStats:{atkBonus:0,rangeBonus:0,goldBonus:0,hpBonus:5}, // Warrior
    perLv:{atkBonus:5,rangeBonus:0,goldBonus:5,hpBonus:3},
    skill:{name:'โล่เหล็ก',emoji:'🛡️',desc:'ป้องกันความเสียหาย 3 ครั้งถัดไป',cd:40,manaCost:40}, // Increased CD/Mana
    upgradeCost:[60,90,130,170,210,260,320,380,440,520], maxLv:10 },
  { id:2, emoji:'🧝', name:'นักธนู', desc:'นักธนูผู้คล่องแคล่ว เพิ่มความเร็วยิงและโบนัสทอง',
    color:'#4CAF50', baseStats:{atkBonus:0,rangeBonus:10,goldBonus:10,hpBonus:0}, // Archer
    perLv:{atkBonus:3,rangeBonus:5,goldBonus:8,hpBonus:1},
    skill:{name:'ฝนลูกธนู',emoji:'🌧️',desc:'ยิงลูกธนู 20 นัดสุ่มโจมตีศัตรู',cd:32,manaCost:32}, // Increased CD/Mana
    upgradeCost:[55,85,125,165,205,255,310,370,430,510], maxLv:10 },
  { id:3, emoji:'🧙‍♀️', name:'จอมน้ำแข็ง', desc:'ควบคุมน้ำแข็ง ชะลอศัตรูทั้งหมดและเพิ่มพิสัย',
    color:'#64B5F6', baseStats:{atkBonus:0,rangeBonus:15,goldBonus:0,hpBonus:0}, // Ice Mage
    perLv:{atkBonus:4,rangeBonus:4,goldBonus:3,hpBonus:2},
    skill:{name:'พายุน้ำแข็ง',emoji:'❄️',desc:'ชะลอศัตรูทั้งหมด 5 วินาที',cd:38,manaCost:38}, // Increased CD/Mana
    upgradeCost:[70,100,140,180,220,270,330,390,450,530], maxLv:10 },
];

const STAGES=[
  {name:'ทุ่งหญ้า',emoji:'🌿',bg:'#1a2f1a',track:'#8B7355', cloud:'rgba(255,255,255,0.04)', detail:'rgba(100,255,100,0.1)', weather:'leaves', tint:'rgba(0,255,0,0.02)'},
  {name:'ป่าทึบ',emoji:'🌲',bg:'#0f1f0f',track:'#6B8E6B', cloud:'rgba(200,220,200,0.03)', detail:'rgba(80,200,80,0.1)', weather:'rain', tint:'rgba(0,50,150,0.05)'},
  {name:'ทะเลทราย',emoji:'🏜',bg:'#2d2010',track:'#C4A882', cloud:'rgba(240,200,150,0.05)', detail:'rgba(255,220,100,0.08)', weather:'dust', tint:'rgba(255,150,0,0.03)'},
  {name:'ภูเขาไฟ',emoji:'🌋',bg:'#1f0f00',track:'#8B4513', cloud:'rgba(60,40,40,0.18)', detail:'rgba(255,80,0,0.15)', weather:'embers', tint:'rgba(255,0,0,0.06)'},
  {name:'ดินแดนน้ำแข็ง',emoji:'❄️',bg:'#0f1f2d',track:'#87CEEB', cloud:'rgba(255,255,255,0.08)', detail:'rgba(150,220,255,0.15)', weather:'snow', tint:'rgba(200,230,255,0.05)'},
];

const WALK_EMOJIS = [
  ['🧌', '🧌'], // Type 0: โทรลล์/ยักษ์ (ธาตุพืช แพ้ไฟ🔥)
  ['🕷️', '🕷️'], // Type 1: แมงมุมยักษ์ (ธาตุแมลง แพ้น้ำแข็ง❄️)
  ['🦇', '🦇'], // Type 2: ค้างคาวผีดิบ (ธาตุบิน แพ้สายฟ้า/เลเซอร์⚡)
  ['👿', '👿']  // Type 3: ปีศาจ (ธาตุมืด แพ้เวทมนตร์🪄)
];

const TOWER_TYPES = [
  {name:'ธนู',emoji:'🏹',cost:50,color:'#4CAF50',dmg:15,range:80,rate:1.2,splashR:0,slow:0, w:1, h:1},
  {name:'ปืนใหญ่(ไฟ)',emoji:'💣',cost:80,color:'#FF6B35',dmg:30,range:70,rate:0.8,splashR:35,slow:0, w:2, h:2},
  {name:'น้ำแข็ง(น้ำ)',emoji:'❄️',cost:100,color:'#64B5F6',dmg:10,range:75,rate:1.0,splashR:0,slow:0.5, w:1, h:1},
  {name:'เลเซอร์(แสง)',emoji:'⚡',cost:120,color:'#FFD700',dmg:20,range:90,rate:2.0,splashR:0,slow:0, w:1, h:1},
  {name:'สไนเปอร์',emoji:'🎯',cost:150,color:'#f1c40f',dmg:120,range:160,rate:0.4,splashR:0,slow:0, w:2, h:2},
  {name:'มินิกัน',emoji:'🔫',cost:180,color:'#95a5a6',dmg:12,range:75,rate:6.0,splashR:0,slow:0, w:1, h:1},
  {name:'จรวด(ไฟ)',emoji:'🚀',cost:200,color:'#e67e22',dmg:65,range:110,rate:0.5,splashR:65,slow:0, w:2, h:2},
  {name:'เทสล่า(สายฟ้า)',emoji:'⚡',cost:220,color:'#3498db',dmg:40,range:85,rate:1.5,splashR:45,slow:0, w:2, h:2},
  {name:'แอลเดอร์(เวท)',emoji:'🪄',cost:300,color:'#9b59b6',dmg:100,range:120,rate:1.2,splashR:0,slow:0, w:2, h:2},
];

const UPGRADE_MULT=[1,1.6,2.5,3.8]; // Slightly steeper power curve for upgrades
const UPGRADE_COST=[0,100,180,300]; // ปรับราคาอัปเกรดให้แพงขึ้นในช่วงหลัง (ดึงเงินออกจากระบบ)
const WAVE_COUNTS=[6,8,12,15,20,25,30,35,45,50]; // เพิ่มจำนวนมอนสเตอร์ให้ป้อมตีหมู่มีประโยชน์
const WAVE_HP=[1,1.2,1.5,1.9,2.5,3.2,4.2,5.5,7.0,9.5]; // ปรับการเพิ่มเลือดให้ค่อยๆ ชันขึ้น