import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'

const BUCKET = 'card-images'

/**
 * Compress, upload, and return the public CDN URL for an item photo.
 * The caller stores that URL on items.image_url.
 */
export async function uploadItemImage(file) {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.jpg`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Removing a photo only clears items.image_url — the object stays in the bucket.
 * Deleting here would destroy the file even if the user then cancels the form,
 * leaving the saved item pointing at nothing. Orphans are the safer failure.
 */
export function isManagedImage(url) {
  return typeof url === 'string' && url.includes(`/${BUCKET}/`)
}
