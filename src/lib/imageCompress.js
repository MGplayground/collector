const MAX_EDGE = 1600
const QUALITY = 0.82

/**
 * Downscale a camera photo before upload.
 *
 * A 12MP phone shot is ~4MB against a 1GB storage tier; 1600px at q0.82 lands
 * near 300KB. The bucket also enforces a 5MB per-file cap, so an uncompressed
 * upload would fail server-side anyway.
 */
export async function compressImage(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }

  const source = await loadBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height))
  const width = Math.round(source.width * scale)
  const height = Math.round(source.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  if (typeof source.close === 'function') source.close()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not process that image. Try a different file.')

  // An already-small JPEG can come out bigger after a re-encode — keep the original.
  if (blob.size >= file.size && file.type === 'image/jpeg') return file
  return blob
}

async function loadBitmap(file) {
  // createImageBitmap applies EXIF rotation, so portrait phone shots stay upright.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Older Safari rejects the options argument — fall through to the <img> path.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read that image.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
