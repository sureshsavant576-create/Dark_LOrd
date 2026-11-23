// Minimal QR Model 2 encoder for the short ASCII LabLink equipment identifiers.
// Version 1-L is enough for LABLINK-EQ-000001 (17 bytes). No runtime QR dependency is required.
function gfMultiply(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11d);if(((y>>>i)&1)!==0)z^=x;}return z;}
function reedSolomon(data,degree){let generator=[1];for(let i=0;i<degree;i++){const next=Array(generator.length+1).fill(0);for(let j=0;j<generator.length;j++){next[j]^=generator[j];next[j+1]^=gfMultiply(generator[j],1<<i);}generator=next;}const remainder=[...data,...Array(degree).fill(0)];for(let i=0;i<data.length;i++){const factor=remainder[i];if(factor)for(let j=0;j<generator.length;j++)remainder[i+j]^=gfMultiply(generator[j],factor);}return remainder.slice(data.length);}
function encodeEquipmentQr(payload){
 const bytes=Array.from(Buffer.from(String(payload),'ascii'));if(!bytes.length||bytes.length>17||bytes.some(b=>b>0x7f))throw new Error('Equipment QR payload must be 1–17 ASCII characters.');
 const bits=[];const append=(value,count)=>{for(let i=count-1;i>=0;i--)bits.push((value>>>i)&1);};append(4,4);append(bytes.length,8);for(const b of bytes)append(b,8);for(let i=0;i<Math.min(4,152-bits.length);i++)bits.push(0);while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8){let v=0;for(let j=0;j<8;j++)v=(v<<1)|bits[i+j];data.push(v);}for(let pad=0;data.length<19;pad++)data.push(pad%2?0x11:0xec);const codewords=[...data,...reedSolomon(data,7)];
 const size=21,matrix=Array.from({length:size},()=>Array(size).fill(false)),reserved=Array.from({length:size},()=>Array(size).fill(false));const set=(x,y,dark)=>{if(x>=0&&x<size&&y>=0&&y<size){matrix[y][x]=!!dark;reserved[y][x]=true;}};
 const finder=(left,top)=>{for(let dy=-1;dy<=7;dy++)for(let dx=-1;dx<=7;dx++){const x=left+dx,y=top+dy;if(x<0||x>=size||y<0||y>=size)continue;const on=dx>=0&&dx<=6&&dy>=0&&dy<=6&&(dx===0||dx===6||dy===0||dy===6||(dx>=2&&dx<=4&&dy>=2&&dy<=4));set(x,y,on);}};
 finder(0,0);finder(size-7,0);finder(0,size-7);for(let i=8;i<size-8;i++){set(i,6,i%2===0);set(6,i,i%2===0);}
 const formatData=8;let rem=formatData;for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);const formatBits=((formatData<<10)|rem)^0x5412;const bit=i=>((formatBits>>>i)&1)!==0;
 for(let i=0;i<=5;i++)set(8,i,bit(i));set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));for(let i=9;i<15;i++)set(14-i,8,bit(i));for(let i=0;i<8;i++)set(size-1-i,8,bit(i));for(let i=8;i<15;i++)set(8,size-15+i,bit(i));set(8,size-8,true);
 let bitIndex=0;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;const upward=((right+1)&2)===0;for(let vert=0;vert<size;vert++){const y=upward?size-1-vert:vert;for(let j=0;j<2;j++){const x=right-j;if(reserved[y][x])continue;let dark=bitIndex<codewords.length*8?((codewords[bitIndex>>>3]>>>(7-(bitIndex&7)))&1)!==0:false;bitIndex++;if((x+y)%2===0)dark=!dark;matrix[y][x]=dark;}}}
 return {size,matrix};
}
module.exports={encodeEquipmentQr};
