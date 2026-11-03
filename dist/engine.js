export const WORLD = 2800;
export const RUIN_SITES = [{x:700,y:700},{x:2100,y:700},{x:2100,y:2100},{x:700,y:2100}];
export const BOSS_FIRST_SPAWN = 75;
export const BOSS_RESPAWN = 150;
export const BOSS_WARNING = 10;
export const BOSS_TYPES = {
  warden:{name:'Penjaga Rimba Purba',color:'#a2bd87',accent:'#f3cb87',hp:1200,speed:90,range:145,damage:40,cooldown:3.4,windup:1.2,attack:'slam',label:'HENTAKAN',hint:'Keluar dari lingkaran!',look:'Golem berlumut dengan tanduk dan inti kristal.'},
  frost:{name:'Ratu Embun Beku',color:'#a2dbea',accent:'#b5f1ff',hp:1050,speed:105,range:170,damage:28,cooldown:3.2,windup:1.5,attack:'frost',label:'NOVA ES',hint:'Keluar dari lingkaran es!',look:'Ratu es bersayap kristal dan mahkota salju.'},
  ember:{name:'Naga Bara',color:'#dc8c62',accent:'#ffb076',hp:1400,speed:80,range:235,damage:52,cooldown:3.8,windup:1.4,attack:'cone',halfAngle:.65,label:'SEMBURAN API',hint:'Geser ke samping kerucut!',look:'Naga merah dengan sayap lebar, ekor, dan tanduk.'},
  void:{name:'Mata Kehampaan',color:'#b18add',accent:'#d8b5ff',hp:1100,speed:110,range:245,innerRange:165,damage:44,cooldown:3.5,windup:1.6,attack:'ring',label:'CINCIN VOID',hint:'Masuk ke tengah atau keluar cincin!',look:'Mata melayang dengan tentakel dan satelit ungu.'},
};
export function bossDefinition(actor){return BOSS_TYPES[actor.bossType]||BOSS_TYPES.warden;}
// Geometry is shared by server damage and the client telegraph.
export function bossAttackHits(boss,target,time){
  const def=bossDefinition(boss),r=actorStats(target,time).radius,dx=target.x-boss.x,dy=target.y-boss.y,d=Math.hypot(dx,dy);
  if(d>def.range+r)return false;
  if(def.attack==='ring')return d+r>=def.innerRange;
  if(def.attack==='cone'){
    const angle=angleDiff(Math.atan2(dy,dx),boss.attackAngle);
    if(Math.abs(angle)<=def.halfAngle)return true;
    const edge=boss.attackAngle+Math.sign(angle)*def.halfAngle,projection=clamp(dx*Math.cos(edge)+dy*Math.sin(edge),0,def.range);
    return Math.hypot(dx-Math.cos(edge)*projection,dy-Math.sin(edge)*projection)<=r;
  }
  return true;
}
export const COLORS = ['#e6b56e', '#a6c8d5', '#bd9dd1', '#da8d80', '#b4cb83'];
export const STAGES = [
  {name:'Perintis',weapon:'Tongkat kayu',xp:0,accent:'#d4b484',look:'Rambut liar dan tunik sederhana',form:'scout',arm:'club'},
  {name:'Petarung',weapon:'Gada batu',xp:180,accent:'#e6a375',look:'Ikat kepala dan balutan tinju',form:'brawler',arm:'mace'},
  {name:'Viking',weapon:'Kapak perang',xp:450,accent:'#d8d0ae',look:'Helm tanduk dan mantel bulu',form:'viking',arm:'axe'},
  {name:'Ksatria',weapon:'Pedang baja',xp:900,accent:'#a8cedd',look:'Helm baja, jambul, dan jubah biru',form:'knight',arm:'sword'},
  {name:'Samurai',weapon:'Katana',xp:1550,accent:'#e69b8a',look:'Kabuto sabit dan pelindung bahu merah',form:'samurai',arm:'katana'},
  {name:'Titan',weapon:'Palu legenda',xp:2400,accent:'#d6bf7a',look:'Bahu batu dan retakan kristal',form:'titan',arm:'hammer'},
  {name:'Penjaga Rimba',weapon:'Tombak akar',xp:3500,accent:'#a8da8e',look:'Tanduk bercabang dan mantel daun',form:'warden',arm:'spear'},
  {name:'Assassin Senja',weapon:'Sabit bayangan',xp:4900,accent:'#b8a1e0',look:'Tudung gelap dan syal bercabang',form:'assassin',arm:'scythe'},
  {name:'Penyihir Rune',weapon:'Tongkat kristal',xp:6500,accent:'#91dfea',look:'Topi runcing dan lingkar rune',form:'mage',arm:'staff'},
  {name:'Ksatria Naga',weapon:'Tombak naga',xp:8400,accent:'#dc987e',look:'Sayap bersisik dan helm bertanduk',form:'dragon',arm:'trident'},
  {name:'Phoenix',weapon:'Bilah surya',xp:10600,accent:'#ffc376',look:'Sayap bulu api dan ekor bercabang',form:'phoenix',arm:'flame'},
  {name:'Penguasa Astral',weapon:'Tombak bintang',xp:13200,accent:'#e2c8ff',look:'Mahkota melayang dan satelit kristal',form:'astral',arm:'star'},
];
export const POWER_UPS = {
  thunder: { name: 'Palu Petir', slot: 'weapon', duration: 14, color: '#f6d878', icon: 'ϟ', description: 'Damage +65%, jangkauan +25%; ayunan lebih lambat.' },
  frost: { name: 'Pedang Es', slot: 'weapon', duration: 14, color: '#9de4f0', icon: '❄', description: 'Damage +15%, jangkauan +18; lawan melambat 1,5 detik.' },
  wind: { name: 'Langkah Angin', slot: 'skill', duration: 10, color: '#bce99c', icon: '»', description: 'Gerak +40%, cooldown dash menjadi 1,6 detik.' },
  shield: { name: 'Perisai Rimba', slot: 'skill', duration: 12, color: '#d2b1ed', icon: '◇', description: 'Mengurangi damage pukulan sebesar 50%.' },
};
export const PICKUP_LIMIT = 6;
export const PICKUP_INTERVAL = 8;
export const PICKUP_LIFETIME = 35;
export const TIERS = {
  common: {name:'Common',color:'#b9c1cb',weight:45},
  uncommon: {name:'Uncommon',color:'#8dd58a',weight:28},
  rare: {name:'Rare',color:'#76b9ef',weight:17},
  epic: {name:'Epic',color:'#c598ed',weight:8},
  legendary: {name:'Legendary',color:'#f4c96b',weight:2},
};
export const INVENTORY_CAPACITY = 16;
export const EQUIPMENT = {
  iron_blade:{name:'Pedang Besi',slot:'weapon',tier:'common',asset:'iron_blade',shape:'sword',damage:8},
  long_spear:{name:'Tombak Pemburu',slot:'weapon',tier:'uncommon',asset:'long_spear',shape:'spear',damage:3,range:18},
  iron_armor:{name:'Armor Besi',slot:'armor',tier:'common',asset:'iron_armor',material:'plate',hp:35,reduction:.1},
  light_armor:{name:'Armor Ringan',slot:'armor',tier:'common',asset:'light_armor',material:'leather',hp:20,speed:8},
  swift_boots:{name:'Sepatu Pelari',slot:'boots',tier:'common',asset:'swift_boots',speed:25},
  war_boots:{name:'Sepatu Tempur',slot:'boots',tier:'uncommon',asset:'war_boots',speed:10,damage:4},
  ember_axe:{name:'Kapak Bara',slot:'weapon',tier:'rare',asset:'ember_axe',shape:'axe',damage:15,range:6},
  durendal:{name:'Durendal',slot:'weapon',tier:'epic',asset:'iron_blade',shape:'sword',damage:20,range:10},
  excalibur:{name:'Excalibur',slot:'weapon',tier:'legendary',asset:'iron_blade',shape:'sword',damage:27,range:16},
  gungnir:{name:'Gungnir',slot:'weapon',tier:'legendary',asset:'long_spear',shape:'spear',damage:16,range:34},
  ranger_vest:{name:'Jubah Penjaga Rimba',slot:'armor',tier:'uncommon',asset:'light_armor',material:'leather',hp:28,speed:12},
  bastion_plate:{name:'Bastion',slot:'armor',tier:'rare',asset:'iron_armor',material:'plate',hp:48,reduction:.14},
  runic_mail:{name:'Runekeeper',slot:'armor',tier:'epic',asset:'iron_armor',material:'plate',hp:60,reduction:.18},
  sovereign_plate:{name:'Mahkota Fajar',slot:'armor',tier:'legendary',asset:'iron_armor',material:'plate',hp:75,reduction:.23},
  whisper_boots:{name:'Jejak Senyap',slot:'boots',tier:'uncommon',asset:'swift_boots',speed:28},
  storm_boots:{name:'Langkah Badai',slot:'boots',tier:'rare',asset:'war_boots',speed:30,damage:5},
  void_boots:{name:'Penjelajah Senja',slot:'boots',tier:'epic',asset:'swift_boots',speed:36,damage:7},
  dawn_boots:{name:'Jejak Sang Fajar',slot:'boots',tier:'legendary',asset:'war_boots',speed:42,damage:10},
  nature_aura:{name:'Nature Aura',slot:'aura',tier:'uncommon',asset:'nature_aura',auraStyle:'nature',auraColor:'#a8ed8c',look:'Daun hijau mengorbit dalam napas cahaya rimba.',hp:25,reduction:.05},
  wisdom_aura:{name:'Wisdom Aura',slot:'aura',tier:'rare',asset:'wisdom_aura',auraStyle:'wisdom',auraColor:'#81e1fa',look:'Lingkar rune biru berputar mengelilingi tubuh.',range:12,hp:20},
  frost_aura:{name:'Frost Aura',slot:'aura',tier:'rare',asset:'frost_aura',auraStyle:'frost',auraColor:'#c5f4ff',look:'Enam kristal es melayang dalam lingkar embun.',hp:20,reduction:.08},
  saiyan_aura:{name:'Saiyan Aura',slot:'aura',tier:'epic',asset:'saiyan_aura',auraStyle:'saiyan',auraColor:'#ffda63',look:'Lidah energi emas menjulang dengan kilatan petir.',damage:12,speed:12},
  void_aura:{name:'Void Aura',slot:'aura',tier:'epic',asset:'void_aura',auraStyle:'void',auraColor:'#c89aff',look:'Pusaran ungu dengan tiga sabit energi dan satelit.',damage:8,speed:18},
  celestial_aura:{name:'Celestial Aura',slot:'aura',tier:'legendary',asset:'celestial_aura',auraStyle:'celestial',auraColor:'#fff0b3',look:'Halo keemasan dengan bintang putih yang mengorbit.',hp:40,damage:12,reduction:.08},
};
for(const item of Object.values(EQUIPMENT)){
  item.color=TIERS[item.tier].color;item.icon=item.slot==='weapon'?'⚔':item.slot==='armor'?'◇':item.slot==='aura'?'✺':'»';
  item.description=[item.damage&&'Damage +'+item.damage,item.range&&'Jangkauan +'+item.range,item.hp&&'HP maks. +'+item.hp,item.speed&&'Gerak +'+item.speed,item.reduction&&'Damage masuk −'+Math.round(item.reduction*100)+'%'].filter(Boolean).join(' · ');
}
export const GEAR_SLOTS = ['weapon','armor','boots','aura'];
export const XP_DECAY_INTERVAL = 30;
export const XP_DECAY_RATE = .05;
const BOT_NAMES = ['Moss Boss','Si Paling Bonk','Oakley','Batu Akik','Little Menace','Kang Pukul','Fern','Cilok Gaming','Grizzly','Pohon Berjalan','Bramble','Bonk Jovi','Rimba','Tukang Dash','Pebble','Bukan NPC','Acorn','Si Gesit','Lumut','Mochi','Tanduk','Bang Gada'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const angleDiff = (a,b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));
export function seededRandom(seed = 7931) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function stageFor(xp) { let n = 0; while (n < STAGES.length-1 && xp >= STAGES[n+1].xp) n++; return n; }
export function stats(level) {
  const n=clamp(Math.floor(level),0,STAGES.length-1);
  return {radius:20+n*2.2,speed:205-n*5.5,hp:100+n*22,range:63+n*8,damage:29+n*6,cooldown:.56+n*.027};
}
export function activePower(actor, slot, time) {
  const power = actor[slot];
  return power && power.expiresAt > time ? POWER_UPS[power.type] : null;
}
export function actorStats(actor, time) {
  if(actor.isBoss){const def=bossDefinition(actor);return {radius:48,speed:def.speed*(actor.slowUntil>time?.62:1),hp:actor.bossMaxHP,range:def.range,damage:def.damage,cooldown:def.cooldown,damageTaken:1,knockback:25,dashCooldown:3};}
  const result = { ...stats(actor.level), damageTaken: 1, knockback: 15, dashCooldown: 3 };
  for(const slot of GEAR_SLOTS){const item=EQUIPMENT[actor.equipment?.[slot]];if(!item||item.slot!==slot)continue;for(const key of ['damage','range','hp','speed'])result[key]+=item[key]||0;result.damageTaken*=1-(item.reduction||0);}
  const weapon = activePower(actor, 'weapon', time), skill = activePower(actor, 'skill', time);
  if (weapon === POWER_UPS.thunder) { result.damage *= 1.65; result.range *= 1.25; result.cooldown *= 1.15; result.knockback = 27; }
  if (weapon === POWER_UPS.frost) { result.damage *= 1.15; result.range += 18; }
  if (skill === POWER_UPS.wind) { result.speed *= 1.4; result.dashCooldown = 1.6; }
  if (skill === POWER_UPS.shield) result.damageTaken *= .5;
  if (actor.slowUntil > time) result.speed *= .62;
  return result;
}

export class Arena {
  constructor({ seed = 7931, random = Math.random, botCount = 22, orbCount = 420 } = {}) {
    this.random = random; this.botCount = botCount; this.orbCount = orbCount; this.nextId = 1;
    this.time = 0; this.actors = []; this.orbs = []; this.events = []; this.player = null;
    this.nextBossAt=BOSS_FIRST_SPAWN;this.bossSite=null;this.nextBossType='warden';this.previousBossSite=null;this.bossWarned=false;
    this.gearLoot = []; this.nextGearId = 1; this.nextGearAt = 10;
    this.pickups = []; this.nextPickupId = 1; this.nextPickupAt = PICKUP_INTERVAL;
    this.obstacles = []; const rand = seededRandom(seed);
    const obstacleTypes=['tree','tree','rock','pine','stump','log','ruin','crystal','mushroom','thorn'];
    for (let i=0; i<180; i++) {
      const x = 110 + rand() * (WORLD-220), y = 110 + rand() * (WORLD-220);
      if (Math.hypot(x-WORLD/2,y-WORLD/2)<270 || RUIN_SITES.some(p=>Math.hypot(x-p.x,y-p.y)<250) || this.obstacles.some(o=>Math.hypot(x-o.x,y-o.y)<125)) continue;
      this.obstacles.push({ x,y,r:25+rand()*15,type:obstacleTypes[Math.floor(rand()*obstacleTypes.length)],variation:rand() });
    }
  }
  freePoint(awayFrom = null, minDistance = 0) {
    for(let i=0;i<300;i++) {
      const p = {x:70+this.random()*(WORLD-140),y:70+this.random()*(WORLD-140)};
      if(awayFrom && Math.hypot(p.x-awayFrom.x,p.y-awayFrom.y)<minDistance) continue;
      if(!this.obstacles.some(o=>Math.hypot(p.x-o.x,p.y-o.y)<o.r+45)) return p;
    }
    return {x:WORLD/2,y:WORLD/2};
  }
  actor(name, color, xp = 0, isPlayer = false) {
    const level = stageFor(xp); const p = isPlayer ? {x:WORLD/2,y:WORLD/2}:this.freePoint({x:WORLD/2,y:WORLD/2},330);
    return { id:this.nextId++, name,color,xp,level,isPlayer,...p,angle:this.random()*Math.PI*2,hp:stats(level).hp,kills:0,alive:true,cooldown:0,dashCooldown:0,dashTime:0,dashAngle:0,attackTime:0,attackAngle:0,attackHits:new Set(),invulnerable:isPlayer?3:1,hitFlash:0,windup:0,target:null,think:0,walking:0,regen:0,respawn:0,weapon:null,skill:null,slowUntil:0,inventory:[],equipment:Object.fromEntries(GEAR_SLOTS.map(slot=>[slot,null])),nextDecayAt:this.time+XP_DECAY_INTERVAL,peakXP:xp,maxLevelReached:level };
  }
  reset(name='Petualang',color=COLORS[0]) {
    this.time=0; this.events=[]; this.orbs=[]; this.actors=[];
    this.gearLoot=[];this.nextGearId=1;this.nextGearAt=10;
    this.nextBossAt=BOSS_FIRST_SPAWN;this.bossSite=null;this.previousBossSite=null;this.bossWarned=false;
    this.pickups=[];this.nextPickupId=1;this.nextPickupAt=PICKUP_INTERVAL;
    this.player=this.actor(name,color,0,true);this.actors.push(this.player);
    for(let i=0;i<this.botCount;i++) this.actors.push(this.actor(BOT_NAMES[i % BOT_NAMES.length],COLORS[i%COLORS.length],Math.floor(this.random()*380)));
    this.planBoss();
    for(let i=0;i<this.orbCount;i++) this.addOrb(this.freePoint());
    // A small opening trail helps new players discover XP without a tutorial wall.
    for(let i=0;i<12;i++){ const a=i*Math.PI/6; this.addOrb({x:WORLD/2+Math.cos(a)*105,y:WORLD/2+Math.sin(a)*105},9); }
    for(let i=0;i<6;i++)this.spawnGear(null,{x:WORLD/2+Math.cos(i*Math.PI/3)*450,y:WORLD/2+Math.sin(i*Math.PI/3)*450});
    const kinds=Object.keys(POWER_UPS);
    for(let i=0;i<PICKUP_LIMIT;i++)this.spawnPickup(kinds[i%kinds.length],i<4?{x:WORLD/2+Math.cos(i*Math.PI/2)*310,y:WORLD/2+Math.sin(i*Math.PI/2)*310}:null);
  }
  chooseBossSite(previous=this.previousBossSite) {
    const safe=p=>Math.hypot(p.x-WORLD/2,p.y-WORLD/2)>=320
      &&(!previous||Math.hypot(p.x-previous.x,p.y-previous.y)>=450)
      &&!this.obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+125)
      &&!this.actors.some(a=>a.alive&&!a.isBoss&&Math.hypot(a.x-p.x,a.y-p.y)<180);
    for(let i=0;i<800;i++){
      const point={x:280+this.random()*(WORLD-560),y:280+this.random()*(WORLD-560)};
      if(safe(point))return point;
    }
    // Bounded fallback for unusual random sources; never put a boss inside a prop.
    const side=29,start=Math.floor(this.random()*side*side);
    for(let i=0;i<side*side;i++){const n=(start+i)%(side*side),point={x:280+n%side*80,y:280+Math.floor(n/side)*80};if(safe(point))return point;}
    return null;
  }
  planBoss(previous=null) {
    this.previousBossSite=previous?{x:previous.homeX,y:previous.homeY}:null;
    const types=Object.keys(BOSS_TYPES).filter(type=>type!==previous?.bossType);
    this.nextBossType=types[Math.floor(this.random()*types.length)];
    this.bossSite=this.chooseBossSite();this.bossWarned=false;
  }
  spawnBoss() {
    if(this.actors.some(a=>a.isBoss&&a.alive))return;
    if(!this.bossSite)return;
    this.actors=this.actors.filter(a=>!a.isBoss);
    const def=BOSS_TYPES[this.nextBossType],boss=this.actor(def.name,def.color);
    const humans=Math.max(1,this.actors.filter(a=>a.isPlayer).length);
    Object.assign(boss,{...this.bossSite,isBoss:true,bossType:this.nextBossType,bossMaxHP:def.hp+(humans-1)*300,homeX:this.bossSite.x,homeY:this.bossSite.y,cooldown:2,invulnerable:1.5});
    boss.hp=boss.bossMaxHP;this.actors.push(boss);this.nextBossAt=null;
    this.events.push({type:'boss_spawn',actor:boss,x:boss.x,y:boss.y});
  }
  bossInput(boss,dt) {
    const def=bossDefinition(boss);
    if(boss.slamUntil>this.time)return;
    if(boss.windup>0){
      boss.windup=Math.max(0,boss.windup-dt);
      if(boss.windup===0){
        // Keep the impact origin so visual trails remain in place after movement
        // and can be reconstructed from a snapshot, including on reconnect.
        boss.castTime=this.time;boss.castX=boss.x;boss.castY=boss.y;boss.castAngle=boss.attackAngle;
        boss.slamUntil=this.time+.4;
        boss.cooldown=actorStats(boss,this.time).cooldown;
        for(const target of this.actors){
          if(target===boss||!target.alive||target.isBoss)continue;
          if(bossAttackHits(boss,target,this.time))this.hit(boss,target);
        }
        this.events.push({type:'boss_slam',actor:boss,x:boss.x,y:boss.y});
      }
      return;
    }
    let target=null,distance=420;
    for(const a of this.actors){if(!a.alive||a.isBoss)continue;const d=Math.hypot(a.x-boss.x,a.y-boss.y);if(d<distance){target=a;distance=d;}}
    if(!target)return;
    boss.angle=Math.atan2(target.y-boss.y,target.x-boss.x);
    if(distance<def.range+25&&boss.cooldown<=0){boss.windup=def.windup;boss.attackAngle=boss.angle;return;}
    if(distance>90){
      const step=actorStats(boss,this.time).speed*dt;
      for(const offset of [0,.6,-.6,1.2,-1.2]){
        const angle=boss.angle+offset,x=boss.x+Math.cos(angle)*step,y=boss.y+Math.sin(angle)*step;
        if(Math.hypot(x-boss.homeX,y-boss.homeY)>160||this.obstacles.some(o=>Math.hypot(x-o.x,y-o.y)<o.r+49))continue;
        this.move(boss,Math.cos(angle),Math.sin(angle),dt);break;
      }
    }
  }
  defeatBoss(boss,attacker) {
    if(!boss.alive)return;
    boss.alive=false;boss.hp=0;boss.windup=0;
    this.nextBossAt=this.time+BOSS_RESPAWN;this.bossWarned=false;
    this.planBoss(boss);
    const chosen=new Set();
    for(let i=0;i<3;i++){
      const roll=this.random(),tier=i===0?(roll<.2?'legendary':'epic'):(roll<.1?'legendary':roll<.45?'epic':'rare');
      const pool=Object.keys(EQUIPMENT).filter(key=>EQUIPMENT[key].tier===tier&&!chosen.has(key));
      const type=pool[Math.floor(this.random()*pool.length)];chosen.add(type);
      // Search locally, so a full arena or an obstructed drop never sends rewards across the map.
      let point={x:boss.x,y:boss.y};
      for(let j=0;j<160;j++){
        const angle=j*2.399963+i*2.1,radius=65+Math.floor(j/16)*17;
        const p={x:boss.x+Math.cos(angle)*radius,y:boss.y+Math.sin(angle)*radius};
        if(p.x<30||p.y<30||p.x>WORLD-30||p.y>WORLD-30||this.obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+48)||this.gearLoot.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<40))continue;
        point=p;break;
      }
      if(this.gearLoot.length>=10)this.gearLoot.shift();
      this.gearLoot.push({id:this.nextGearId++,type,...point,expiresAt:this.time+90,bossReward:true});
    }
    if(!attacker.isBoss)this.gainXP(attacker,300);
    this.events.push({type:'boss_defeated',actor:boss,attacker,x:boss.x,y:boss.y,value:300});
  }
  spawnGear(type=null,preferred=null) {
    if(this.gearLoot.length>=10)return;
    if(!type){
      let roll=this.random()*100,tier='common';
      for(const [key,entry] of Object.entries(TIERS)){roll-=entry.weight;if(roll<0){tier=key;break;}}
      const types=Object.keys(EQUIPMENT).filter(key=>EQUIPMENT[key].tier===tier);type=types[Math.floor(this.random()*types.length)];
    }
    if(!Object.hasOwn(EQUIPMENT,type))return;
    for(let i=0;i<60;i++){
      const p=i===0&&preferred?preferred:this.freePoint();
      if(this.obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+50)||this.gearLoot.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<65))continue;
      this.gearLoot.push({id:this.nextGearId++,type,x:p.x,y:p.y,expiresAt:this.time+60});return;
    }
  }
  equip(a,type,remove=false) {
    if(!a.alive||typeof type!=='string'||!Object.hasOwn(EQUIPMENT,type)||!a.inventory.includes(type))return false;
    const slot=EQUIPMENT[type].slot;
    if(remove&&a.equipment[slot]!==type)return false;
    a.equipment[slot]=remove?null:type;
    // Equipping never heals; changing gear cannot manufacture health.
    a.hp=Math.min(a.hp,actorStats(a,this.time).hp);return true;
  }
  dropEquipment(a,type) {
    if(!a.alive||typeof type!=='string'||!Object.hasOwn(EQUIPMENT,type)||!a.inventory.includes(type))return false;
    let point=null;
    for(let i=0;i<16;i++){
      const angle=a.angle+i*Math.PI/8,distance=stats(a.level).radius+52;
      const p={x:clamp(a.x+Math.cos(angle)*distance,30,WORLD-30),y:clamp(a.y+Math.sin(angle)*distance,30,WORLD-30)};
      if(this.obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+30))continue;
      if(this.gearLoot.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<25))continue;
      point=p;break;
    }
    if(!point)return false;
    if(this.gearLoot.length>=10)this.gearLoot.shift();
    this.gearLoot.push({id:this.nextGearId++,type,...point,expiresAt:this.time+60,droppedBy:a.id,ownerPickupAt:this.time+3});
    const slot=EQUIPMENT[type].slot;if(a.equipment[slot]===type)a.equipment[slot]=null;
    a.inventory=a.inventory.filter(key=>key!==type);a.hp=Math.min(a.hp,actorStats(a,this.time).hp);return true;
  }
  collectGear(a,loot) {
    const index=this.gearLoot.indexOf(loot);
    if(index<0||!a.alive||a.isBoss||a.inventory.includes(loot.type)||a.inventory.length>=INVENTORY_CAPACITY||(loot.droppedBy===a.id&&loot.ownerPickupAt>this.time))return;
    a.inventory.push(loot.type);this.gearLoot.splice(index,1);
    if(!a.isPlayer&&!a.equipment[EQUIPMENT[loot.type].slot])this.equip(a,loot.type);
    this.events.push({type:'gear_loot',actor:a,gearType:loot.type,x:loot.x,y:loot.y});
  }
  decayXP(a) {
    if(this.time<a.nextDecayAt)return;
    a.nextDecayAt+=XP_DECAY_INTERVAL;
    const loss=Math.min(a.xp,Math.ceil(a.xp*XP_DECAY_RATE));if(!loss)return;
    a.xp-=loss;const oldLevel=a.level;a.level=stageFor(a.xp);a.hp=Math.min(a.hp,actorStats(a,this.time).hp);
    this.events.push({type:'xp_decay',actor:a,value:loss,demoted:a.level<oldLevel});
  }
  spawnPickup(type = null, preferred = null) {
    if(this.pickups.length>=PICKUP_LIMIT)return;
    const kinds=Object.keys(POWER_UPS);
    type=type||kinds[Math.floor(this.random()*kinds.length)];
    if(!POWER_UPS[type])return;
    for(let attempt=0;attempt<80;attempt++){
      const p=attempt===0&&preferred?preferred:this.freePoint();
      if(this.obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+55))continue;
      if(this.pickups.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<150))continue;
      if(this.actors.some(a=>a.alive&&Math.hypot(a.x-p.x,a.y-p.y)<90))continue;
      this.pickups.push({id:this.nextPickupId++,type,x:p.x,y:p.y,expiresAt:this.time+PICKUP_LIFETIME});
      return;
    }
  }
  collectPickup(actor, pickup) {
    const index=this.pickups.indexOf(pickup),power=POWER_UPS[pickup.type];
    if(index<0||!actor.alive||actor.isBoss||!power||pickup.expiresAt<=this.time)return;
    const previous=actor[power.slot]?.type;
    actor[power.slot]={type:pickup.type,expiresAt:this.time+power.duration};
    if(pickup.type==='wind')actor.dashCooldown=Math.min(actor.dashCooldown,1.6);
    this.pickups.splice(index,1);
    this.events.push({type:'powerup',actor,powerType:pickup.type,replaced:previous&&previous!==pickup.type,x:pickup.x,y:pickup.y});
  }
  addOrb(p,value=7+Math.floor(this.random()*7)) { this.orbs.push({x:p.x,y:p.y,value,phase:this.random()*Math.PI*2,color:Math.floor(this.random()*4)}); }
  gainXP(a,value) {
    if(a.isBoss)return;
    a.xp+=value;a.peakXP=Math.max(a.peakXP||0,a.xp);const level=stageFor(a.xp);
    if(level>a.level){a.level=level;if(level>(a.maxLevelReached||0)){a.hp=actorStats(a,this.time).hp;a.maxLevelReached=level;}this.events.push({type:'evolve',actor:a});}
  }
  attack(a) {
    if(!a.alive || a.cooldown>0 || a.attackTime>0) return false;
    a.cooldown=actorStats(a,this.time).cooldown;a.attackTime=.3;a.attackAngle=a.angle;a.attackHits.clear();a.windup=0;
    this.events.push({type:'swing',actor:a});return true;
  }
  dash(a,angle=a.angle) {
    if(!a.alive || a.dashCooldown>0) return false;
    a.dashCooldown=actorStats(a,this.time).dashCooldown;a.dashTime=.18;a.dashAngle=angle;a.invulnerable=Math.max(a.invulnerable,.23);
    this.events.push({type:'dash',actor:a});return true;
  }
  move(a,dx,dy,dt,speed=actorStats(a,this.time).speed) {
    const s=actorStats(a,this.time);a.x=clamp(a.x+dx*dt*speed,s.radius,WORLD-s.radius);a.y=clamp(a.y+dy*dt*speed,s.radius,WORLD-s.radius);
    if(a.isBoss){const distance=Math.hypot(a.x-a.homeX,a.y-a.homeY);if(distance>160){a.x=a.homeX+(a.x-a.homeX)/distance*160;a.y=a.homeY+(a.y-a.homeY)/distance*160;}}
    for(const o of this.obstacles){const d=Math.hypot(a.x-o.x,a.y-o.y),r=o.r+s.radius;if(d<r){const angle=d>.001?Math.atan2(a.y-o.y,a.x-o.x):0;a.x=o.x+Math.cos(angle)*r;a.y=o.y+Math.sin(angle)*r;}}
    if(dx||dy)a.walking+=dt*10;
  }
  botInput(a,dt) {
    a.think-=dt;
    if(a.think<=0){
      a.think=.25+this.random()*.25;
      let nearest=null,dist=330;
      for(const b of this.actors){if(b===a||!b.alive||b.invulnerable>0)continue;const d=Math.hypot(b.x-a.x,b.y-a.y);if(d<dist){dist=d;nearest=b;}}
      if(nearest && (dist<150 || a.hp>stats(a.level).hp*.4))a.target={type:'actor',ref:nearest};
      else { let orb=null,od=Infinity;for(const o of this.orbs){const d=(o.x-a.x)**2+(o.y-a.y)**2;if(d<od){od=d;orb=o;}}a.target=orb?{type:'orb',ref:orb}:null; }
      if(!nearest||dist>180){
        let closest=null,best=280;
        for(const pickup of this.pickups){const power=POWER_UPS[pickup.type];if(activePower(a,power.slot,this.time))continue;const d=Math.hypot(pickup.x-a.x,pickup.y-a.y);if(d<best){best=d;closest=pickup;}}
        if(closest)a.target={type:'pickup',ref:closest};
      }
    }
    if(!a.target)return;
    const target=a.target.ref;if(a.target.type==='actor'&&!target.alive){a.think=0;return;}
    if(a.target.type==='pickup'&&!this.pickups.includes(target)){a.think=0;a.target=null;return;}
    const angle=Math.atan2(target.y-a.y,target.x-a.x),d=Math.hypot(target.x-a.x,target.y-a.y);
    a.angle+=angleDiff(angle,a.angle)*Math.min(1,dt*9);
    let dir=1;
    if(a.target.type==='actor'){
      const s=actorStats(a,this.time),flee=(a.hp<s.hp*.3||target.level>a.level+1);
      if(flee) { dir=-1; if(d<100&&a.dashCooldown<=0)this.dash(a,angle+Math.PI); }
      else if(d<s.range+actorStats(target,this.time).radius-8){dir=a.cooldown>.2?-.4:.15;if(a.cooldown<=0&&a.windup<=0)a.windup=.26;}
    }
    if(a.windup>0){a.windup-=dt;if(a.windup<=0)this.attack(a);dir*=.3;}
    if(d>6)this.move(a,Math.cos(angle)*dir,Math.sin(angle)*dir,dt,actorStats(a,this.time).speed*.87);
  }
  hit(attacker,target) {
    if(!target.alive||target.invulnerable>0)return;
    const attackStats=actorStats(attacker,this.time);
    const damage=Math.round(attackStats.damage*actorStats(target,this.time).damageTaken);target.hp-=damage;target.hitFlash=.15;target.regen=0;
    if(activePower(attacker,'weapon',this.time)===POWER_UPS.frost)target.slowUntil=this.time+1.5;
    if(attacker.isBoss&&bossDefinition(attacker).attack==='frost')target.slowUntil=Math.max(target.slowUntil||0,this.time+2);
    const angle=Math.atan2(target.y-attacker.y,target.x-attacker.x);this.move(target,Math.cos(angle),Math.sin(angle),1,target.isBoss?0:attackStats.knockback);
    this.events.push({type:'hit',actor:target,attacker,damage,x:target.x,y:target.y});
    if(target.hp<=0){
      if(target.isBoss){this.defeatBoss(target,attacker);return;}
      for(const [index,type] of Object.values(target.equipment).entries())if(type){if(this.gearLoot.length>=10)this.gearLoot.shift();const angle=index*Math.PI*2/GEAR_SLOTS.length;this.spawnGear(type,{x:clamp(target.x+Math.cos(angle)*65,60,WORLD-60),y:clamp(target.y+Math.sin(angle)*65,60,WORLD-60)});}
      target.inventory=[];target.equipment=Object.fromEntries(GEAR_SLOTS.map(slot=>[slot,null]));
      target.hp=0;target.alive=false;target.respawn=3;target.weapon=null;target.skill=null;target.slowUntil=0;attacker.kills++;this.gainXP(attacker,45+target.level*30);
      for(let i=0;i<12;i++){const angle=this.random()*Math.PI*2,dist=20+this.random()*65;this.addOrb({x:clamp(target.x+Math.cos(angle)*dist,20,WORLD-20),y:clamp(target.y+Math.sin(angle)*dist,20,WORLD-20)},8+target.level*3);}
      this.events.push({type:'kill',actor:target,attacker});
    }
  }
  update(dt,input={}) {
    dt=clamp(dt,0,.05);this.time+=dt;
    if(this.nextBossAt!==null){
      if(!this.bossSite&&this.time>=this.nextBossAt-BOSS_WARNING){this.bossSite=this.chooseBossSite();this.nextBossAt=this.time+BOSS_WARNING+(this.bossSite?0:5);}
      if(this.bossSite&&!this.bossWarned&&this.time>=this.nextBossAt-BOSS_WARNING){this.bossWarned=true;this.events.push({type:'boss_warning',bossType:this.nextBossType,...this.bossSite});}
      if(this.bossSite&&this.time>=this.nextBossAt)this.spawnBoss();
    }
    this.gearLoot=this.gearLoot.filter(p=>p.expiresAt>this.time);
    if(this.time>=this.nextGearAt){this.spawnGear();this.nextGearAt=this.time+10;}
    this.pickups=this.pickups.filter(p=>p.expiresAt>this.time);
    if(this.time>=this.nextPickupAt){this.spawnPickup();this.nextPickupAt=this.time+PICKUP_INTERVAL;}
    // Expire everyone before combat, independent of actor iteration order.
    for(const a of this.actors)for(const slot of ['weapon','skill'])if(a[slot]?.expiresAt<=this.time)a[slot]=null;
    for(const a of this.actors){
      if(a.isBoss){if(a.alive){a.cooldown=Math.max(0,a.cooldown-dt);a.invulnerable=Math.max(0,a.invulnerable-dt);a.hitFlash=Math.max(0,a.hitFlash-dt);this.bossInput(a,dt);}continue;}
      if(!a.alive){if(!a.isPlayer){a.respawn-=dt;if(a.respawn<=0){const fresh=this.actor(a.name,a.color,Math.floor(this.random()*180));Object.assign(a,fresh);const p=this.freePoint(this.player,350);a.x=p.x;a.y=p.y;}}continue;}
      this.decayXP(a);
      a.cooldown=Math.max(0,a.cooldown-dt);a.dashCooldown=Math.max(0,a.dashCooldown-dt);a.invulnerable=Math.max(0,a.invulnerable-dt);a.hitFlash=Math.max(0,a.hitFlash-dt);
      a.regen+=dt;if(a.regen>5)a.hp=Math.min(actorStats(a,this.time).hp,a.hp+dt*3);
      if(a.isPlayer){
        const controls=input instanceof Map?(input.get(a.id)||{}):input;
        if(Number.isFinite(controls.angle))a.angle=controls.angle;
        let dx=controls.x||0,dy=controls.y||0;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
        if(controls.dash)this.dash(a,len>.1?Math.atan2(dy,dx):a.angle);
        if(controls.attack)this.attack(a);
        if(a.dashTime<=0)this.move(a,dx,dy,dt);
      }else if(a.dashTime<=0)this.botInput(a,dt);
      if(a.dashTime>0){this.move(a,Math.cos(a.dashAngle),Math.sin(a.dashAngle),dt,780);a.dashTime-=dt;}
      if(a.attackTime>0){
        a.attackTime=Math.max(0,a.attackTime-dt);
        const progress=1-a.attackTime/.3,arc=a.attackAngle-1.25+progress*2.5,s=actorStats(a,this.time);
        // Test a swept angular slice each tick, so fast swings cannot skip targets.
        const halfSlice=.36+dt/.3*2.5;
        for(const target of this.actors){
          if(target===a||!target.alive||a.attackHits.has(target.id)||target.invulnerable>0)continue;
          const d=Math.hypot(target.x-a.x,target.y-a.y),r=actorStats(target,this.time).radius;
          if(d<=s.range+r&&Math.abs(angleDiff(Math.atan2(target.y-a.y,target.x-a.x),arc))<halfSlice+Math.asin(Math.min(1,r/Math.max(d,1)))){a.attackHits.add(target.id);this.hit(a,target);}
        }
      }
      for(let i=this.gearLoot.length-1;i>=0;i--){const loot=this.gearLoot[i];if(Math.hypot(loot.x-a.x,loot.y-a.y)<stats(a.level).radius+18)this.collectGear(a,loot);}
      // Removing immediately makes pickup ownership exclusive within this tick.
      for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i];if(Math.hypot(p.x-a.x,p.y-a.y)<stats(a.level).radius+18)this.collectPickup(a,p);}
      for(let i=this.orbs.length-1;i>=0;i--){
        const o=this.orbs[i];const d=Math.hypot(o.x-a.x,o.y-a.y);
        if(d<stats(a.level).radius+11){this.gainXP(a,o.value);this.orbs.splice(i,1);if(a.isPlayer)this.events.push({type:'collect',actor:a,x:o.x,y:o.y,value:o.value});}
        else if(a.isPlayer&&d<80){const f=dt*5;o.x+=(a.x-o.x)*f;o.y+=(a.y-o.y)*f;}
      }
    }
    // Body contact is harmless; weapons and the telegraphed boss slam deal damage.
    for(let i=0;i<this.actors.length;i++)for(let j=i+1;j<this.actors.length;j++){
      const a=this.actors[i],b=this.actors[j];if(!a.alive||!b.alive)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),r=actorStats(a,this.time).radius+actorStats(b,this.time).radius;
      if(d<r){const angle=d>.001?Math.atan2(dy,dx):0,push=(r-d)/(a.isBoss||b.isBoss?1:2);if(!a.isBoss)this.move(a,-Math.cos(angle),-Math.sin(angle),1,push);if(!b.isBoss)this.move(b,Math.cos(angle),Math.sin(angle),1,push);}
    }
    while(this.orbs.length<this.orbCount)this.addOrb(this.freePoint());
  }
  drainEvents(){const events=this.events;this.events=[];return events;}
  ranking(){return this.actors.filter(a=>a.alive&&!a.isBoss).sort((a,b)=>b.xp-a.xp);}
}
