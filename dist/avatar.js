const SIZE=128,STORAGE_KEY='bonk-avatar-v1';
const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
function canvas(width=SIZE,height=width){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
function decode(source){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Gambar tidak bisa dibaca. Pilih PNG, JPG, atau WebP lain.'));image.src=source;});}
function pixels(image){const bytes=image.getContext('2d').getImageData(0,0,SIZE,SIZE).data;let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function preset(kind){
  const image=canvas(),c=image.getContext('2d');
  const circle=(x,y,r,fill)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();};
  const poly=(points,fill)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();};
  circle(64,64,64,kind==='cat'?'#354d3a':kind==='robot'?'#233f52':'#372c50');
  if(kind==='cat'){
    poly([[23,56],[19,13],[52,35],[78,35],[111,13],[105,60]],'#e6b570');circle(64,72,45,'#e6b570');
    poly([[28,45],[27,24],[44,39]],'#ca8774');poly([[85,39],[103,24],[99,45]],'#ca8774');
    for(const x of [45,83]){circle(x,64,7,'#304b40');circle(x-2,62,2,'#fff3cc');}
    poly([[57,81],[71,81],[64,88]],'#9f635e');c.strokeStyle='#765a43';c.lineWidth=3;c.beginPath();c.moveTo(64,88);c.lineTo(64,94);c.moveTo(35,83);c.lineTo(12,78);c.moveTo(35,91);c.lineTo(11,95);c.moveTo(93,83);c.lineTo(116,78);c.moveTo(93,91);c.lineTo(117,95);c.stroke();
  }else if(kind==='robot'){
    c.fillStyle='#9bbfc5';c.beginPath();c.roundRect(20,31,88,75,17);c.fill();c.fillStyle='#345366';c.fillRect(61,18,6,18);circle(64,17,7,'#edc777');
    c.fillStyle='#273c4a';c.beginPath();c.roundRect(30,47,68,31,8);c.fill();for(const x of [47,81])circle(x,62,8,'#a7f4df');
    c.fillStyle='#526d79';c.fillRect(44,90,40,6);c.fillStyle='#e4f1db';c.fillRect(34,36,53,5);
  }else{
    circle(64,67,50,'#586278');poly([[14,55],[21,33],[109,33],[115,55]],'#c9857b');
    c.fillStyle='#e9bc92';c.beginPath();c.roundRect(25,50,78,29,12);c.fill();
    for(const x of [45,83]){circle(x,63,6,'#303746');circle(x-1,61,1.8,'#fff3d3');}
    poly([[18,79],[110,79],[99,113],[32,113]],'#354152');poly([[87,35],[123,19],[116,42],[97,49]],'#c9857b');
  }
  return image;
}

export function createAvatarCustomizer(){
  const $=id=>document.getElementById(id),dialog=$('avatar-dialog'),preview=$('avatar-crop'),c=preview.getContext('2d');
  const output=canvas();let image=null,encoded=null,source=null,zoom=1,panX=0,panY=0,generation=0,drag=null,busy=false;
  const message=text=>{$('avatar-feedback').textContent=text;};
  function setBusy(value){busy=value;$('avatar-apply').disabled=value;$('avatar-file').disabled=value;}
  function resetCrop(){zoom=1;panX=0;panY=0;render();}
  function render(){
    const o=output.getContext('2d');o.clearRect(0,0,SIZE,SIZE);
    if(source){const scale=Math.max(SIZE/source.width,SIZE/source.height)*zoom,w=source.width*scale,h=source.height*scale;o.drawImage(source,(SIZE-w)/2+panX/100*(w-SIZE)/2,(SIZE-h)/2+panY/100*(h-SIZE)/2,w,h);}
    c.clearRect(0,0,256,256);c.save();c.beginPath();c.arc(128,128,116,0,Math.PI*2);c.clip();c.fillStyle='#324b3e';c.fillRect(0,0,256,256);
    if(source)c.drawImage(output,12,12,232,232);else{c.fillStyle='#e6b56e';c.beginPath();c.arc(128,128,76,0,Math.PI*2);c.fill();for(const x of [103,153]){c.fillStyle='#fff7de';c.beginPath();c.arc(x,119,13,0,Math.PI*2);c.fill();c.fillStyle='#304a3e';c.beginPath();c.arc(x+3,119,6,0,Math.PI*2);c.fill();}}
    c.restore();c.strokeStyle='#ddeb85';c.lineWidth=3;c.beginPath();c.arc(128,128,117,0,Math.PI*2);c.stroke();
    $('avatar-zoom').value=String(zoom);$('avatar-pan-x').value=String(panX);$('avatar-pan-y').value=String(panY);$('avatar-zoom-value').textContent=zoom.toFixed(1)+'×';
    for(const id of ['avatar-zoom','avatar-pan-x','avatar-pan-y','avatar-rotate','avatar-flip'])$(id).disabled=!source;
  }
  function status(){ $('avatar-summary').textContent=image?'Avatar custom aktif · terlihat oleh pemain lain':'Avatar bawaan · pilih gambar atau preset'; }
  const ready=(async()=>{
    let saved;try{saved=localStorage.getItem(STORAGE_KEY);}catch{/* Storage can be disabled. */}
    if(saved&&saved.length<120000&&/^data:image\/png;base64,/.test(saved)){
      try{const decoded=await decode(saved);if(decoded.width===SIZE&&decoded.height===SIZE){image=canvas();image.getContext('2d').drawImage(decoded,0,0);encoded=pixels(image);}}catch{/* Ignore a corrupted saved image. */}
    }
    status();
  })();
  $('customize-avatar').onclick=async()=>{await ready;if(dialog.open)return;source=image;message('');resetCrop();dialog.showModal();};
  function close(){generation++;setBusy(false);dialog.close();drag=null;$('avatar-file').value='';}
  $('avatar-cancel').onclick=close;$('avatar-close').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  $('avatar-file').onchange=async()=>{
    const file=$('avatar-file').files[0];if(!file)return;const version=++generation;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){message('Gunakan gambar PNG, JPG, atau WebP.');$('avatar-file').value='';return;}
    if(file.size>5*1024*1024){message('Ukuran gambar maksimal 5 MB.');$('avatar-file').value='';return;}
    setBusy(true);message('Menyiapkan gambar…');const url=URL.createObjectURL(file);
    try{
      const decoded=await decode(url);if(version!==generation||!dialog.open)return;
      if(decoded.width>8192||decoded.height>8192||decoded.width*decoded.height>24_000_000)throw new Error('Resolusi terlalu besar. Gunakan gambar maksimal 24 megapiksel dan sisi 8192 piksel.');
      const scale=Math.min(1,1024/Math.max(decoded.width,decoded.height));source=canvas(Math.max(1,Math.round(decoded.width*scale)),Math.max(1,Math.round(decoded.height*scale)));source.getContext('2d').drawImage(decoded,0,0,source.width,source.height);resetCrop();message('Geser gambar atau gunakan pengaturan posisi untuk memilih crop.');
    }catch(error){if(version===generation)message(error.message);}
    finally{URL.revokeObjectURL(url);if(version===generation){setBusy(false);$('avatar-file').value='';}}
  };
  for(const button of dialog.querySelectorAll('[data-avatar-preset]'))button.onclick=()=>{generation++;setBusy(false);source=button.dataset.avatarPreset==='default'?null:preset(button.dataset.avatarPreset);resetCrop();message('Pratinjau siap. Klik Pakai Avatar untuk menyimpan.');};
  for(const [id,update] of [['avatar-zoom',value=>zoom=value],['avatar-pan-x',value=>panX=value],['avatar-pan-y',value=>panY=value]])$(id).oninput=event=>{update(Number(event.target.value));render();};
  preview.onpointerdown=event=>{if(!source||busy)return;event.preventDefault();drag={id:event.pointerId,x:event.clientX,y:event.clientY};preview.setPointerCapture(event.pointerId);};
  preview.onpointermove=event=>{
    if(!drag||drag.id!==event.pointerId||!source)return;const rect=preview.getBoundingClientRect(),scale=Math.max(SIZE/source.width,SIZE/source.height)*zoom;
    const dx=(event.clientX-drag.x)*SIZE/(rect.width*232/256),dy=(event.clientY-drag.y)*SIZE/(rect.height*232/256),excessX=source.width*scale-SIZE,excessY=source.height*scale-SIZE;
    if(excessX>0)panX=bound(panX+dx/excessX*200,-100,100);if(excessY>0)panY=bound(panY+dy/excessY*200,-100,100);drag.x=event.clientX;drag.y=event.clientY;render();
  };
  preview.onpointerup=preview.onpointercancel=preview.onlostpointercapture=()=>{drag=null;};
  $('avatar-rotate').onclick=()=>{if(!source)return;const rotated=canvas(source.height,source.width),r=rotated.getContext('2d');r.translate(rotated.width,0);r.rotate(Math.PI/2);r.drawImage(source,0,0);source=rotated;resetCrop();};
  $('avatar-flip').onclick=()=>{if(!source)return;const flipped=canvas(source.width,source.height),f=flipped.getContext('2d');f.translate(flipped.width,0);f.scale(-1,1);f.drawImage(source,0,0);source=flipped;panX=-panX;render();};
  $('avatar-apply').onclick=()=>{
    if(busy)return;
    image=source?canvas():null;if(image)image.getContext('2d').drawImage(output,0,0);encoded=image?pixels(image):null;
    let stored=true;try{if(image)localStorage.setItem(STORAGE_KEY,image.toDataURL('image/png'));else localStorage.removeItem(STORAGE_KEY);}catch{stored=false;}
    status();close();if(!stored)$('avatar-summary').textContent='Avatar aktif untuk sesi ini; penyimpanan browser tidak tersedia.';
  };
  return {ready,get image(){return image;},get pixels(){return encoded;}};
}

export class AvatarTextureCache{
  constructor(){this.entries=new Map();}
  get(id){return this.entries.get(id)?.image||null;}
  prime(id,image){if(id&&image)this.entries.set(id,{image,tries:0,nextTry:0});}
  clear(){for(const entry of this.entries.values())entry.controller?.abort();this.entries.clear();}
  sync(actors,client){
    const ids=new Set(actors.map(a=>a.avatarId).filter(id=>/^[a-f0-9]{64}$/.test(id||'')));
    for(const [id,entry] of this.entries)if(!ids.has(id)){entry.controller?.abort();this.entries.delete(id);}
    for(const id of ids){
      let entry=this.entries.get(id);if(!entry){entry={tries:0,nextTry:0,image:null};this.entries.set(id,entry);}
      if(!entry.image&&!entry.loading&&entry.tries<3&&Date.now()>=entry.nextTry)void this.load(id,entry,client);
    }
  }
  async load(id,entry,client){
    entry.loading=true;entry.tries++;const controller=new AbortController();entry.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),8000);let url;
    try{
      const response=await client.fetcher(client.base+'/api/avatar/'+id,{headers:{Authorization:'Bearer '+client.token},signal:controller.signal});
      if(!response.ok)throw new Error('Avatar unavailable');
      url=URL.createObjectURL(await response.blob());const image=await decode(url);
      if(this.entries.get(id)===entry&&!client.closed)entry.image=image;
    }catch{entry.nextTry=Date.now()+5000;}
    finally{if(url)URL.revokeObjectURL(url);clearTimeout(timeout);entry.loading=false;}
  }
}
