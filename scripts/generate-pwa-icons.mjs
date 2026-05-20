import sharp from 'sharp'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const publicDir = join(rootDir, 'public')

const SOURCE_CANDIDATES = [
  join(rootDir, 'logo.jpeg'),
  join(rootDir, 'logo.png.jpeg'),
  join(rootDir, 'logo.png'),
]

const sourcePath = SOURCE_CANDIDATES.find(path => existsSync(path))
if (!sourcePath) {
  throw new Error('Logo file not found. Add logo.jpeg to the project root.')
}

const BACKGROUND = '#ffffff'
const PADDING_RATIO = 0.1

async function generateIcon(size, filename) {
  const padding = Math.round(size * PADDING_RATIO)
  const inner = size - padding * 2

  const logo = await sharp(sourcePath)
    .resize(inner, inner, {
      fit: 'contain',
      background: BACKGROUND,
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(publicDir, filename))
}

await generateIcon(192, 'icon-192.png')
await generateIcon(512, 'icon-512.png')
await generateIcon(180, 'apple-touch-icon.png')

console.log(`Generated PWA icons from ${sourcePath}`)
