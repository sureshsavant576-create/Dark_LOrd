const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MAX_IMAGE_BYTES,validateImageDataUrl}=require('../server/uploads');

test('image uploads accept supported formats with matching file signatures',()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=','base64');
  const jpeg=Buffer.from([0xff,0xd8,0xff,0xd9]);
  const webp=Buffer.from('RIFF\x04\x00\x00\x00WEBP','binary');
  assert.equal(validateImageDataUrl(`data:image/png;base64,${png.toString('base64')}`),`data:image/png;base64,${png.toString('base64')}`);
  assert.equal(validateImageDataUrl(`data:image/jpeg;base64,${jpeg.toString('base64')}`),`data:image/jpeg;base64,${jpeg.toString('base64')}`);
  assert.equal(validateImageDataUrl(`data:image/webp;base64,${webp.toString('base64')}`),`data:image/webp;base64,${webp.toString('base64')}`);
  assert.equal(validateImageDataUrl(null),null);
});

test('image uploads reject active content, mismatched signatures and oversized data',()=>{
  assert.throws(()=>validateImageDataUrl('data:image/svg+xml;base64,PHN2Zy8+'),{status:400});
  assert.throws(()=>validateImageDataUrl(`data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`),{status:400});
  assert.throws(()=>validateImageDataUrl(`data:image/jpeg;base64,${Buffer.from([0xff,0xd8,0xff,0x00]).toString('base64')}`),{status:400});
  const huge=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.alloc(MAX_IMAGE_BYTES)]);
  assert.throws(()=>validateImageDataUrl(`data:image/png;base64,${huge.toString('base64')}`),{status:400});
  assert.throws(()=>validateImageDataUrl('https://example.com/image.png'),{status:400});
});
