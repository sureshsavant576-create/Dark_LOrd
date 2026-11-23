const MAX_IMAGE_BYTES = 150 * 1024;

const signatures = {
  png: Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
  jpeg: Buffer.from([0xff,0xd8,0xff])
};

function validateImageDataUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw Object.assign(new Error('Choose a PNG, JPEG or WebP image.'), { status: 400 });
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw Object.assign(new Error('Only PNG, JPEG or WebP images are accepted.'), { status: 400 });
  const [, type, encoded] = match;
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== encoded) {
    throw Object.assign(new Error('The image must be valid and no larger than 150 KB.'), { status: 400 });
  }
  const valid = type === 'png'
    ? bytes.length >= 33 && bytes.subarray(0, signatures.png.length).equals(signatures.png)
    : type === 'jpeg'
      ? bytes.length >= 4 && bytes.subarray(0, signatures.jpeg.length).equals(signatures.jpeg) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
      : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw Object.assign(new Error('The file content does not match a supported image format.'), { status: 400 });
  return value;
}

module.exports = { MAX_IMAGE_BYTES, validateImageDataUrl };
