import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const SIZE=128,PIXEL_BYTES=SIZE*SIZE*4;
const crcTable=Array.from({length:256},(_,value)=>{
  for(let i=0;i<8;i++)value=value&1?0xedb88320^(value>>>1):value>>>1;
  return value>>>0;
});
function chunk(type,data){
  const tag=Buffer.from(type),payload=Buffer.concat([tag,data]);let crc=0xffffffff;
  for(const byte of payload)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  const header=Buffer.alloc(4),tail=Buffer.alloc(4);header.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([header,payload,tail]);
}

// Accept a fixed-size pixel buffer, never arbitrary image files, SVG, URLs or
// metadata. Produce a canonical PNG with bounded memory and no image decoder.
export function encodeAvatar(pixels){
  const invalid=()=>Object.assign(new Error('Gambar avatar tidak valid. Pilih ulang gambar di editor avatar.'),{status:400});
  if(typeof pixels!=='string'||pixels.length!==Math.ceil(PIXEL_BYTES/3)*4||!/^[A-Za-z0-9+/]+={2}$/.test(pixels))throw invalid();
  const rgba=Buffer.from(pixels,'base64');
  if(rgba.length!==PIXEL_BYTES||rgba.toString('base64')!==pixels)throw invalid();
  const rows=Buffer.alloc(SIZE*(SIZE*4+1));
  for(let y=0;y<SIZE;y++)rgba.copy(rows,y*(SIZE*4+1)+1,y*SIZE*4,(y+1)*SIZE*4);
  const header=Buffer.alloc(13);header.writeUInt32BE(SIZE,0);header.writeUInt32BE(SIZE,4);header[8]=8;header[9]=6;
  const data=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
  return {id:createHash('sha256').update(rgba).digest('hex'),data};
}
