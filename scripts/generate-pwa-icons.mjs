import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

function buildSvg(size) {
  const center = size / 2
  const radius = size * 0.34
  const fontSize = Math.round(size * 0.28)
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1a1a1a"/>
  <circle cx="${center}" cy="${center}" r="${radius}" fill="#c85c2d"/>
  <text x="${center}" y="${center + fontSize * 0.35}" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700">SS</text>
</svg>`
}

async function generate(size, filename) {
  const png = await sharp(Buffer.from(buildSvg(size))).png().toBuffer()
  writeFileSync(join(publicDir, filename), png)
}

await generate(192, 'icon-192.png')
await generate(512, 'icon-512.png')
console.log('Generated public/icon-192.png and public/icon-512.png')
