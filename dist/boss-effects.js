import { bossDefinition, clamp } from './engine.js';

// Procedural, bounded effects: no external assets, persistent particles, or
// per-frame randomness. Server cast time/origin lets every client reconstruct it.
const TAU=Math.PI*2;
const LIFE=1.35;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);c.fillStyle=color;c.fill();}
function polygon(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
function glow(c,x,y,r,inner,outer){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);circle(c,x,y,r,g);}
function area(c,def,angle){
  c.beginPath();
  if(def.attack==='cone'){c.moveTo(0,0);c.arc(0,0,def.range,angle-def.halfAngle,angle+def.halfAngle);c.closePath();}
  else{c.arc(0,0,def.range,0,TAU);if(def.innerRange){c.moveTo(def.innerRange,0);c.arc(0,0,def.innerRange,0,TAU,true);}}
}
function iceShard(c,x,y,size,angle,opacity=1){
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=opacity;
  polygon(c,[[0,-size],[size*.35,-size*.1],[0,size*.45],[-size*.35,0]],'#87d9ed','#efffff');
  polygon(c,[[0,-size],[size*.35,-size*.1],[0,size*.45]],'#eaffff');c.restore();
}
function star(c,x,y,size,color){polygon(c,[[x,y-size],[x+size*.25,y-size*.25],[x+size,y],[x+size*.25,y+size*.25],[x,y+size],[x-size*.25,y+size*.25],[x-size,y],[x-size*.25,y-size*.25]],color);}

function fire(c,def,t,angle,layer,still){
  c.rotate(angle);const fade=clamp(1-t/LIFE,0,1),phase=still?.16:t;
  if(layer==='ground'){
    c.globalAlpha=.32*fade;area(c,def,0);c.fillStyle='#3c231c';c.fill();
    for(let i=0;i<12;i++){const x=65+noise(i)*145,y=(noise(i+50)-.5)*x*.75;circle(c,x,y,7+noise(i+12)*14,'#292c20');}
    c.globalAlpha=clamp(1-t/.5,0,1);glow(c,119,0,150,'#ffb52c66','#ff7c1000');return;
  }
  // The plume starts at the mouth. Red outer curls, gold tongues and a pale
  // core occupy the same cone used for damage, with embers drifting afterward.
  const strength=clamp(1-t/.46,0,1);
  if(strength>0){
    c.save();area(c,def,0);c.clip();c.globalAlpha=Math.min(1,strength*2.8);
    const plume=c.createLinearGradient(45,0,def.range,0);plume.addColorStop(0,'#fff9c4');plume.addColorStop(.26,'#ffe260');plume.addColorStop(.62,'#ff982b');plume.addColorStop(1,'#d9491888');
    c.beginPath();c.moveTo(48,-8);c.bezierCurveTo(105,-25,160,-96,225,-118);c.quadraticCurveTo(202,-49,235,-17);c.quadraticCurveTo(210,6,234,38);c.quadraticCurveTo(194,53,214,116);c.bezierCurveTo(141,74,95,19,48,8);c.closePath();c.fillStyle=plume;c.fill();
    for(let i=0;i<9;i++){
      const spread=(i-4)*.115,wave=Math.sin(phase*26+i*1.7),length=150+noise(i+7)*45;
      c.save();c.translate(48,0);c.rotate(spread);const width=14+noise(i+1)*13;
      c.beginPath();c.moveTo(0,-6);c.bezierCurveTo(length*.3,-width,length*.58,-width*1.7+wave*8,length,-width*.3+wave*7);c.quadraticCurveTo(length*.77,6+wave*9,length*.88,width);c.bezierCurveTo(length*.57,width*.6,length*.18,11,0,6);c.closePath();
      c.fillStyle=['#e75c1eb0','#ff9c29','#ffd654','#fff0a3'][i%4];c.fill();c.restore();
    }
    c.beginPath();c.moveTo(48,-6);c.bezierCurveTo(85,-17,118,-25,168,Math.sin(phase*24)*12);c.quadraticCurveTo(111,15,48,7);c.closePath();c.fillStyle='#fffbd1';c.fill();
    glow(c,57,0,38,'#fff5c1cc','#ffc04400');c.restore();
  }
  c.save();area(c,def,0);c.clip();
  for(let i=0;i<(still?10:30);i++){
    const n=noise(i+90),p=still?.55:clamp(t*(1.2+n)+n*.5,0,1),x=55+p*(def.range-62),y=(noise(i+130)-.5)*x*.9;
    c.globalAlpha=fade*(1-p*.55);c.strokeStyle=i%3?'#ffd362':'#fff3be';c.lineWidth=1.5+noise(i+43)*2;c.beginPath();c.moveTo(x-7,y+2);c.lineTo(x,y);c.stroke();
  }
  if(t>.22)for(let i=0;i<8;i++){c.globalAlpha=fade*.18;const x=120+noise(i+210)*100,y=(noise(i+240)-.5)*110;circle(c,x,y-(still?0:t*14),13+noise(i+310)*17,'#544b43');}
  c.restore();
}

function frost(c,def,t,layer,still){
  const fade=clamp(1-t/LIFE,0,1),p=still?.8:clamp(t/.28,0,1);
  if(layer==='ground'){
    c.globalAlpha=fade;glow(c,0,0,def.range,'#a8efff55','#88cfff00');
    c.strokeStyle='#d4fbff';c.lineWidth=1.5;c.globalAlpha=fade*.6;
    for(let i=0;i<12;i++){c.save();c.rotate(i*TAU/12);c.beginPath();c.moveTo(42,0);c.lineTo(155,0);for(const x of [85,115,140]){c.moveTo(x-17,-13);c.lineTo(x,0);c.lineTo(x-17,13);}c.stroke();c.restore();}return;
  }
  c.save();area(c,def,0);c.clip();
  c.globalAlpha=fade*.8;c.strokeStyle='#efffff';c.lineWidth=4;
  for(let i=0;i<2;i++){c.beginPath();c.arc(0,0,Math.max(1,(def.range-5)*clamp(p-i*.12,0,1)),0,TAU);c.stroke();}
  for(let i=0;i<16;i++){
    const angle=i*TAU/16,r=(100+noise(i)*55)*p,size=(17+noise(i+10)*23)*(still?1:Math.min(1,t*18));
    iceShard(c,Math.cos(angle)*r,Math.sin(angle)*r,size,angle+Math.PI/2,fade);
  }
  for(let i=0;i<(still?12:28);i++){
    const angle=noise(i+50)*TAU,r=50+noise(i+70)*105,x=Math.cos(angle)*r,y=Math.sin(angle)*r-(still?0:t*12);
    c.globalAlpha=fade*.8;star(c,x,y,2+noise(i+90)*3,'#edffff');
  }
  c.restore();
}

function quake(c,def,t,layer,still){
  const fade=clamp(1-t/LIFE,0,1),p=still?.8:clamp(t/.3,0,1);
  if(layer==='ground'){
    c.globalAlpha=fade*.8;circle(c,0,0,57,'#4e4737');
    for(let i=0;i<10;i++){
      c.save();c.rotate(i*TAU/10);c.beginPath();c.moveTo(35,0);
      for(let j=1;j<=5;j++)c.lineTo(35+j*20*p,(noise(i*9+j)-.5)*23);
      c.strokeStyle='#393c2b';c.lineWidth=5;c.stroke();c.strokeStyle='#dcaf63';c.lineWidth=1.2;c.stroke();
      c.beginPath();c.moveTo(75*p,5);c.lineTo(99*p,24);c.lineTo(118*p,21);c.stroke();c.restore();
    }
    c.strokeStyle='#e9d39a';c.lineWidth=6;c.globalAlpha=fade*.65;c.beginPath();c.arc(0,0,def.range*p,0,TAU);c.stroke();return;
  }
  for(let i=0;i<16;i++){
    const angle=i*TAU/16,n=noise(i+22),r=48+(54+n*35)*p,hop=still?12:Math.sin(clamp(t/.8,0,1)*Math.PI)*28,x=Math.cos(angle)*r,y=Math.sin(angle)*r-hop,size=5+n*7;
    c.globalAlpha=fade*.25;circle(c,x,y+hop+8,size+5,'#2e3928');c.globalAlpha=fade;
    polygon(c,[[x-size,y],[x-3,y-size],[x+size,y-size*.4],[x+size*.5,y+size],[x-size*.6,y+size*.6]],i%2?'#9c987e':'#777c68','#414d3a');
  }
  for(let i=0;i<10;i++){const a=i*TAU/10,r=(def.range-15)*p;c.globalAlpha=fade*.2;circle(c,Math.cos(a)*r,Math.sin(a)*r,18+noise(i+15)*14,'#d4c194');}
}

function voidRing(c,def,t,layer,still){
  const fade=clamp(1-t/LIFE,0,1),phase=still?.2:t;
  c.save();area(c,def,0);c.clip('evenodd');
  if(layer==='ground'){
    const g=c.createRadialGradient(0,0,def.innerRange,0,0,def.range);g.addColorStop(0,'#be80ff88');g.addColorStop(.35,'#38234fb0');g.addColorStop(.7,'#20162eaa');g.addColorStop(1,'#d4acff88');
    c.globalAlpha=fade;c.fillStyle=g;c.fillRect(-def.range,-def.range,def.range*2,def.range*2);
  }else{
    c.globalAlpha=fade;c.lineCap='round';
    for(let i=0;i<9;i++){
      const radius=def.innerRange+8+i*8,start=i*.85+phase*(i%2?2:-2);
      c.strokeStyle=i%3?'#ae79e5':'#f4deff';c.lineWidth=i%3?5:2;c.beginPath();c.arc(0,0,radius,start,start+1.3);c.stroke();
    }
    for(let i=0;i<12;i++){
      const a=i*TAU/12+phase*.45;c.save();c.rotate(a);c.strokeStyle='#edcfff';c.lineWidth=1.5;c.beginPath();c.moveTo(def.innerRange+4,0);c.lineTo(186,-7);c.lineTo(198,7);c.lineTo(215,-8);c.lineTo(def.range-4,0);c.stroke();star(c,204,0,5,'#fff0ff');c.restore();
    }
    c.strokeStyle='#e5c4ff';c.lineWidth=3;for(const radius of [def.innerRange+2,def.range-2]){c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();}
  }
  c.restore();
}

export function drawBossEffects(c,actors,time,{layer,reducedMotion=false,visible=()=>true}={}){
  for(const boss of actors){
    if(!boss.isBoss||!Number.isFinite(boss.castTime)||!Number.isFinite(boss.castX)||!Number.isFinite(boss.castY)||!Number.isFinite(boss.castAngle))continue;
    const t=time-boss.castTime,def=bossDefinition(boss);
    if(t<0||t>=LIFE||!visible(boss.castX,boss.castY,def.range+50))continue;
    c.save();c.translate(boss.castX,boss.castY);
    if(def.attack==='cone')fire(c,def,t,boss.castAngle,layer,reducedMotion);
    else if(def.attack==='frost')frost(c,def,t,layer,reducedMotion);
    else if(def.attack==='ring')voidRing(c,def,t,layer,reducedMotion);
    else quake(c,def,t,layer,reducedMotion);
    c.restore();
  }
}

// Charge effects stay close to the body; the danger boundary remains unobscured.
export function drawBossCharge(c,boss,time,reducedMotion=false){
  if(!(boss.windup>0))return;
  const def=bossDefinition(boss),p=clamp(1-boss.windup/def.windup,0,1),phase=reducedMotion?0:time;
  c.save();c.globalAlpha=.5+p*.5;
  if(def.attack==='cone'){
    c.rotate(boss.attackAngle);glow(c,54,0,20+p*20,'#fff0a4cc','#ff6a1300');
    for(let i=0;i<7;i++){const a=i*TAU/7+phase*.8,r=15+(1-p)*18;circle(c,54+Math.cos(a)*r,Math.sin(a)*r,2,'#ffcf63');}
    polygon(c,[[53,-7],[67,-11],[62,-3],[77,0],[63,4],[67,10],[53,7]],'#ffd267');
  }else if(def.attack==='frost'){
    for(let i=0;i<7;i++){const a=i*TAU/7+phase*.4,r=65-p*10;iceShard(c,Math.cos(a)*r,Math.sin(a)*r,8+p*6,a);}
    glow(c,0,0,50,'#b4f4ff55','#91dfff00');
  }else if(def.attack==='ring'){
    c.strokeStyle=def.accent;c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,60+i*8,phase+i*2.1,phase+i*2.1+1.3);c.stroke();}
    glow(c,7,0,34,'#d8aeff77','#a46bff00');
  }else{
    glow(c,0,0,60,'#e4b86a44','#bd9b4800');
    for(let i=0;i<6;i++){const a=i*TAU/6,r=63,x=Math.cos(a)*r,y=Math.sin(a)*r-(reducedMotion?4:p*12);polygon(c,[[x-4,y],[x,y-6],[x+5,y],[x,y+3]],'#c4b385','#635d46');}
  }
  c.restore();
}
