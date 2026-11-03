import { Arena, COLORS, STAGES, WORLD, RUIN_SITES, BOSS_TYPES, bossDefinition, BOSS_WARNING, stats, clamp, seededRandom, angleDiff, EQUIPMENT, TIERS, INVENTORY_CAPACITY, GEAR_SLOTS, XP_DECAY_RATE, POWER_UPS, PICKUP_LIFETIME, activePower, actorStats } from './engine.js';
import { MultiplayerClient } from './network.js';
import { drawBossEffects, drawBossCharge } from './boss-effects.js';
import { createAvatarCustomizer, AvatarTextureCache } from './avatar.js';

const $ = id => document.getElementById(id);
const canvas = $('arena'), ctx = canvas.getContext('2d', {alpha:false});
const avatarCtx = $('avatar').getContext('2d'), mapCtx = $('minimap').getContext('2d');
const arena = new Arena();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchDevice = matchMedia('(pointer: coarse)').matches;
const auraIcons=new Map(Object.entries(EQUIPMENT).filter(([,item])=>item.slot==='aura').map(([type,item])=>{
  const image=new Image();image.src='./assets/equipment/'+item.asset+'.svg';return [type,image];
}));
const keys = new Set();
let width=innerWidth, height=innerHeight, dpr=1, state='lobby', selectedColor=COLORS[0];
let camera={x:WORLD/2,y:WORLD/2}, scale=1, last=0, hudTimer=0, demoTime=0, shake=0;
let particles=[], floaters=[], mouse={x:width/2,y:height/2,active:false,down:false};
let joystick={x:0,y:0,id:null}, touchAttack=false, dashRequested=false, toastTimeout, powerToastTimeout;
let audioContext, soundOn=false, best=0, bestBeforeRun=0;
let mode='online', client=null, joining=false, deathShown=false, lastSequence=-1;
let onlineCounts={humans:0,bots:6}, targets=new Map();
let snapshotReceivedAt=0;
const safeStorage={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{/* Storage is optional. */}}};
best=Number(safeStorage.get('bonk-best'))||0;
$('best-score').textContent=best.toLocaleString('id-ID')+' XP';
$('nickname').value=safeStorage.get('bonk-name')||'';
if(COLORS.includes(safeStorage.get('bonk-color'))) selectedColor=safeStorage.get('bonk-color');
const customAvatar=createAvatarCustomizer(),avatarTextures=new AvatarTextureCache();

function path(points,fill,stroke=null,lineWidth=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
function circle(c,x,y,r,fill,stroke=null,lineWidth=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function rounded(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}

// The complete art set is drawn locally: no image downloads or external licenses.
const terrain=document.createElement('canvas');terrain.width=WORLD;terrain.height=WORLD;
function makeTerrain(){
  const c=terrain.getContext('2d'),rand=seededRandom(642);
  c.fillStyle='#73905a';c.fillRect(0,0,WORLD,WORLD);
  for(let y=0;y<WORLD;y+=80)for(let x=0;x<WORLD;x+=80){c.fillStyle=['#6d8a55','#75935d','#7b975f','#718e58'][Math.floor(rand()*4)];c.globalAlpha=.27;c.fillRect(x,y,80,80);}c.globalAlpha=1;
  for(let i=0;i<120;i++){ellipse(c,rand()*WORLD,rand()*WORLD,50+rand()*200,40+rand()*90,'#81975b22');}
  // Winding footpaths pass through an old circular dueling ground.
  const trail=(color,size)=>{c.strokeStyle=color;c.lineWidth=size;c.lineCap='round';c.beginPath();c.moveTo(-80,1880);c.bezierCurveTo(650,1900,800,1380,1400,1400);c.bezierCurveTo(1960,1430,1820,650,2900,580);c.stroke();c.beginPath();c.moveTo(1130,-100);c.bezierCurveTo(1500,750,1120,1050,1400,1400);c.bezierCurveTo(1750,1840,2270,1930,2210,2890);c.stroke();};
  trail('#81905a',112);trail('#8c9861',91);trail('#939c65',70);
  circle(c,1400,1400,213,'#818f5c');circle(c,1400,1400,190,'#8e9a66');
  c.strokeStyle='#a4ad7c77';c.lineWidth=3;for(const r of [159,174]){c.beginPath();c.arc(1400,1400,r,0,Math.PI*2);c.stroke();}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;c.save();c.translate(1400+Math.cos(a)*190,1400+Math.sin(a)*190);c.rotate(a);rounded(c,-12,-15,24,30,5,'#a2ab7a');c.strokeStyle='#6a7f55';c.lineWidth=2;c.stroke();c.restore();}
  c.save();c.translate(1400,1400);c.rotate(Math.PI/4);rounded(c,-29,-29,58,58,7,'#a5af7f55');rounded(c,-18,-18,36,36,4,'#798d5f66');c.restore();
  for(let i=0;i<7300;i++){const x=rand()*WORLD,y=rand()*WORLD;if(Math.hypot(x-1400,y-1400)<210)continue;c.strokeStyle=rand()>.5?'#526f453a':'#a9ba784c';c.lineWidth=1.4;c.beginPath();c.moveTo(x-3,y);c.lineTo(x-5,y-5);c.moveTo(x,y+1);c.lineTo(x,y-7);c.moveTo(x+2,y);c.lineTo(x+5,y-4);c.stroke();}
  for(let i=0;i<350;i++){const x=rand()*WORLD,y=rand()*WORLD;ellipse(c,x,y,1.5+rand()*3,1+rand()*2,rand()>.5?'#ced49466':'#48643f44');}
  // Small plants are painted once; collision belongs only to the solid props.
  for(let i=0;i<160;i++){
    const x=rand()*WORLD,y=rand()*WORLD;if(Math.hypot(x-1400,y-1400)<230||RUIN_SITES.some(p=>Math.hypot(x-p.x,y-p.y)<200))continue;
    const flower=['#f2d8a2','#dab4db','#b5dce4'][i%3];
    for(let j=0;j<5;j++){const px=x+rand()*35,py=y+rand()*25;c.strokeStyle='#456d44';c.lineWidth=1.5;c.beginPath();c.moveTo(px,py+5);c.lineTo(px,py-3);c.stroke();ellipse(c,px-3,py+2,4,2,'#92ae69');circle(c,px,py-4,3,flower);circle(c,px,py-4,1,'#ffeaaa');}
  }
  for(const site of RUIN_SITES){
    c.save();c.translate(site.x,site.y);circle(c,0,0,187,'#627555');circle(c,0,0,169,'#84906a');circle(c,0,0,146,'#76815f','#adb88b',2);
    c.strokeStyle='#a6b18488';c.lineWidth=2;c.beginPath();c.arc(0,0,115,0,Math.PI*2);c.stroke();
    for(let i=0;i<12;i++){c.save();c.rotate(i*Math.PI/6);rounded(c,-8,-171,16,27,3,'#b0b48a');rounded(c,-2,-166,4,13,1,'#667955');c.restore();}
    evolutionPolygon(c,[[0,-39],[14,-14],[39,0],[14,14],[0,39],[-14,14],[-39,0],[-14,-14]],'#abbc8366','#b9c39888',2);c.restore();
  }
  // River stones and flowers are decorative; the dark tree bases block movement.
  for(const o of arena.obstacles){ellipse(c,o.x+12,o.y+16,o.r*1.9,o.r*.97,'#334f3038');if(o.type==='tree'){for(let i=0;i<5;i++){const a=rand()*6.28,r=o.r*1.5;circle(c,o.x+Math.cos(a)*r,o.y+Math.sin(a)*r,4,'#b9c77b66');}}}
  c.strokeStyle='#3e623a';c.lineWidth=28;c.strokeRect(0,0,WORLD,WORLD);c.strokeStyle='#aac07755';c.lineWidth=3;c.strokeRect(18,18,WORLD-36,WORLD-36);
}
makeTerrain();

function drawObstacle(o){
  const {x,y,r}=o;
  if(!['tree','rock'].includes(o.type)){
    ctx.save();ctx.translate(x,y);ctx.scale(r/32,r/32);circle(ctx,0,0,30,'#354d3588');
    if(o.type==='pine'){
      rounded(ctx,-7,-11,14,38,3,'#796143');
      for(let i=0;i<3;i++){const top=-72+i*23,half=23+i*8;path([[-half,top+48],[0,top],[half,top+48],[0,top+40]],['#739665','#5d8258','#466e4c'][i],'#35593d',2);}
      path([[0,-72],[-10,-48],[0,-53],[9,-48]],'#a2b988');
    }else if(o.type==='stump'){
      path([[-24,-10],[-27,20],[-35,28],[-12,27],[0,23],[25,29],[33,22],[23,15],[25,-10]],'#78593d','#4b4530',2);
      ellipse(ctx,0,-9,25,16,'#c6a477');ctx.strokeStyle='#8c6946';ctx.lineWidth=2;for(const size of [8,16,24]){ctx.beginPath();ctx.ellipse(0,-9,size,size*.57,0,0,Math.PI*2);ctx.stroke();}ellipse(ctx,20,17,12,5,'#8caa64');
    }else if(o.type==='log'){
      ctx.rotate(o.variation*3);rounded(ctx,-31,-17,62,34,10,'#74573b');ctx.strokeStyle='#473f2c';ctx.lineWidth=2;ctx.stroke();
      for(const yy of [-9,1,10]){ctx.beginPath();ctx.moveTo(-22,yy);ctx.lineTo(23,yy-3);ctx.stroke();}
      ellipse(ctx,29,0,7,17,'#d3af7a');ellipse(ctx,30,0,3,10,'#9b744a');ellipse(ctx,-9,-12,17,5,'#8aaa62');
    }else if(o.type==='ruin'){
      rounded(ctx,-29,-1,58,31,4,'#687562');rounded(ctx,-23,-41,46,49,4,'#8d9881');rounded(ctx,-27,-47,54,12,3,'#b4bea1');
      path([[-15,-39],[-4,-23],[-10,-16],[-2,8]],'#788773','#4b6354',2);rounded(ctx,9,-29,5,23,1,'#cbd59c');
      ellipse(ctx,-18,19,15,6,'#729450');ellipse(ctx,21,-43,13,5,'#8fae6c');
    }else if(o.type==='crystal'){
      for(const [xx,yy,size] of [[-16,6,21],[15,9,24],[0,-3,36]]){path([[xx,yy-size],[xx+11,yy-9],[xx+8,yy+13],[xx-9,yy+13],[xx-12,yy-8]],'#6c9da0','#3a6368',2);path([[xx,yy-size],[xx+11,yy-9],[xx,yy+12]],'#b6e9df');}
      circle(ctx,-15,-16,2,'#e3fff1');circle(ctx,18,-27,2,'#e3fff1');
    }else if(o.type==='mushroom'){
      for(const [xx,yy,size] of [[-17,8,17],[15,12,16],[0,-8,26]]){rounded(ctx,xx-5,yy-6,10,26,4,'#cfbd91');ellipse(ctx,xx,yy,size,size*.63,'#8f4d3e');ellipse(ctx,xx,yy-4,size,size*.59,'#d38966');circle(ctx,xx-7,yy-7,3,'#f8dcb4');circle(ctx,xx+6,yy-3,4,'#f8dcb4');}
    }else if(o.type==='thorn'){
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7,px=Math.cos(a)*16,py=Math.sin(a)*14;circle(ctx,px,py,16,i%2?'#56724a':'#697e4b','#3c5739',1.5);path([[px-8,py-4],[px-15,py-17],[px-1,py-8]],'#c3b587');circle(ctx,px+5,py-3,3,'#ca8d83');}
    }
    ctx.restore();return;
  }
  if(o.type==='rock'){
    ctx.save();ctx.translate(x,y);ctx.rotate(o.variation*3);
    path([[-r,-r*.3],[-r*.55,-r*.86],[r*.55,-r*.77],[r,.05*r],[r*.6,r*.7],[-r*.6,r*.65]],'#687a68','#526a51',2);
    path([[-r,-r*.3],[-r*.55,-r*.86],[r*.55,-r*.77],[r*.35,-r*.05],[-r*.35,r*.07]],'#a4ad8e');
    path([[r*.55,-r*.77],[r,.05*r],[r*.6,r*.7],[r*.35,-r*.05]],'#84947a');ctx.restore();return;
  }
  circle(ctx,x,y,r,'#4c6540','#3d5839',3);
  const colors=['#456b43','#4b7446','#57814b','#638a50'];
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+o.variation;circle(ctx,x+Math.cos(a)*r*.63,y+Math.sin(a)*r*.55-9,r*.77,colors[i%4]);}
  circle(ctx,x-4,y-13,r*.95,'#63884e');circle(ctx,x-10,y-22,r*.65,'#749656');
  ellipse(ctx,x-13,y-29,r*.27,r*.12,'#8da462');
  circle(ctx,x+r*.5,y-7,3,'#d2b775');circle(ctx,x-r*.6,y-18,2.5,'#c6ae67');
}

function drawPowerIcon(c,type,size=18){
  c.save();c.scale(size/18,size/18);c.strokeStyle=POWER_UPS[type].color;c.fillStyle=POWER_UPS[type].color;c.lineWidth=2.5;c.lineJoin='round';c.lineCap='round';
  c.beginPath();
  if(type==='thunder'){c.moveTo(3,-15);c.lineTo(-10,2);c.lineTo(-1,2);c.lineTo(-4,15);c.lineTo(11,-4);c.lineTo(2,-4);c.closePath();c.fill();}
  if(type==='frost'){for(let i=0;i<6;i++){const a=i*Math.PI/3;c.moveTo(0,0);c.lineTo(Math.cos(a)*14,Math.sin(a)*14);c.moveTo(Math.cos(a)*9,Math.sin(a)*9);c.lineTo(Math.cos(a)*9+Math.cos(a+2.3)*6,Math.sin(a)*9+Math.sin(a+2.3)*6);}c.stroke();}
  if(type==='wind'){for(let i=-1;i<=1;i++){const y=i*8;c.moveTo(-13,y);c.lineTo(5,y);c.quadraticCurveTo(15,y,10,y-5);}c.stroke();}
  if(type==='shield'){c.moveTo(0,-15);c.lineTo(12,-9);c.lineTo(10,5);c.quadraticCurveTo(7,12,0,16);c.quadraticCurveTo(-7,12,-10,5);c.lineTo(-12,-9);c.closePath();c.stroke();c.moveTo(0,-7);c.lineTo(0,8);c.moveTo(-6,0);c.lineTo(6,0);c.stroke();}
  c.restore();
}
function drawPickup(p){
  const power=POWER_UPS[p.type];if(!power)return;
  const remaining=p.expiresAt-arena.time;if(remaining<=0)return;
  ctx.save();ctx.translate(p.x,p.y);
  ellipse(ctx,0,9,27,12,'#243d3766');
  circle(ctx,0,0,26,power.color+'18',power.color+'66',1.5);
  ctx.beginPath();ctx.arc(0,0,29,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(remaining/PICKUP_LIFETIME,0,1));ctx.strokeStyle=power.color;ctx.lineWidth=2;ctx.stroke();
  ctx.translate(0,reducedMotion?0:Math.sin(demoTime*2.5+p.id)*3);
  ctx.save();ctx.rotate(Math.PI/4);rounded(ctx,-17,-17,34,34,6,'#213c32');ctx.strokeStyle=power.color;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
  drawPowerIcon(ctx,p.type,16);
  if(!client&&state==='lobby'||Math.hypot(p.x-arena.player.x,p.y-arena.player.y)<310){
    ctx.font='700 9px "DM Sans",Arial';ctx.textAlign='center';const w=ctx.measureText(power.name).width;
    rounded(ctx,-w/2-7,35,w+14,19,5,'#17382ee8');ctx.fillStyle=power.color;ctx.fillText(power.name,0,48);
  }
  ctx.restore();
}
function evolutionPolygon(c,points,fill,stroke='#263b35',width=2){
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function drawEvolutionBack(c,a,r,time){
  const stage=STAGES[a.level],form=stage.form;
  c.save();c.rotate(a.angle);c.scale(r/24,r/24);
  const sway=reducedMotion?0:Math.sin(time*3)*2;
  if(form==='scout')evolutionPolygon(c,[[-8,-15],[-25,-12],[-28,12],[-8,15]],'#7d6d4e');
  if(form==='brawler'){for(const sign of [-1,1])circle(c,9,sign*22,8,'#dcb684','#6a4b32',2);}
  if(form==='viking'){
    for(let i=0;i<7;i++){const angle=Math.PI*.6+i*.8/6*Math.PI;circle(c,Math.cos(angle)*22,Math.sin(angle)*22,9,i%2?'#81745c':'#a1977c');}
  }
  if(form==='knight')evolutionPolygon(c,[[-6,-16],[-36,-21+sway],[-31,0],[-36,21+sway],[-6,16]],'#416d8a','#a8cedd',1.5);
  if(form==='samurai'){for(const sign of [-1,1]){rounded(c,-8,sign*23-7,22,14,3,'#873f39');c.strokeStyle='#e69b8a';c.lineWidth=2;c.stroke();}}
  if(form==='titan'){for(const sign of [-1,1])evolutionPolygon(c,[[-16,sign*17],[-17,sign*31],[4,sign*34],[15,sign*22]],'#75817b','#d6bf7a',2);}
  if(form==='warden'){
    for(let i=0;i<7;i++){const angle=Math.PI*.5+i*Math.PI/6;c.save();c.rotate(angle);evolutionPolygon(c,[[12,-6],[34,0],[12,7]],i%2?'#547a45':'#80a65e');c.restore();}
  }
  if(form==='assassin'){
    evolutionPolygon(c,[[-8,-15],[-37,-20],[-30,-7],[-42,4+sway],[-10,12]],'#3d334f','#9880bf',1);
    evolutionPolygon(c,[[-12,5],[-38,22+sway],[-21,19],[-15,13]],'#8470a6');
  }
  if(form==='mage'){
    evolutionPolygon(c,[[-8,-15],[-33,-24],[-28,0],[-33,24],[-8,15]],'#42617f','#91dfea',1.5);
    c.save();c.rotate(reducedMotion?0:time*.35);c.strokeStyle='#91dfea66';c.lineWidth=1;c.beginPath();c.arc(0,0,34,0,Math.PI*2);c.stroke();for(let i=0;i<6;i++){c.rotate(Math.PI/3);evolutionPolygon(c,[[32,-2],[36,0],[32,2]],'#b7eff4',null);}c.restore();
  }
  if(form==='dragon'){
    for(const sign of [-1,1])evolutionPolygon(c,[[-5,sign*13],[-18,sign*43],[-29,sign*34],[-26,sign*22],[-38,sign*20],[-19,sign*9]],'#97564a','#dc987e',2);
    evolutionPolygon(c,[[-17,-6],[-43,0],[-17,6]],'#94594a','#dc987e',2);
  }
  if(form==='phoenix'){
    for(const sign of [-1,1])for(let i=0;i<4;i++)evolutionPolygon(c,[[-7+i*4,sign*13],[-30+i*6,sign*(43-i*3)],[-15+i*5,sign*21]],i%2?'#f4aa53':'#d9633c','#ffcf80',1);
    for(const sign of [-1,0,1])evolutionPolygon(c,[[-17,sign*6],[-44,sign*14+sway],[-23,sign*12]],'#ed8246','#ffd38b',1);
  }
  if(form==='astral'){
    evolutionPolygon(c,[[-8,-18],[-35,-25],[-28,0],[-35,25],[-8,18]],'#65527e','#e2c8ff',1.5);
    const orbit=reducedMotion?0:time*.65;
    for(let i=0;i<3;i++){const angle=orbit+i*Math.PI*2/3;c.save();c.translate(Math.cos(angle)*38,Math.sin(angle)*38);evolutionPolygon(c,[[0,-6],[4,0],[0,6],[-4,0]],'#e2c8ff','#8e78ab',1);c.restore();}
  }
  c.restore();
}
function drawEvolutionHead(c,a,r){
  const {form,accent}=STAGES[a.level];
  c.save();c.scale(r/24,r/24);
  if(form==='scout'){evolutionPolygon(c,[[-19,-10],[-13,-20],[0,-17],[-6,-7],[-16,13],[-23,4]],'#70523a');}
  if(form==='brawler'){ellipse(c,-10,0,11,19,'#75533c');rounded(c,-3,-24,6,48,2,'#b95a41');evolutionPolygon(c,[[-3,-15],[-19,-31],[-15,-18]],'#e6a375');}
  if(['viking','knight','samurai','titan','dragon'].includes(form)){
    ellipse(c,-5,0,16,20,form==='samurai'?'#593d46':form==='dragon'?'#754d49':form==='titan'?'#697771':'#85949b');
    rounded(c,-20,-3,29,6,2,accent);
  }
  if(form==='viking'){for(const sign of [-1,1])evolutionPolygon(c,[[-7,sign*14],[-19,sign*30],[-2,sign*26],[-12,sign*23],[2,sign*15]],'#ece0b7');}
  if(form==='knight'){rounded(c,-9,-24,8,48,3,'#536c89');rounded(c,-6,-23,4,46,1,'#aacfe0');evolutionPolygon(c,[[-17,-7],[-31,-13],[-27,9],[-17,6]],'#549eb7');}
  if(form==='samurai'){for(const sign of [-1,1]){c.strokeStyle='#e8c57f';c.lineWidth=4;c.beginPath();c.moveTo(1,sign*8);c.quadraticCurveTo(22,sign*26,4,sign*30);c.stroke();}rounded(c,-12,-27,7,54,2,'#c87562');}
  if(form==='titan'){evolutionPolygon(c,[[-17,-17],[-26,-4],[-18,17],[2,20],[9,7],[3,-18]],'#8d9a8b','#43554a',2);c.strokeStyle='#e4d78c';c.lineWidth=2;c.beginPath();c.moveTo(-10,-15);c.lineTo(-3,-3);c.lineTo(-13,7);c.lineTo(-8,17);c.stroke();}
  if(form==='warden'){
    ellipse(c,-9,0,12,19,'#52754c');
    for(const sign of [-1,1]){c.strokeStyle='#d5ca9c';c.lineWidth=3;c.beginPath();c.moveTo(-5,sign*12);c.lineTo(-9,sign*31);c.lineTo(2,sign*39);c.moveTo(-9,sign*28);c.lineTo(-20,sign*33);c.moveTo(-6,sign*33);c.lineTo(-6,sign*41);c.stroke();}
  }
  if(form==='assassin'){evolutionPolygon(c,[[-26,0],[-17,-23],[8,-18],[13,-7],[0,-12],[-5,0],[0,12],[13,7],[8,18],[-17,23]],'#352c45','#ad8bce',2);}
  if(form==='mage'){
    ellipse(c,-6,0,12,28,'#6889a3');evolutionPolygon(c,[[3,-19],[-38,-7],[-30,2],[3,19]],'#334c73','#91dfea',2);rounded(c,-4,-19,5,38,2,'#d4cf99');circle(c,-16,-2,3,'#a6e7ee');
  }
  if(form==='dragon'){for(const sign of [-1,1])evolutionPolygon(c,[[-4,sign*15],[-21,sign*34],[-12,sign*16]],'#dfbb88');for(let i=0;i<3;i++)evolutionPolygon(c,[[-20+i*8,-4],[-18+i*8,-12],[-13+i*8,-4]],'#cf8a65');}
  if(form==='phoenix'){for(let i=0;i<5;i++){const y=(i-2)*7;evolutionPolygon(c,[[-8,y-6],[-33-Math.abs(i-2)*2,y],[-8,y+6]],i%2?'#ffcf73':'#ec8746');}evolutionPolygon(c,[[7,-6],[23,0],[7,6]],'#f2b44e');}
  if(form==='astral'){
    ellipse(c,-8,0,13,20,'#715b90');c.strokeStyle='#d9b9ff';c.lineWidth=2;c.beginPath();c.ellipse(-7,0,19,25,0,0,Math.PI*2);c.stroke();
    evolutionPolygon(c,[[-25,-18],[-34,-24],[-28,-6],[-38,0],[-28,6],[-34,24],[-25,18]],'#edd5ff','#a688cc',1.5);
    circle(c,-27,0,4,'#fff3c9');
  }
  c.restore();
}
function drawWeapon(c,level,r,special=null,reach=0,gear=null){
  if(gear&&!special){
    c.lineCap='round';c.strokeStyle='#302b30';c.lineWidth=8;c.beginPath();c.moveTo(r*.5,0);c.lineTo(reach-10,0);c.stroke();
    c.strokeStyle=gear.shape==='spear'?'#a57d4e':'#a8b7c2';c.lineWidth=4;c.stroke();
    c.fillStyle=gear.tier==='legendary'?'#fff0bf':gear.tier==='epic'?'#ddd0f5':'#d9e2df';c.strokeStyle=gear.color;c.lineWidth=2;
    if(gear.shape==='spear'){c.beginPath();c.moveTo(reach-24,-8);c.lineTo(reach,0);c.lineTo(reach-24,8);c.lineTo(reach-18,0);c.closePath();c.fill();c.stroke();rounded(c,reach-28,-5,5,10,1,gear.color);}
    else if(gear.shape==='axe'){c.beginPath();c.moveTo(reach-24,-20);c.quadraticCurveTo(reach+6,-28,reach,15);c.lineTo(reach-12,9);c.lineTo(reach-20,3);c.closePath();c.fill();c.stroke();}
    else{c.beginPath();c.moveTo(r+6,-6);c.lineTo(reach-12,-7);c.lineTo(reach,0);c.lineTo(reach-12,7);c.lineTo(r+6,6);c.closePath();c.fill();c.stroke();rounded(c,r,-14,6,28,2,gear.color);circle(c,r+3,0,3,'#fff4c9');}
    if(gear.tier==='legendary'||gear.tier==='epic'){c.strokeStyle=gear.color+'66';c.lineWidth=2;c.beginPath();c.moveTo(r+14,-11);c.lineTo(reach-16,-11);c.stroke();}
    return;
  }
  if(special){
    const end=reach-12;
    c.lineCap='round';c.strokeStyle='#445a60';c.lineWidth=7;c.beginPath();c.moveTo(r*.55,0);c.lineTo(end,0);c.stroke();
    c.strokeStyle=special.color;c.lineWidth=3;c.stroke();
    if(special===POWER_UPS.thunder){
      rounded(c,end-10,-20,22,40,5,'#535168');c.strokeStyle=special.color;c.lineWidth=3;c.stroke();
      c.save();c.translate(end+1,0);drawPowerIcon(c,'thunder',12);c.restore();
    }else{
      c.beginPath();c.moveTo(r+4,-7);c.lineTo(reach-12,-6);c.lineTo(reach,0);c.lineTo(reach-12,6);c.lineTo(r+4,7);c.closePath();c.fillStyle='#daf8ff';c.fill();c.strokeStyle=special.color;c.lineWidth=2;c.stroke();
      rounded(c,r,-13,5,26,2,'#8cc1dc');
    }
    return;
  }
  const stage=STAGES[level],kind=stage.arm,end=reach-12;
  c.lineCap='round';c.strokeStyle='#493f35';c.lineWidth=7;c.beginPath();c.moveTo(r*.55,0);c.lineTo(end,0);c.stroke();c.strokeStyle=stage.accent;c.lineWidth=3;c.stroke();
  if(kind==='club'){rounded(c,end-12,-7,23,14,5,'#a27a47');rounded(c,end-8,-5,14,3,1,'#d1ac6f');}
  if(kind==='mace'){ellipse(c,end,0,12,15,'#8e9b83');ellipse(c,end-3,-4,6,8,'#bdc5a9');}
  if(kind==='axe')evolutionPolygon(c,[[end-9,-20],[end+11,-17],[end+10,17],[end-7,12],[end-3,0]],'#d6dfca','#759088',2);
  if(kind==='sword'||kind==='katana'||kind==='flame'){
    const half=kind==='katana'?4:7;
    evolutionPolygon(c,[[r+6,-half],[reach-12,-half-2],[reach,0],[reach-12,half],[r+6,half]],kind==='flame'?'#ffdc90':'#e1ece2',stage.accent,2);
    rounded(c,r,-12,5,24,2,stage.accent);
    if(kind==='flame')for(let i=0;i<3;i++)evolutionPolygon(c,[[r+14+i*12,-6],[r+10+i*12,-15],[r+23+i*12,-7]],'#ec8b4f',null);
  }
  if(kind==='hammer'){rounded(c,end-11,-24,23,48,5,'#80998e');rounded(c,end-7,-20,14,32,2,'#c5d5b7');rounded(c,end-12,-5,25,10,2,stage.accent);}
  if(kind==='spear'||kind==='trident'){
    evolutionPolygon(c,[[end-12,-7],[reach,0],[end-12,7]],stage.accent,'#426154',2);
    if(kind==='trident')for(const sign of [-1,1]){c.strokeStyle=stage.accent;c.lineWidth=4;c.beginPath();c.moveTo(end-15,0);c.lineTo(end-8,sign*14);c.lineTo(reach-5,sign*14);c.stroke();}
    else{ellipse(c,end-23,-7,9,4,'#7aaf67');ellipse(c,end-23,7,9,4,'#a7cb7b');}
  }
  if(kind==='scythe'){c.beginPath();c.moveTo(end-10,-25);c.quadraticCurveTo(reach+16,-13,end+2,29);c.quadraticCurveTo(end+5,0,end-10,-12);c.closePath();c.fillStyle='#c4b3e2';c.fill();c.strokeStyle='#65547d';c.lineWidth=2;c.stroke();}
  if(kind==='staff'){circle(c,end,0,14,'#385d77','#91dfea',2);evolutionPolygon(c,[[end,-16],[end+10,0],[end,16],[end-10,0]],'#b4f4ef','#5e96b4',2);}
  if(kind==='star'){const points=[];for(let i=0;i<10;i++){const angle=i*Math.PI/5,rad=i%2?7:18;points.push([end-5+Math.cos(angle)*rad,Math.sin(angle)*rad]);}evolutionPolygon(c,points,'#e9d6ff','#bba2d9',2);circle(c,end-5,0,5,'#fff3bc');}

}
// Aura ornaments never change collision or attack range. Fixed small loops keep
// the effect bounded even when every player in a room equips an aura.
function drawAura(c,a,r,time){
  const aura=EQUIPMENT[a.equipment?.aura];if(!aura||aura.slot!=='aura')return;
  const t=reducedMotion?0:time,phase=t+(Number(a.id)||0)*.73,color=aura.auraColor;
  const pulse=1+Math.sin(phase*2.4)*.035;
  c.save();c.scale(r/24*pulse,r/24*pulse);c.lineCap='round';c.lineJoin='round';
  circle(c,0,0,43,color+'0c');circle(c,0,0,35,color+'15');
  if(aura.auraStyle==='saiyan'){
    const lift=Math.sin(phase*3)*3;
    evolutionPolygon(c,[[-23,31],[-39,17],[-33,1],[-42,-17],[-28,-11],[-29,-42],[-17,-29],[-10,-59-lift],[0,-39],[13,-67+lift],[20,-31],[33,-47],[30,-16],[43,-24],[35,3],[39,20],[22,31]],'#ffb52b38',color+'bb',1.5);
    evolutionPolygon(c,[[-18,29],[-29,4],[-20,-5],[-19,-28],[-9,-17],[0,-46],[10,-21],[20,-32],[22,0],[30,8],[18,29]],'#ffe68440','#fff5b4aa',1);
    c.strokeStyle='#fff4c6';c.lineWidth=1.7;
    for(const sign of [-1,1]){const y=Math.sin(phase*3+sign)*5;c.beginPath();c.moveTo(sign*32,-26+y);c.lineTo(sign*26,-13+y);c.lineTo(sign*35,-15+y);c.lineTo(sign*29,2+y);c.stroke();}
  }else if(aura.auraStyle==='wisdom'){
    c.rotate(t*.28);circle(c,0,0,40,'#194c8122',color+'cc',1.5);circle(c,0,0,32,'#00000000',color+'77',1);
    for(let i=0;i<8;i++){
      c.save();c.rotate(i*Math.PI/4);c.translate(0,-36);c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();
      c.moveTo(-2,3);c.lineTo(-2,-3);c.lineTo(2,0);c.lineTo(-2,1);c.moveTo(2,-3);c.lineTo(2,3);c.stroke();c.restore();
    }
    c.rotate(-t*.7);evolutionPolygon(c,[[0,-47],[4,-40],[0,-33],[-4,-40]],'#e7fcff',color,1);
    evolutionPolygon(c,[[0,47],[4,40],[0,33],[-4,40]],'#e7fcff',color,1);
  }else if(aura.auraStyle==='nature'){
    c.rotate(t*.35);c.strokeStyle=color+'77';c.lineWidth=1.5;
    c.beginPath();c.ellipse(0,0,39,33,0,0,Math.PI*2);c.stroke();
    for(let i=0;i<6;i++){
      c.save();c.rotate(i*Math.PI/3);c.translate(0,-37);c.rotate(.5+Math.sin(phase+i)*.18);
      c.beginPath();c.moveTo(0,8);c.quadraticCurveTo(-12,-1,0,-12);c.quadraticCurveTo(11,0,0,8);c.fillStyle=i%2?'#c8f79e':'#78c85a';c.fill();
      c.strokeStyle='#366d44';c.lineWidth=1;c.beginPath();c.moveTo(0,6);c.lineTo(0,-7);c.stroke();c.restore();
    }
  }else if(aura.auraStyle==='frost'){
    c.rotate(t*.18);circle(c,0,0,37,'#a4eaff12',color+'66',1);
    for(let i=0;i<6;i++){
      c.save();c.rotate(i*Math.PI/3);c.translate(0,-40-Math.sin(phase*1.5+i)*2);
      evolutionPolygon(c,[[0,-11],[6,0],[0,8],[-6,0]],'#75bfd9bb',color,1.5);
      evolutionPolygon(c,[[0,-9],[4,0],[0,6]],'#efffffcc','#00000000',0);c.restore();
    }
  }else if(aura.auraStyle==='void'){
    c.rotate(-t*.6);circle(c,0,0,36,'#25133733');
    for(let i=0;i<3;i++){
      c.save();c.rotate(i*Math.PI*2/3);c.strokeStyle=color+'bb';c.lineWidth=4;
      c.beginPath();c.arc(0,0,40,-.9,.6);c.stroke();c.strokeStyle='#6d42b977';c.lineWidth=7;c.beginPath();c.arc(0,0,34,-.6,.5);c.stroke();
      evolutionPolygon(c,[[32,20],[40,25],[31,30],[28,24]],'#e5caff',color,1);c.restore();
    }
  }else if(aura.auraStyle==='celestial'){
    circle(c,0,0,40,'#fff0b310',color+'aa',1);circle(c,0,0,44,'#00000000',color+'44',1);
    c.save();c.translate(0,-49);c.beginPath();c.ellipse(0,0,17,5,0,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=2;c.stroke();c.restore();
    c.rotate(t*.3);
    for(let i=0;i<4;i++){
      c.save();c.rotate(i*Math.PI/2);c.translate(0,-42);const tip=9+Math.sin(phase*2+i);
      evolutionPolygon(c,[[0,-tip],[3,-3],[tip,0],[3,3],[0,tip],[-3,3],[-tip,0],[-3,-3]],'#fffbe6',color,1);c.restore();
    }
  }
  c.restore();
}
function drawBossVariant(c,a,time){
  const def=bossDefinition(a),flash=a.hitFlash>0,fill=flash?'#fff5df':def.color;
  if(a.bossType==='frost'){
    for(const sign of [-1,1]){
      evolutionPolygon(c,[[-28,sign*18],[-47,sign*66],[-7,sign*48],[18,sign*69],[30,sign*24]],'#527e9b',def.accent,2);
      for(let i=0;i<3;i++){const x=-28+i*21,y=sign*(34+i%2*12);evolutionPolygon(c,[[x,y-sign*10],[x+8,y],[x,y+sign*21],[x-7,y]],'#c4eff7',def.accent,1);}
    }
    evolutionPolygon(c,[[-50,0],[-18,-38],[25,-32],[44,0],[25,32],[-18,38]],fill,'#34566e',3);
    evolutionPolygon(c,[[5,-20],[17,-44],[24,-20],[36,-39],[34,-10]],'#e6fbff',def.accent,2);
    circle(c,1,0,17,'#416b91',def.accent,2);evolutionPolygon(c,[[1,-16],[12,0],[1,16],[-10,0]],'#eefeff',def.accent,1);
    for(const sign of [-1,1])rounded(c,26,sign*12-3,13,6,2,'#f0ffff');
  }else if(a.bossType==='ember'){
    evolutionPolygon(c,[[-28,-14],[-88,-27],[-64,-5],[-82,17],[-23,17]],fill,'#743d36',3);
    for(const sign of [-1,1]){
      evolutionPolygon(c,[[-28,sign*15],[-42,sign*75],[0,sign*51],[31,sign*69],[20,sign*18]],'#9c493b','#e0a079',2);
      c.strokeStyle='#edbb87';c.lineWidth=2;c.beginPath();c.moveTo(-26,sign*20);c.lineTo(-4,sign*49);c.lineTo(24,sign*62);c.stroke();
    }
    ellipse(c,0,0,41,32,fill);evolutionPolygon(c,[[18,-25],[50,-18],[58,0],[50,18],[18,25]],fill,'#743d36',3);
    for(const sign of [-1,1]){evolutionPolygon(c,[[18,sign*21],[4,sign*41],[30,sign*26]],'#f3d1a0','#783e32',2);rounded(c,34,sign*12-3,13,6,2,'#fff1a2');}
    rounded(c,51,-8,9,16,3,a.windup>0?'#fff1a2':'#6b362f');
    for(let i=0;i<3;i++)evolutionPolygon(c,[[-30+i*16,-7],[-22+i*16,-15],[-15+i*16,0],[-22+i*16,7]],'#b65943','#8d4836',1);
  }else{
    const t=reducedMotion?0:time;
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;c.save();c.rotate(angle);c.strokeStyle=def.color;c.lineWidth=8;c.beginPath();c.moveTo(-25,0);c.bezierCurveTo(-47,-10,-57,24+Math.sin(t*2+i)*7,-73,8);c.stroke();circle(c,-74,8,4,def.accent);c.restore();
    }
    circle(c,0,0,40,flash?'#fff5df':'#543775',def.accent,2);
    evolutionPolygon(c,[[-33,0],[-13,-24],[15,-24],[38,0],[15,24],[-13,24]],'#e6d8f8','#8b60ac',2);
    ellipse(c,7,0,15,23,fill);ellipse(c,12,0,5,17,'#252138');circle(c,9,-10,4,'#fff9ee');
    for(const sign of [-1,1])evolutionPolygon(c,[[-9,sign*38],[0,sign*57],[9,sign*38]],def.accent,'#755095',2);
  }
}
function drawBoss(c,a,time,labels=true){
  const s=actorStats(a,time),charging=a.windup>0,def=bossDefinition(a);
  c.save();c.translate(a.x,a.y);ellipse(c,6,20,59,36,'#173a2b77');
  c.save();c.rotate(a.angle);const lift=charging?-8:Math.sin(reducedMotion?0:a.walking)*2;
  if(a.bossType&&a.bossType!=='warden')drawBossVariant(c,a,time);
  else{
  for(const sign of [-1,1]){
    rounded(c,-25,sign*35-12,28,24,7,'#40584d');
    rounded(c,3+lift,sign*48-16,31,32,8,a.hitFlash>0?'#fff5cf':'#7d9280');c.strokeStyle='#334f45';c.lineWidth=3;c.stroke();
    rounded(c,9+lift,sign*48-13,17,6,2,'#bdc7a2');
  }
  evolutionPolygon(c,[[-44,-25],[-23,-44],[17,-43],[42,-23],[48,8],[28,39],[-19,45],[-44,20]],a.hitFlash>0?'#fff4d4':'#718b77','#2e5043',4);
  evolutionPolygon(c,[[-40,-24],[-23,-41],[12,-39],[4,-18],[-14,-8]],'#a8b695','#496c53',2);
  evolutionPolygon(c,[[-36,12],[-14,8],[-4,39],[-20,40]],'#4e7255','#496c53',2);
  c.strokeStyle='#324f47';c.lineWidth=3;c.beginPath();c.moveTo(-15,-40);c.lineTo(-7,-22);c.lineTo(-18,-8);c.moveTo(-39,16);c.lineTo(-21,17);c.lineTo(-14,38);c.stroke();
  circle(c,-4,0,17,'#243f3b','#a5d4aa',2);
  evolutionPolygon(c,[[-4,-14],[7,0],[-4,14],[-15,0]],charging?'#ffcf84':'#a4f0d2','#e3ffcc',1.5);
  for(const sign of [-1,1]){
    evolutionPolygon(c,[[-21,sign*33],[-38,sign*61],[-15,sign*48],[-8,sign*37]],'#b2bd88','#43634d',2);
    ellipse(c,-28,sign*28,12,6,'#8cac61');rounded(c,23,sign*13-4,15,8,2,charging?'#ffc77d':'#d5edac');
  }
  }
  c.restore();
  drawBossCharge(c,a,time,reducedMotion);
  if(labels){
    c.textAlign='center';c.font='800 10px "DM Sans",Arial';c.fillStyle=def.accent;c.strokeStyle='#203b30';c.lineWidth=3;c.strokeText('♛ '+def.name.toUpperCase(),0,-94);c.fillText('♛ '+def.name.toUpperCase(),0,-94);
    rounded(c,-51,-85,102,7,3,'#20372d');rounded(c,-50,-84,100*clamp(a.hp/s.hp,0,1),5,2,def.accent);
    if(charging){c.font='800 10px "DM Sans",Arial';c.fillStyle=def.accent;c.fillText(def.label+' — '+def.hint,0,101);}
  }
  c.restore();
}
function bossAreaPath(c,def,angle){
  c.beginPath();
  if(def.attack==='cone'){c.moveTo(0,0);c.arc(0,0,def.range,angle-def.halfAngle,angle+def.halfAngle);c.closePath();}
  else{c.arc(0,0,def.range,0,Math.PI*2);if(def.attack==='ring'){c.moveTo(def.innerRange,0);c.arc(0,0,def.innerRange,0,Math.PI*2,true);}}
}
function drawBossGround(){
  const boss=arena.actors.find(a=>a.isBoss&&a.alive);
  if(boss){
    const def=bossDefinition(boss);
    ctx.save();ctx.translate(boss.x,boss.y);
    if(boss.windup>0){
      bossAreaPath(ctx,def,boss.attackAngle);ctx.fillStyle=def.accent+'30';ctx.fill('evenodd');ctx.strokeStyle=def.accent;ctx.lineWidth=2;ctx.stroke();
      if(boss.windup>0){const progress=clamp(1-boss.windup/def.windup,0,1);ctx.strokeStyle='#fff6db';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,54,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);ctx.stroke();}
    }
    ctx.restore();
  }else if(arena.bossSite&&arena.nextBossAt!==null&&arena.nextBossAt-arena.time<=BOSS_WARNING){
    const site=arena.bossSite,def=BOSS_TYPES[arena.nextBossType];circle(ctx,site.x,site.y,78,def.accent+'22',def.accent,2);ctx.textAlign='center';ctx.font='800 12px "DM Sans",Arial';ctx.fillStyle='#fff1bc';ctx.fillText('♛ '+def.name+' · '+Math.max(0,Math.ceil(arena.nextBossAt-arena.time))+' DTK',site.x,site.y-93);
  }
}
function drawActor(c,a,{labels=true,time=arena.time}={}){
  if(a.isBoss){if(a.alive)drawBoss(c,a,time,labels);return;}
  if(!a.alive)return;const s=actorStats(a,time),r=s.radius,bob=Math.sin(a.walking)*1.4;
  const weapon=activePower(a,'weapon',time),skill=activePower(a,'skill',time);
  const portrait=a.avatarId==='local'?customAvatar.image:avatarTextures.get(a.avatarId);
  c.save();c.translate(a.x,a.y);
  ellipse(c,6,12,r*1.1,r*.72,'#263e2d45');drawAura(c,a,r,time);drawEvolutionBack(c,a,r,time);
  if(skill){
    circle(c,0,0,r+9,skill.color+'10');c.strokeStyle=skill.color+'aa';c.lineWidth=2;
    if(skill===POWER_UPS.shield){c.beginPath();for(let i=0;i<6;i++){const angle=i*Math.PI/3;const x=Math.cos(angle)*(r+11),y=Math.sin(angle)*(r+11);i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();}
    else{const spin=reducedMotion?0:time*2;for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,r+10,spin+i*2.1,spin+i*2.1+1.2);c.stroke();}}
  }
  if(a.slowUntil>time){c.strokeStyle='#9de4f0';c.lineWidth=3;c.beginPath();c.arc(0,0,r+3,0,Math.PI*2);c.stroke();}
  if(a.equipment?.armor){c.strokeStyle=EQUIPMENT[a.equipment.armor].color;c.lineWidth=4;c.beginPath();c.arc(0,0,r+2,0,Math.PI*2);c.stroke();}
  if(a.isPlayer){c.strokeStyle='#edf6ae88';c.lineWidth=1.5;c.beginPath();c.ellipse(0,7,r+8,r+3,0,0,Math.PI*2);c.stroke();}
  if(a.invulnerable>0){c.strokeStyle='#edf8c4'+(Math.sin(time*9)>0?'bb':'55');c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.arc(0,0,r+12,0,Math.PI*2);c.stroke();c.setLineDash([]);}
  if(a.windup>0){c.strokeStyle='#f8b37c88';c.fillStyle='#f8b37c22';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.arc(0,0,s.range,a.angle-1.2,a.angle+1.2);c.closePath();c.fill();c.stroke();}
  if(a.attackTime>0){const p=1-a.attackTime/.3;c.save();c.rotate(a.attackAngle);c.beginPath();c.arc(0,0,s.range,-1.25,-1.25+p*2.5);c.strokeStyle=weapon?weapon.color+'b0':a.isPlayer?'#f6f7c8b0':'#f5dbc28c';c.lineWidth=15;c.stroke();c.beginPath();c.arc(0,0,s.range+7,-1.25,-1.25+p*2.5);c.strokeStyle='#fff9ddaa';c.lineWidth=2;c.stroke();c.restore();}
  c.save();c.rotate(a.angle);c.translate(0,bob);
  ellipse(c,-6,-r*.66,10,7,'#473f30');ellipse(c,-6,r*.66,10,7,'#473f30');if(a.equipment?.boots){const color=EQUIPMENT[a.equipment.boots].color;ellipse(c,-r*.4,-r*.95,10,7,color);ellipse(c,-r*.4,r*.95,10,7,color);rounded(c,-r*.4-6,-r*.95-5,8,3,1,'#e8dfc4');rounded(c,-r*.4-6,r*.95-5,8,3,1,'#e8dfc4');}
  circle(c,0,0,r,a.hitFlash>0?'#fff7db':a.color,'#364e3b',3);
  c.save();c.beginPath();c.arc(0,0,r-2,0,Math.PI*2);c.clip();ellipse(c,-r*.45,0,r*.5,r,'#00000013');ellipse(c,0,-r*.6,r*.85,r*.34,'#ffffff1a');c.restore();
  drawEvolutionHead(c,a,r);
  const armor=EQUIPMENT[a.equipment?.armor];
  if(armor){
    const plate=armor.material==='plate',base=plate?'#6d7e8c':'#6e6446';
    c.strokeStyle='#253338';c.lineWidth=2;
    rounded(c,-r*.82,-r*.65,r*1.05,r*1.3,5,base);c.stroke();
    rounded(c,-r*.68,-r*.52,r*.33,r*1.04,2,plate?'#b6c8d0':'#9caa73');
    for(const sign of [-1,1]){rounded(c,-r*.35,sign*r*.81-7,r*.8,14,4,base);c.stroke();rounded(c,-r*.27,sign*r*.81-6,r*.64,3,1,armor.color);}
    rounded(c,-r*.78,-3,r*.96,6,1,armor.color);circle(c,-r*.27,0,5,armor.color,'#2a3540',1.5);
    if(armor.tier==='legendary'||armor.tier==='epic'){c.fillStyle=armor.color;c.beginPath();c.moveTo(-r*.5,-7);c.lineTo(-r*.35,-13);c.lineTo(-r*.2,-7);c.closePath();c.fill();}
  }
  if(portrait){
    const faceRadius=r*.7;c.save();c.translate(r*.22,0);c.rotate(-a.angle);c.beginPath();c.arc(0,0,faceRadius,0,Math.PI*2);c.clip();c.drawImage(portrait,-faceRadius,-faceRadius,faceRadius*2,faceRadius*2);
    if(a.hitFlash>0){c.fillStyle='#fff7db88';c.fillRect(-faceRadius,-faceRadius,faceRadius*2,faceRadius*2);}c.restore();
  }else for(const y of [-7,7]){ellipse(c,r*.63,y,5.5,4.5,'#fff8df');circle(c,r*.73,y,2.5,'#283b30');}
  circle(c,r*.6,-r*.95,6.5,a.color,'#4b5940',2);circle(c,r*.65,r*.93,7,a.color,'#4b5940',2);
  c.restore();
  c.save();c.rotate(a.attackTime>0?a.attackAngle-1.25+(1-a.attackTime/.3)*2.5:a.angle+.58);drawWeapon(c,a.level,r,weapon,s.range,EQUIPMENT[a.equipment?.weapon]);c.restore();
  if(labels){
    c.textAlign='center';c.font='600 10px "DM Sans",Arial';const name=a.isPlayer?a.name+' · KAMU':a.name,tw=c.measureText(name).width;
    rounded(c,-tw/2-8,-r-34,tw+16,20,6,a.isPlayer?'#203c2fe6':'#2c4437b8');c.fillStyle=a.isPlayer?'#eaf3ab':'#edf0db';c.fillText(name,0,-r-20);
    if(a.hp<s.hp){rounded(c,-22,-r-10,44,4,2,'#21392ecc');rounded(c,-22,-r-10,44*Math.max(0,a.hp/s.hp),4,2,a.isPlayer?'#d9ec8a':'#e8a884');}
    rounded(c,-10,r+11,20,15,4,'#2c4437c9');c.font='700 8px "DM Sans",Arial';c.fillStyle='#f1ebca';c.fillText(a.level+1,0,r+22);
  }
  c.restore();
}

function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);scale=width<700?.77:1;}
addEventListener('resize',resize);resize();
function demo(){arena.reset('Petualang',selectedColor);arena.player.isPlayer=false;camera={x:1430,y:1400};state='lobby';particles=[];floaters=[];}
demo();

function tone(freq,duration=.08,type='sine',volume=.035,endFreq=freq){
  if(!soundOn)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),audioContext.currentTime+duration);gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);}catch{/* Audio is optional. */}
}
function updateSoundButton(){ $('sound').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4Z"/>'+(soundOn?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>')+'</svg>';$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Matikan suara':'Aktifkan suara');$('sound').title=soundOn?'Matikan suara':'Aktifkan suara'; }
soundOn=safeStorage.get('bonk-sound')==='true';updateSoundButton();
$('sound').onclick=()=>{soundOn=!soundOn;safeStorage.set('bonk-sound',String(soundOn));updateSoundButton();tone(440,.1);};
for(const color of COLORS){const b=document.createElement('button');b.type='button';b.className='color-swatch'+(color===selectedColor?' selected':'');b.style.setProperty('--swatch',color);b.setAttribute('aria-label','Warna '+['pasir','biru','ungu','koral','hijau'][COLORS.indexOf(color)]);b.setAttribute('aria-pressed',String(color===selectedColor));b.onclick=()=>{selectedColor=color;safeStorage.set('bonk-color',color);for(const s of $('colors').children){const yes=s===b;s.classList.toggle('selected',yes);s.setAttribute('aria-pressed',String(yes));}tone(500,.04);};$('colors').append(b);}
for(const [level,stage] of STAGES.entries()){
  const card=document.createElement('div'),preview=document.createElement('canvas'),name=document.createElement('b'),small=document.createElement('small'),look=document.createElement('small');
  preview.width=240;preview.height=160;preview.setAttribute('aria-label','Bentuk '+stage.name);const context=preview.getContext('2d'),base=stats(level),zoom=Math.min(1.35,120/(base.radius*3.8),205/(base.radius*2+base.range+35));context.scale(zoom,zoom);
  drawActor(context,{x:base.radius*1.9+8,y:80/zoom,level,name:stage.name,color:COLORS[0],alive:true,isPlayer:false,hp:stats(level).hp,walking:0,angle:-.35,equipment:{},weapon:null,skill:null,attackTime:0,windup:0,invulnerable:0,hitFlash:0,slowUntil:0},{labels:false,time:0});
  name.textContent=(level+1)+'. '+stage.name;name.style.color=stage.accent;small.textContent=stage.xp.toLocaleString('id-ID')+' XP · '+stage.weapon;look.textContent=stage.look;card.append(preview,name,small,look);$('evolution-list').append(card);
}
for(const [type,def] of Object.entries(BOSS_TYPES)){
  const card=document.createElement('div'),preview=document.createElement('canvas'),name=document.createElement('b'),look=document.createElement('span'),attack=document.createElement('span');
  preview.width=320;preview.height=240;preview.setAttribute('role','img');preview.setAttribute('aria-label',def.name+': '+def.look+' Serangan '+def.label);
  const c=preview.getContext('2d'),zoom=.43,x=160/zoom,y=120/zoom,boss={x,y,angle:0,walking:0,isBoss:true,bossType:type,bossMaxHP:def.hp,hp:def.hp,castTime:0,castX:x,castY:y,castAngle:0};c.scale(zoom,zoom);
  drawBossEffects(c,[boss],.12,{layer:'ground',reducedMotion:true});drawBoss(c,boss,0,false);drawBossEffects(c,[boss],.12,{layer:'foreground',reducedMotion:true});
  name.textContent=def.name;name.style.color=def.accent;look.textContent=def.look;attack.textContent=def.label+' · '+def.windup+' dtk — '+def.hint;card.append(preview,name,look,attack);$('boss-help').append(card);
}
for(const power of Object.values(POWER_UPS)){
  const item=document.createElement('div'),title=document.createElement('b'),description=document.createElement('span');
  title.textContent=power.icon+' '+power.name+' · '+power.duration+' dtk';title.style.color=power.color;description.textContent=power.description;item.append(title,description);$('powerup-help').append(item);
}

function resetInput(){keys.clear();mouse.down=false;mouse.active=false;touchAttack=false;dashRequested=false;joystick={x:0,y:0,id:null};$('joystick-knob').style.transform='';}
function setMode(value){
  if(joining)return;
  mode=value;
  $('mode-online').classList.toggle('selected',mode==='online');
  $('mode-solo').classList.toggle('selected',mode==='solo');
  $('mode-online').setAttribute('aria-pressed',String(mode==='online'));
  $('mode-solo').setAttribute('aria-pressed',String(mode==='solo'));
  $('room-fields').classList.toggle('hidden',mode==='solo');$('room-code').disabled=mode==='solo';
  $('mode-note').textContent=mode==='online'?'Hingga 16 pemain + 6 bot per room':'Langsung main melawan 22 bot';
  $('mode-badge').textContent=mode==='online'?'MULTIPLAYER • MAIN BARENG':'ARENA BOT • SOLO PRACTICE';
  $('connection-error').classList.add('hidden');
}
$('mode-online').onclick=()=>setMode('online');$('mode-solo').onclick=()=>setMode('solo');
$('new-room').onclick=()=>{const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';$('room-code').value=Array.from(bytes,b=>chars[b%chars.length]).join('');};
const invitedRoom=new URL(location.href).searchParams.get('room');
if(invitedRoom&&/^[a-z0-9]{3,12}$/i.test(invitedRoom))$('room-code').value=invitedRoom.toUpperCase();
function errorMessage(error){return error.name==='AbortError'?'Server tidak merespons. Pastikan npm start berjalan dan perangkat terhubung.':error.message==='Failed to fetch'?'Tidak dapat menghubungi server. Pastikan npm start berjalan.':error.message;}
function showConnectionError(error){$('connection-error').textContent=errorMessage(error);$('connection-error').classList.remove('hidden');}
function elapsed(){return Math.max(0,(arena.player.diedAt??arena.time)-(client?(arena.player.joinedAt||0):0));}
function localActor(a){return {...a,isPlayer:a.id===client?.playerId};}
function applySnapshot(snapshot,initial=false){
  if(!client||(!initial&&snapshot.sequence<lastSequence))return;
  snapshotReceivedAt=performance.now()/1000;
  lastSequence=snapshot.sequence;arena.time=snapshot.time;onlineCounts={humans:snapshot.humans,bots:snapshot.bots};
  const previous=new Map(arena.actors.map(a=>[a.id,a]));targets=new Map();
  arena.actors=snapshot.actors.map(raw=>{
    const a=localActor(raw),old=previous.get(a.id);targets.set(a.id,{x:a.x,y:a.y,angle:a.angle});
    if(!initial&&old&&Math.hypot(old.x-a.x,old.y-a.y)<240){a.x=old.x;a.y=old.y;a.angle=old.angle;}
    return a;
  });
  avatarTextures.sync(arena.actors,client);
  arena.player=arena.actors.find(a=>a.isPlayer);
  if(!arena.player){client.fail(new Error('Pemain tidak ditemukan. Masuk kembali ke room.'));return;}
  arena.orbs=snapshot.orbs;
  arena.pickups=snapshot.pickups||[];arena.gearLoot=snapshot.gearLoot||[];
  arena.nextBossAt=snapshot.nextBossAt??null;arena.bossSite=snapshot.bossSite||null;arena.nextBossType=snapshot.nextBossType||'warden';
  arena.events=(snapshot.events||[]).map(e=>({...e,actor:e.actor?localActor(e.actor):undefined,attacker:e.attacker?localActor(e.attacker):undefined}));
  if(!initial){processEvents();if(!arena.player.alive&&!deathShown)showDeath(arena.player,arena.player.killer||'Rival');}
}
function enterArena(name){
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  clearTimeout(toastTimeout);$('evolution-toast').classList.add('hidden');$('kill-feed').replaceChildren();
  clearTimeout(powerToastTimeout);$('powerup-toast').classList.add('hidden');
  resetInput();particles=[];floaters=[];camera={x:arena.player.x,y:arena.player.y};state='playing';bestBeforeRun=best;deathShown=false;
  document.body.classList.add('playing');$('lobby').classList.add('hidden');$('hud').classList.remove('hidden');$('pause').classList.remove('hidden');$('game-tip').style.opacity='1';
  $('game-tip').textContent=touchDevice?'Joystick untuk gerak • ⚔ untuk pukul • Lewati rune untuk power-up':'Ikuti kursor • Klik pukul • Dekatkan kursor ke karakter untuk berhenti';
  $('inventory-button').classList.remove('hidden');$('room-hud').classList.toggle('hidden',!client);$('board-mode').textContent=client?'ONLINE':'BOT ARENA';
  $('pause-title').textContent=client?'Menu arena.':'Arena dijeda.';
  $('pause-description').textContent=client?'Pertandingan tetap berjalan. Karaktermu berhenti bergerak dan masih bisa diserang.':'Petarung lain juga menunggu. Lanjutkan saat kamu siap.';
  $('player-name').textContent=name;updateHUD();tone(440,.16,'triangle',.05,880);canvas.focus();
}
async function start(){
  if(joining)return;
  joining=true;$('join-button').disabled=true;$('restart').disabled=true;$('join-button').textContent='MENGHUBUNGKAN…';$('connection-error').classList.add('hidden');
  const name=$('nickname').value.trim()||'Petualang';safeStorage.set('bonk-name',name);safeStorage.set('bonk-color',selectedColor);
  $('customize-avatar').disabled=true;
  try{
    await customAvatar.ready;
    if(client&&state==='dead'){
      const active=client,result=await active.respawn();if(client!==active)return;
      applySnapshot(result.snapshot,true);enterArena(arena.player.name);return;
    }
    if(mode==='solo'){arena.reset(name,selectedColor);arena.player.avatarId=customAvatar.image?'local':null;enterArena(name);return;}
    lastSequence=-1;
    const connection=new MultiplayerClient({
      onSnapshot:snapshot=>{if(client===connection)applySnapshot(snapshot);},
      onStatus:status=>{if(client!==connection)return;if(status==='reconnecting')resetInput();$('network-status').textContent=status==='connected'?'Terhubung':'Menyambung ulang…';},
      onDisconnect:error=>{if(client!==connection)return;toLobby();showConnectionError(error);},
    });
    client=connection;
    const result=await connection.join({name,color:selectedColor,room:$('room-code').value.trim().toUpperCase(),avatarPixels:customAvatar.pixels});
    if(client!==connection){connection.close();return;}
    avatarTextures.prime(result.snapshot.actors.find(a=>a.id===result.playerId)?.avatarId,customAvatar.image);
    arena.obstacles=result.obstacles;makeTerrain();applySnapshot(result.snapshot,true);
    $('room-display').textContent='ROOM '+result.room;$('network-status').textContent='Menghubungkan…';
    enterArena(name);
    connection.start(()=>state==='playing'?getInput():{});
  }catch(error){
    if(client&&state==='dead'&&error.status===429){$('death-message').textContent=error.message;}
    else{toLobby();showConnectionError(error);}
  }finally{joining=false;$('customize-avatar').disabled=false;$('join-button').disabled=false;$('restart').disabled=false;$('join-button').innerHTML='MASUK ARENA <span>↗</span>';}
}
function saveBest(){if(arena.player && (arena.player.peakXP||arena.player.xp)>best){best=arena.player.peakXP||arena.player.xp;safeStorage.set('bonk-best',String(best));$('best-score').textContent=best.toLocaleString('id-ID')+' XP';}}
function toLobby(){
  if(state!=='lobby')saveBest();client?.close();client=null;targets.clear();lastSequence=-1;
  avatarTextures.clear();
  $('inventory-button').classList.add('hidden');document.body.classList.remove('has-powerup');clearTimeout(powerToastTimeout);$('powerup-toast').classList.add('hidden');
  for(const d of document.querySelectorAll('dialog[open]'))d.close();resetInput();document.body.classList.remove('playing');$('lobby').classList.remove('hidden');$('hud').classList.add('hidden');$('pause').classList.add('hidden');demo();
}
function pause(){if(state!=='playing')return;state='paused';resetInput();void client?.sendInput();$('pause-dialog').showModal();}
function resume(){if(state!=='paused')return;for(const d of document.querySelectorAll('dialog[open]'))d.close();state='playing';resetInput();}
function showHelp(){if($('help-dialog').open||$('invite-dialog').open||$('inventory-dialog').open)return;if(state==='playing'){state='paused';resetInput();void client?.sendInput();}$('help-dialog').showModal();}
function closeHelp(){$('help-dialog').close();if(state==='paused'&&!$('pause-dialog').open)resume();}
$('play-form').onsubmit=e=>{e.preventDefault();void start();};$('restart').onclick=start;$('back-lobby').onclick=toLobby;$('quit').onclick=toLobby;$('pause').onclick=pause;$('resume').onclick=resume;$('help').onclick=showHelp;
$('invite').onclick=()=>{
  if(!client)return;
  if(state==='playing'){state='paused';resetInput();void client.sendInput();}
  const link=new URL(location.href);link.searchParams.set('room',client.room);link.hash='';
  $('invite-message').textContent='Kode room: '+client.room;$('invite-link').value=link.href;$('invite-feedback').textContent='';$('invite-dialog').showModal();
};
let inventorySignature='', equipmentBusy=false, selectedEquipment=null;
const equipmentSlotNames={weapon:'Senjata',armor:'Armor',boots:'Sepatu',aura:'Aura'};
function equipmentImage(type,alt=''){
  const img=document.createElement('img');img.src='./assets/equipment/'+EQUIPMENT[type].asset+'.svg';img.alt=alt;img.width=64;img.height=64;img.draggable=false;img.dataset.tier=EQUIPMENT[type].tier;return img;
}
for(const [type,aura] of Object.entries(EQUIPMENT).filter(([,item])=>item.slot==='aura')){
  const card=document.createElement('div'),preview=document.createElement('canvas'),title=document.createElement('b'),tier=document.createElement('small'),look=document.createElement('span'),bonus=document.createElement('span');
  preview.width=180;preview.height=132;preview.setAttribute('role','img');preview.setAttribute('aria-label',aura.name+': '+aura.look);
  drawActor(preview.getContext('2d'),{x:78,y:77,level:0,color:COLORS[0],alive:true,hp:100,angle:-.3,walking:0,equipment:{aura:type}},{labels:false,time:1.2});
  title.textContent=aura.name;title.style.color=aura.auraColor;tier.textContent=TIERS[aura.tier].name;tier.style.color=aura.color;look.textContent=aura.look;bonus.textContent=aura.description;
  card.append(preview,title,tier,look,bonus);$('aura-help').append(card);
}
function selectEquipment(type){selectedEquipment=type;inventorySignature='';renderInventory();}
function renderInventory(){
  if(!$('inventory-dialog').open)return;
  const player=arena.player,values=actorStats(player,arena.time),inventory=player.inventory||[];
  if(!inventory.includes(selectedEquipment))selectedEquipment=inventory[0]||null;
  $('inventory-stats').textContent='HP '+values.hp+'   /   DMG '+Math.round(values.damage)+'   /   GERAK '+Math.round(values.speed)+'   /   JANGKAUAN '+Math.round(values.range)+'   /   REDUKSI '+Math.round((1-values.damageTaken)*100)+'%';
  const item=EQUIPMENT[selectedEquipment],equipped=item&&player.equipment[item.slot]===selectedEquipment;
  if(item){
    const after=actorStats({...player,equipment:{...player.equipment,[item.slot]:equipped?null:selectedEquipment}},arena.time),changes=[];
    for(const [key,label] of [['hp','HP'],['damage','Damage'],['speed','Gerak'],['range','Jangkauan']]){const delta=Math.round(after[key]-values[key]);if(delta)changes.push(label+' '+(delta>0?'+':'')+delta);}
    const reduction=Math.round((values.damageTaken-after.damageTaken)*100);if(reduction)changes.push('Reduksi '+(reduction>0?'+':'')+reduction+'%');
    $('equipment-comparison').textContent=(equipped?'Jika dilepas: ':'Jika dipakai: ')+(changes.join(' · ')||'Stats tidak berubah.');
  }else $('equipment-comparison').textContent='';
  const signature=JSON.stringify([inventory,player.equipment,player.alive,equipmentBusy,selectedEquipment]);if(signature===inventorySignature)return;inventorySignature=signature;
  const focusKey=document.activeElement?.dataset?.gearFocus;
  $('equipment-slots').replaceChildren();$('inventory-items').replaceChildren();$('equipment-preview').replaceChildren();
  $('inventory-count').textContent=inventory.length+' / '+INVENTORY_CAPACITY;$('inventory-hint').textContent=inventory.length?'Pakai, simpan ke tas, atau buang item. ✓ = dipakai.':'Tas kosong. Lewati peti berwarna tier di arena untuk loot.';
  for(const slot of GEAR_SLOTS){
    const type=player.equipment?.[slot],gear=EQUIPMENT[type],box=document.createElement('button'),label=document.createElement('small');
    box.type='button';box.className='equipped-slot';box.disabled=!gear;box.title=gear?gear.name:equipmentSlotNames[slot]+' kosong';box.setAttribute('aria-label',box.title);label.textContent=equipmentSlotNames[slot];
    if(gear){box.style.setProperty('--tier-color',gear.color);box.append(equipmentImage(type));box.dataset.gearFocus='slot-'+type;box.onclick=()=>selectEquipment(type);}else{const placeholder=document.createElement('span');placeholder.className='slot-placeholder';placeholder.textContent=slot==='weapon'?'⚔':slot==='armor'?'◇':slot==='aura'?'✺':'»';box.append(placeholder);}
    box.append(label);$('equipment-slots').append(box);
  }
  for(let i=0;i<INVENTORY_CAPACITY;i++){
    const type=inventory[i],gear=EQUIPMENT[type];
    if(!gear){const empty=document.createElement('div');empty.className='inventory-cell empty';empty.setAttribute('aria-hidden','true');$('inventory-items').append(empty);continue;}
    const button=document.createElement('button');button.type='button';button.className='inventory-cell';button.dataset.gearFocus='bag-'+type;button.style.setProperty('--tier-color',gear.color);button.title=gear.name+' · '+TIERS[gear.tier].name+' — '+gear.description;button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(type===selectedEquipment));button.classList.toggle('selected',type===selectedEquipment);button.append(equipmentImage(type));const rarity=document.createElement('span');rarity.className='tier-label';rarity.textContent=TIERS[gear.tier].name;button.append(rarity);
    if(player.equipment[gear.slot]===type){button.classList.add('is-equipped');const check=document.createElement('span');check.className='equipped-mark';check.textContent='✓';check.setAttribute('aria-label','Sedang dipakai');button.append(check);}
    button.onclick=()=>selectEquipment(type);$('inventory-items').append(button);
  }
  $('equipment-kind').textContent=item?TIERS[item.tier].name.toUpperCase()+' · '+equipmentSlotNames[item.slot].toUpperCase()+' / '+(equipped?'DIPAKAI':'DI TAS'):'EQUIPMENT';
  $('equipment-name').textContent=item?item.name:'Pilih sebuah item';$('equipment-description').textContent=item?[item.look,item.description].filter(Boolean).join(' '):'Cari peti berwarna tier, kumpulkan equipment, lalu pilih ikonnya di sini.';
  $('equipment-detail').style.setProperty('--tier-color',item?.color||'#b9c1cb');
  if(item)$('equipment-preview').append(equipmentImage(selectedEquipment));else $('equipment-preview').textContent='◇';
  const action=$('equipment-action');action.textContent=equipmentBusy?'MENYIMPAN…':item?(equipped?'SIMPAN KE TAS':'PAKAI EQUIPMENT'):'TAS MASIH KOSONG';action.disabled=!item||equipmentBusy||!player.alive;
  const type=selectedEquipment;action.onclick=item?()=>changeEquipment(type,equipped?'store':'equip'):null;
  $('equipment-drop').disabled=!item||equipmentBusy||!player.alive;$('equipment-drop').onclick=item?()=>changeEquipment(type,'drop'):null;
  if(focusKey)for(const button of $('inventory-dialog').querySelectorAll('[data-gear-focus]'))if(button.dataset.gearFocus===focusKey)button.focus({preventScroll:true});
}
async function changeEquipment(type,action){
  if(equipmentBusy)return;equipmentBusy=true;$('inventory-feedback').textContent='';renderInventory();const active=client;
  try{
    if(active)await active.request('/api/equipment',{data:{type,action}});
    else if(!(action==='drop'?arena.dropEquipment(arena.player,type):arena.equip(arena.player,type,action==='store')))throw new Error('Item tidak tersedia atau tidak ada ruang untuk membuangnya.');
    if(client!==active)return;
    $('inventory-feedback').textContent=action==='drop'?'Item dijatuhkan. Pemilik bisa mengambil lagi setelah 3 detik.':action==='store'?'Equipment disimpan di tas.':'Equipment dipakai.';updateHUD();
  }catch(error){if(client===active)$('inventory-feedback').textContent=errorMessage(error);}
  finally{equipmentBusy=false;inventorySignature='';renderInventory();}
}
function openInventory(){
  if(state!=='playing'||document.querySelector('dialog[open]'))return;
  state='paused';resetInput();void client?.sendInput();inventorySignature='';$('inventory-feedback').textContent='';
  $('inventory-note').textContent=client?'Arena dan pengurangan XP tetap berjalan. Karaktermu masih bisa diserang.':'Latihan dijeda selama inventory terbuka.';
  $('inventory-dialog').showModal();renderInventory();
}
function closeInventory(){$('inventory-dialog').close();if(state==='paused')resume();}
$('inventory-button').onclick=openInventory;$('close-inventory').onclick=closeInventory;
$('inventory-dialog').addEventListener('cancel',e=>{e.preventDefault();closeInventory();});
function closeInvite(){$('invite-dialog').close();if(state==='paused')resume();}
$('close-invite').onclick=closeInvite;$('invite-dialog').addEventListener('cancel',e=>{e.preventDefault();closeInvite();});
$('copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText($('invite-link').value);$('invite-feedback').textContent='Tautan tersalin. Kirim ke temanmu!';}catch{$('invite-link').focus();$('invite-link').select();$('invite-feedback').textContent='Salin teks tautan di atas secara manual.';}};
addEventListener('pagehide',()=>{client?.close();});
addEventListener('pageshow',e=>{if(e.persisted&&client?.closed){toLobby();showConnectionError(new Error('Sesi sebelumnya ditutup. Masuk kembali ke room.'));}});
$('help-dialog').querySelector('.close-modal').onclick=closeHelp;$('help-dialog').querySelector('.close-help').onclick=closeHelp;
$('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});$('death-dialog').addEventListener('cancel',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});addEventListener('blur',()=>{resetInput();if(state==='playing')pause();});
addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement)return;
  if(e.code==='KeyI'&&!e.repeat){e.preventDefault();if($('inventory-dialog').open)closeInventory();else openInventory();return;}
  if(e.code==='Space'&&state==='playing')e.preventDefault();
  if((e.code==='Escape'||e.code==='KeyP')&&!e.repeat){if($('help-dialog').open||$('invite-dialog').open||$('inventory-dialog').open)return;if(state==='playing'){e.preventDefault();pause();}else if(state==='paused'){e.preventDefault();resume();}return;}
  if(state==='playing'){keys.add(e.code);if(e.code==='Space'&&!e.repeat)dashRequested=true;}
});addEventListener('keyup',e=>keys.delete(e.code));
function trackCursor(e){
  if(e.pointerType==='touch'||state!=='playing')return;
  mouse.x=e.clientX;mouse.y=e.clientY;
  mouse.active=mouse.x>=0&&mouse.x<=width&&mouse.y>=0&&mouse.y<=height;
  if(!mouse.active)mouse.down=false;
}
function stopCursor(){mouse.active=false;mouse.down=false;if(state==='playing')void client?.sendInput();}
canvas.addEventListener('pointermove',trackCursor);
canvas.addEventListener('pointerdown',e=>{if(e.button===0&&state==='playing'&&e.pointerType!=='touch'){trackCursor(e);mouse.down=mouse.active;canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')stopCursor();});
canvas.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')stopCursor();});
addEventListener('pointerup',()=>{mouse.down=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
const stick=$('joystick');
function moveStick(e){if(joystick.id!==e.pointerId)return;const rect=stick.getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),len=Math.hypot(dx,dy),max=36;joystick.x=dx/Math.max(max,len);joystick.y=dy/Math.max(max,len);$('joystick-knob').style.transform=`translate(${joystick.x*max}px,${joystick.y*max}px)`;}
stick.onpointerdown=e=>{e.preventDefault();mouse.active=false;mouse.down=false;joystick.id=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);};stick.onpointermove=moveStick;
function releaseStick(e){if(joystick.id===e.pointerId){joystick={x:0,y:0,id:null};$('joystick-knob').style.transform='';}}stick.onpointerup=releaseStick;stick.onpointercancel=releaseStick;
$('touch-attack').onpointerdown=e=>{e.preventDefault();touchAttack=true;e.currentTarget.setPointerCapture(e.pointerId);};$('touch-attack').onpointerup=()=>touchAttack=false;$('touch-attack').onpointercancel=()=>touchAttack=false;
$('touch-dash').onpointerdown=e=>{e.preventDefault();dashRequested=true;};

function getInput(){
  let x=joystick.x,y=joystick.y,angle=arena.player.angle;
  if(joystick.id!==null){
    if(Math.hypot(x,y)>.15)angle=Math.atan2(y,x);
  }else if(mouse.active){
    // Aim from the rendered character, including camera smoothing and zoom.
    const px=(arena.player.x-camera.x)*scale+width/2,py=(arena.player.y-camera.y)*scale+height/2;
    const dx=(mouse.x-px)/scale,dy=(mouse.y-py)/scale,distance=Math.hypot(dx,dy);
    if(distance>1)angle=Math.atan2(dy,dx);
    // A neutral area prevents jitter; approach speed ramps smoothly to full speed.
    const stopRadius=Math.max(22,stats(arena.player.level).radius);
    const speed=clamp((distance-stopRadius)/80,0,1);
    x=distance>0?dx/distance*speed:0;y=distance>0?dy/distance*speed:0;
  }
  const input={x,y,angle,attack:mouse.down||keys.has('KeyJ')||touchAttack,dash:dashRequested};dashRequested=false;return input;
}

function burst(x,y,color,n=12){if(reducedMotion)n=Math.min(n,4);for(let i=0;i<n;i++){const angle=Math.random()*Math.PI*2,speed=30+Math.random()*170;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.35+Math.random()*.3,max:.65,color,size:2+Math.random()*4});}if(particles.length>350)particles.splice(0,particles.length-350);}
function timeText(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');}
function processEvents(){
  for(const e of arena.drainEvents()){
    if(['boss_warning','boss_spawn','boss_defeated'].includes(e.type)){
      const line=document.createElement('div');line.className='boss-feed';line.textContent=e.type==='boss_warning'?'♛ '+BOSS_TYPES[e.bossType].name+' dalam 10 detik! Lihat minimap.':e.type==='boss_spawn'?'♛ '+e.actor.name+' muncul!':'♛ '+e.actor.name+' tumbang! 3 loot Rare+ jatuh di lokasinya.';
      if(e.type==='boss_defeated'&&e.attacker?.isPlayer)line.textContent+=' +300 XP';
      $('kill-feed').prepend(line);while($('kill-feed').children.length>3)$('kill-feed').lastChild.remove();setTimeout(()=>line.remove(),6000);
      if(e.type!=='boss_warning')burst(e.x,e.y,'#efcf82',30);tone(e.type==='boss_defeated'?660:130,.3,'triangle',.04,330);
    }
    if(e.type==='boss_slam'&&Math.hypot(e.x-arena.player.x,e.y-arena.player.y)<450){
      const kind=bossDefinition(e.actor).attack;
      if(kind==='slam'){shake=reducedMotion?0:8;tone(75,.24,'triangle',.055,32);}
      else if(kind==='cone')tone(140,.3,'sawtooth',.025,48);
      else if(kind==='frost')tone(1200,.28,'sine',.035,450);
      else tone(180,.32,'sine',.045,55);
    }
    if((e.type==='gear_loot'||e.type==='xp_decay')&&e.actor.isPlayer){
      $('powerup-toast').textContent=e.type==='gear_loot'?'▣ '+EQUIPMENT[e.gearType].name+' masuk tas · Tekan I':'−'+e.value+' XP berkala'+(e.demoted?' · Evolusi turun':'');
      $('powerup-toast').style.setProperty('--power-color',e.type==='gear_loot'?EQUIPMENT[e.gearType].color:'#efba9b');$('powerup-toast').classList.remove('hidden');clearTimeout(powerToastTimeout);powerToastTimeout=setTimeout(()=>$('powerup-toast').classList.add('hidden'),2600);
    }
    if(e.type==='powerup'){
      const power=POWER_UPS[e.powerType];if(!power)continue;
      burst(e.x,e.y,power.color,25);
      if(e.actor.isPlayer){
        $('powerup-toast').textContent=power.icon+' '+power.name+' · '+power.duration+' detik'+(e.replaced?' · Mengganti '+(power.slot==='weapon'?'senjata':'skill'):'');
        $('powerup-toast').style.setProperty('--power-color',power.color);$('powerup-toast').classList.remove('hidden');clearTimeout(powerToastTimeout);powerToastTimeout=setTimeout(()=>$('powerup-toast').classList.add('hidden'),2800);tone(520,.25,'triangle',.05,1050);
      }
    }
    if(e.type==='hit'){burst(e.x,e.y,e.actor.color,8);floaters.push({x:e.x,y:e.y-25,text:'−'+e.damage,color:e.actor.isPlayer?'#ffd1ac':'#fff8cd',life:.7});if(e.actor.isPlayer||e.attacker.isPlayer){shake=reducedMotion?0:5;tone(110,.08,'triangle',.06,45);}}
    if(e.type==='collect'&&state==='playing'&&e.actor?.isPlayer){burst(e.x,e.y,'#e5ee9c',4);tone(600+Math.random()*300,.035,'sine',.012);}
    if(e.type==='swing'&&e.actor.isPlayer)tone(220,.09,'triangle',.025,65);
    if(e.type==='dash'&&e.actor.isPlayer)tone(170,.15,'sine',.025,500);
    if(e.type==='evolve'){burst(e.actor.x,e.actor.y,STAGES[e.actor.level].accent,35);if(e.actor.isPlayer){$('evolution-name').textContent=STAGES[e.actor.level].name;$('evolution-name').style.color=STAGES[e.actor.level].accent;$('evolution-description').textContent=STAGES[e.actor.level].look;$('evolution-toast').classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('evolution-toast').classList.add('hidden'),2500);tone(440,.4,'triangle',.06,1100);}}
    if(e.type==='kill'){
      burst(e.actor.x,e.actor.y,e.actor.color,24);
      if(e.attacker.isPlayer){const line=document.createElement('div');line.textContent='⚔ '+e.actor.name+' tumbang  +'+(45+e.actor.level*30)+' XP';$('kill-feed').prepend(line);while($('kill-feed').children.length>3)$('kill-feed').lastChild.remove();setTimeout(()=>line.remove(),4200);tone(660,.18,'triangle',.04,880);}
      if(e.actor.isPlayer&&!deathShown)showDeath(arena.player,e.attacker.name);
    }
  }
}
function showDeath(player,killer){
  deathShown=true;state='dead';resetInput();saveBest();
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  $('death-message').textContent='Ditumbangkan oleh '+killer+'. Evolusi terakhir: '+STAGES[player.level].name+'.';
  $('result-xp').textContent=player.xp.toLocaleString('id-ID');$('result-kills').textContent=player.kills;$('result-time').textContent=timeText(elapsed());
  $('new-record').classList.toggle('hidden',(player.peakXP||player.xp)<=bestBeforeRun);$('death-dialog').showModal();tone(220,.4,'triangle',.04,55);
}
function updateHUD(){
  const p=arena.player,s=actorStats(p,arena.time),stage=STAGES[p.level],next=STAGES[p.level+1];
  let hasPower=false;
  for(const slot of ['weapon','skill']){
    const power=p.alive?activePower(p,slot,arena.time):null,row=$(slot+'-power');row.classList.toggle('hidden',!power);if(!power)continue;hasPower=true;
    const remaining=Math.max(0,p[slot].expiresAt-arena.time);row.style.setProperty('--power-color',power.color);row.classList.toggle('expiring',remaining<=3);row.title=power.description;
    row.querySelector('.power-icon').textContent=power.icon;row.querySelector('.power-name').textContent=power.name;row.querySelector('.power-time').textContent=Math.ceil(remaining)+' dtk';row.querySelector('.power-fill').style.width=clamp(remaining/power.duration*100,0,100)+'%';
  }
  $('powerup-status').classList.toggle('hidden',!hasPower);document.body.classList.toggle('has-powerup',hasPower);
  const special=activePower(p,'weapon',arena.time);
  $('level-number').textContent=p.level+1;$('level-number').style.color=stage.accent;$('class-name').textContent=stage.name+' · '+(special?.name||EQUIPMENT[p.equipment?.weapon]?.name||stage.weapon);$('kills').replaceChildren(document.createTextNode(p.kills+' '));const ko=document.createElement('span');ko.textContent='KO';$('kills').append(ko);
  $('health-fill').style.width=(p.hp/s.hp*100)+'%';$('health-fill').style.background=p.hp/s.hp<.3?'#e69a7a':'#a5d680';
  $('xp-fill').style.width=(next?clamp((p.xp-stage.xp)/(next.xp-stage.xp),0,1)*100:100)+'%';$('xp-text').textContent=p.xp+(next?' / '+next.xp:'')+' XP';$('next-class').textContent=next?next.name+' ↗':'EVOLUSI MAKS.';
  $('attack-cooldown').style.height=clamp(p.cooldown/s.cooldown*100,0,100)+'%';$('dash-cooldown').style.height=clamp(p.dashCooldown/s.dashCooldown*100,0,100)+'%';$('dash-label').textContent=p.dashCooldown>0?p.dashCooldown.toFixed(1)+' dtk':'SPACE';$('touch-dash').style.opacity=p.dashCooldown>0?'.45':'1';
  $('session-clock').textContent=timeText(elapsed());$('population').textContent=client?onlineCounts.humans+' pemain · '+onlineCounts.bots+' bot':'23 petarung';if(client?.ready)$('network-status').textContent='Terhubung · '+client.latency+' ms';if(elapsed()>9)$('game-tip').style.opacity='0';
  $('xp-decay').textContent='XP −'+Math.round(XP_DECAY_RATE*100)+'% dalam '+Math.max(0,Math.ceil(p.nextDecayAt-arena.time))+' dtk';renderInventory();
  const boss=arena.actors.find(a=>a.isBoss&&a.alive),bossTarget=boss||arena.bossSite;
  const direction=bossTarget?(bossTarget.y<WORLD/2?'UTARA':'SELATAN')+' '+(bossTarget.x<WORLD/2?'BARAT':'TIMUR'):'MENCARI LOKASI AMAN';
  const bossDef=boss?bossDefinition(boss):BOSS_TYPES[arena.nextBossType];
  $('boss-title').textContent='♛ '+bossDef.name.toUpperCase();$('boss-title').style.color=bossDef.accent;
  $('boss-detail').textContent=boss?Math.ceil(boss.hp)+' / '+boss.bossMaxHP+' HP · '+direction:timeText(Math.max(0,(arena.nextBossAt??arena.time)-arena.time))+' · '+direction;
  $('boss-track').classList.toggle('hidden',!boss);$('boss-fill').style.width=boss?clamp(boss.hp/boss.bossMaxHP*100,0,100)+'%':'0%';
  $('boss-panel').classList.toggle('boss-active',!!boss);$('boss-hint').textContent=boss?(boss.windup>0?bossDef.label+' — '+bossDef.hint:'3 loot Rare+ · minimal 1 Epic/Legendary'):'Akan muncul · Ikuti tanda ♛ di minimap.';
  const list=arena.ranking();$('ranking').replaceChildren();for(const a of list.slice(0,5)){const row=document.createElement('li'),dot=document.createElement('i'),name=document.createElement('b'),score=document.createElement('span');dot.style.background=a.color;name.textContent=a.name+(client&&!a.human?' · BOT':'');score.textContent=a.xp.toLocaleString('id-ID');row.append(dot,name,score);if(a.isPlayer)row.className='you';$('ranking').append(row);}
  const rank=list.indexOf(p)+1;$('self-rank').textContent=rank>0?'#'+rank+'  Kamu  ·  '+p.xp+' XP':'Petarung tumbang';
  mapCtx.fillStyle='#547347';mapCtx.fillRect(0,0,136,136);mapCtx.strokeStyle='#a9bb7577';mapCtx.strokeRect(2,2,132,132);
  for(const o of arena.obstacles){circle(mapCtx,o.x/WORLD*136,o.y/WORLD*136,1.3,'#314e36');}
  for(const loot of arena.gearLoot){mapCtx.fillStyle=EQUIPMENT[loot.type].color;mapCtx.fillRect(loot.x/WORLD*136-2,loot.y/WORLD*136-2,4,4);}
  for(const pickup of arena.pickups){const power=POWER_UPS[pickup.type];if(!power)continue;mapCtx.save();mapCtx.translate(pickup.x/WORLD*136,pickup.y/WORLD*136);mapCtx.rotate(Math.PI/4);mapCtx.fillStyle=power.color;mapCtx.fillRect(-2,-2,4,4);mapCtx.restore();}
  for(const a of arena.actors){if(!a.alive||a.isBoss)continue;circle(mapCtx,a.x/WORLD*136,a.y/WORLD*136,a.isPlayer?3.4:1.5,a.isPlayer?'#f7fac3':a.human?'#a6dce8':'#d5b181');}
  if(bossTarget){circle(mapCtx,bossTarget.x/WORLD*136,bossTarget.y/WORLD*136,6,boss?'#a84a37':'#334f3b','#f5d388',1);mapCtx.font='bold 10px Arial';mapCtx.textAlign='center';mapCtx.fillStyle='#fff0b0';mapCtx.fillText('♛',bossTarget.x/WORLD*136,bossTarget.y/WORLD*136+3);}
  const vw=width/scale/WORLD*136,vh=height/scale/WORLD*136;mapCtx.strokeStyle='#f7fac366';mapCtx.lineWidth=1;mapCtx.strokeRect(camera.x/WORLD*136-vw/2,camera.y/WORLD*136-vh/2,vw,vh);
}

function render(dt){
  const isLobby=state==='lobby';
  if(isLobby){camera.x=1400+Math.sin(demoTime*.035)*120;camera.y=1400+Math.cos(demoTime*.025)*90;}
  else{const f=1-Math.exp(-dt*10);camera.x+=(arena.player.x-camera.x)*f;camera.y+=(arena.player.y-camera.y)*f;}
  const renderScale=isLobby?(width<700?.85:1.05):scale;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#36573c';ctx.fillRect(0,0,width,height);
  ctx.save();ctx.translate(width/2+(Math.random()-.5)*shake,height/2+(Math.random()-.5)*shake);ctx.scale(renderScale,renderScale);ctx.translate(-camera.x,-camera.y);
  const viewW=width/renderScale,viewH=height/renderScale,left=camera.x-viewW/2,top=camera.y-viewH/2;
  const sx=clamp(left,0,WORLD),sy=clamp(top,0,WORLD),sw=Math.min(WORLD-sx,viewW+Math.min(left,0)),sh=Math.min(WORLD-sy,viewH+Math.min(top,0));
  if(sw>0&&sh>0)ctx.drawImage(terrain,sx,sy,sw,sh,sx,sy,sw,sh);
  const visible=(x,y,pad=80)=>x>left-pad&&x<left+viewW+pad&&y>top-pad&&y<top+viewH+pad;
  const effectTime=client&&state!=='lobby'?arena.time+clamp(performance.now()/1000-snapshotReceivedAt,0,.1):arena.time;
  const gems=['#eff2a6','#b6d8bf','#e6c89c','#d6bcdd'];
  drawBossGround();
  drawBossEffects(ctx,arena.actors,effectTime,{layer:'ground',reducedMotion,visible});
  for(const o of arena.orbs){if(!visible(o.x,o.y,10))continue;const r=o.value>12?5:3.8,dy=reducedMotion?0:Math.sin(demoTime*2+o.phase)*1.4;ellipse(ctx,o.x+1,o.y+4,r*1.2,r*.5,'#405f3545');ctx.save();ctx.translate(o.x,o.y+dy);ctx.rotate(Math.PI/4);rounded(ctx,-r/2,-r/2,r,r,1,gems[o.color]);ctx.restore();}
  for(const loot of arena.gearLoot){
    if(loot.bossReward&&visible(loot.x,loot.y)){circle(ctx,loot.x,loot.y,26,'#f8d37a18',EQUIPMENT[loot.type].color,1.5);ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillStyle='#ffdf92';ctx.fillText('♛',loot.x,loot.y-19);}
    if(!visible(loot.x,loot.y))continue;ctx.save();ctx.translate(loot.x,loot.y);ellipse(ctx,2,12,20,9,'#17382e77');rounded(ctx,-17,-12,34,26,5,'#775634');const gear=EQUIPMENT[loot.type];ctx.strokeStyle=gear.color;ctx.lineWidth=2;ctx.stroke();rounded(ctx,-18,-4,36,4,1,gear.color);rounded(ctx,-4,-5,8,12,2,gear.color);
    if(gear.slot==='aura'){
      const icon=auraIcons.get(loot.type),bob=reducedMotion?0:Math.sin(demoTime*2+loot.id)*2;
      circle(ctx,0,-25+bob,18,'#172a35dd',gear.color,1);
      if(icon?.complete&&icon.naturalWidth)ctx.drawImage(icon,-16,-41+bob,32,32);
    }
    if(Math.hypot(loot.x-arena.player.x,loot.y-arena.player.y)<260){ctx.font='700 9px "DM Sans",Arial';ctx.textAlign='center';ctx.fillStyle='#fff0bf';ctx.strokeStyle='#253d2c';ctx.lineWidth=3;const name=EQUIPMENT[loot.type].name+' · '+TIERS[EQUIPMENT[loot.type].tier].name;ctx.strokeText(name,0,32);ctx.fillText(name,0,32);}
    ctx.restore();
  }
  for(const pickup of arena.pickups)if(visible(pickup.x,pickup.y))drawPickup(pickup);
  const objects=[...arena.obstacles.filter(o=>visible(o.x,o.y,110)).map(o=>({y:o.y,obstacle:o})),...arena.actors.filter(a=>a.alive&&visible(a.x,a.y,a.equipment?.aura||a.isBoss?150:80)).map(a=>({y:a.y,actor:a}))].sort((a,b)=>a.y-b.y);
  for(const item of objects){if(item.actor)drawActor(ctx,item.actor);else drawObstacle(item.obstacle);}
  drawBossEffects(ctx,arena.actors,effectTime,{layer:'foreground',reducedMotion,visible});
  for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);circle(ctx,p.x,p.y,p.size,p.color);}ctx.globalAlpha=1;
  ctx.textAlign='center';ctx.font='800 18px "DM Sans",Arial';for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life*3);ctx.fillStyle=f.color;ctx.strokeStyle='#355039';ctx.lineWidth=3;ctx.strokeText(f.text,f.x,f.y);ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
  ctx.restore();
  if(state==='playing'&&arena.player.hp/stats(arena.player.level).hp<.3){const g=ctx.createRadialGradient(width/2,height/2,width*.2,width/2,height/2,width*.7);g.addColorStop(0,'#ab452500');g.addColorStop(1,'#ab452555');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);}
  if(isLobby){avatarCtx.clearRect(0,0,280,180);const preview={...arena.player,avatarId:customAvatar.image?'local':null,x:132,y:80+Math.sin(demoTime*2)*3,color:selectedColor,level:0,angle:-.45,alive:true,isPlayer:false,hp:100,invulnerable:0,hitFlash:0,windup:0,attackTime:0,walking:0,weapon:null,skill:null,slowUntil:0,equipment:{}};avatarCtx.save();avatarCtx.translate(-65,-28);avatarCtx.scale(1.5,1.5);drawActor(avatarCtx,preview,{labels:false,time:demoTime});avatarCtx.restore();}
}
function frame(now){
  const dt=Math.min((now-last)/1000||.016,.05);last=now;demoTime+=dt;
  if(client&&state!=='lobby'){
    const factor=1-Math.exp(-dt*22);
    for(const a of arena.actors){const target=targets.get(a.id);if(!target)continue;a.x+=(target.x-a.x)*factor;a.y+=(target.y-a.y)*factor;a.angle+=angleDiff(target.angle,a.angle)*factor;a.attackTime=Math.max(0,a.attackTime-dt);a.hitFlash=Math.max(0,a.hitFlash-dt);}
    hudTimer-=dt;if(hudTimer<=0){updateHUD();hudTimer=.1;}
  }
  else if(state==='playing'){arena.update(dt,getInput());processEvents();hudTimer-=dt;if(hudTimer<=0){updateHUD();hudTimer=.1;}}
  else if(state==='lobby'&&!$('help-dialog').open){arena.update(dt);arena.drainEvents();}
  if(state==='playing'||state==='lobby'||state==='dead'||client){
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*3);p.vy*=Math.exp(-dt*3);p.life-=dt;}
    particles=particles.filter(p=>p.life>0);for(const f of floaters){f.y-=dt*35;f.life-=dt;}floaters=floaters.filter(f=>f.life>0);shake=Math.max(0,shake-dt*30);
  }
  render(dt);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
