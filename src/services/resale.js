import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'
import { DELISTED, LISTED, SOLD } from '../domain/resale/types'

const PHOTO_BUCKET = 'resale-photos'

// ── items ──────────────────────────────────────────────────────────────────

export async function getResaleItems({ state, category } = {}) {
  let query = supabase
    .from('resale_items')
    .select('*, resale_photos(*), resale_listings(*)')
    .order('created_at', { ascending: false })

  if (state) query = query.eq('state', state)
  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) throw error
  // Photos arrive unordered from PostgREST; position is what the UI relies on.
  return data.map(item => ({
    ...item,
    resale_photos: [...(item.resale_photos ?? [])].sort((a, b) => a.position - b.position),
  }))
}

export async function createResaleItem(payload) {
  const { data, error } = await supabase.from('resale_items').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateResaleItem(id, payload) {
  const { data, error } = await supabase
    .from('resale_items').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteResaleItem(id) {
  const { error } = await supabase.from('resale_items').delete().eq('id', id)
  if (error) throw error
}

// ── photos ─────────────────────────────────────────────────────────────────

/**
 * Compress and upload one photo, then attach it at the end of the item's order.
 * Same compression path as the card tracker: 1600px, q0.82.
 */
export async function addResalePhoto(itemId, file, position) {
  const blob = await compressImage(file)
  const path = `${itemId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('resale_photos')
    .insert({ item_id: itemId, storage_path: path, position })
    .select().single()
  if (error) throw error
  return data
}

export function photoUrl(path) {
  if (!path) return null
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Removing a photo drops the row but leaves the object in the bucket, for the
 * same reason as the card tracker: deleting immediately would strand a saved
 * item on a missing file if the user then backs out.
 */
export async function removeResalePhoto(id) {
  const { error } = await supabase.from('resale_photos').delete().eq('id', id)
  if (error) throw error
}

export async function reorderResalePhotos(ordered) {
  // Renumber via a function that takes only ids. Upserting whole rows would send
  // storage_path back from a possibly stale local copy, and one-by-one updates
  // collide mid-swap because each is its own transaction.
  const { error } = await supabase.rpc('resale_reorder_photos', {
    photo_ids: ordered.map(p => p.id),
  })
  if (error) throw error
}

// ── listings ───────────────────────────────────────────────────────────────

async function logEvent(listingId, event, detail = {}) {
  // Best-effort audit trail: a failed log must not undo the action it describes,
  // but it must not vanish silently either.
  const { error } = await supabase
    .from('resale_listing_events').insert({ listing_id: listingId, event, detail })
  if (error) console.error('resale: failed to log %s for listing %s', event, listingId, error)
}

export async function createListing(payload) {
  const { data, error } = await supabase.from('resale_listings').insert(payload).select().single()
  if (error) throw error
  await logEvent(data.id, 'created')
  return data
}

export async function updateListing(id, payload) {
  // Read the old price first so the audit log records actual price changes
  // rather than every save that happens to include the price field.
  let previousPrice
  if (payload.price !== undefined) {
    const { data: before } = await supabase
      .from('resale_listings').select('price').eq('id', id).maybeSingle()
    previousPrice = before?.price
  }

  const { data, error } = await supabase
    .from('resale_listings').update(payload).eq('id', id).select().single()
  if (error) throw error

  if (payload.price !== undefined && Number(previousPrice) !== Number(payload.price)) {
    await logEvent(id, 'price_changed', { from: previousPrice, to: payload.price })
  }
  return data
}

/**
 * Mark a listing live after publishing it by hand on Depop.
 *
 * The partial unique index means a second live listing for the same item fails
 * at the database rather than quietly creating a duplicate.
 */
export async function publishListing(id, { external_url } = {}) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('resale_listings')
    .update({ state: LISTED, listed_at: now, last_bumped_at: now, external_url })
    .eq('id', id)
    .in('state', ['draft', DELISTED])
    .select().maybeSingle()

  if (error) {
    if (error.code === '23505') throw new Error('This item already has a live listing.')
    throw error
  }
  if (!data) throw new Error('That listing is not in a publishable state — reload and try again.')

  await supabase.from('resale_items').update({ state: 'listed' }).eq('id', data.item_id)
  await logEvent(id, 'published', { external_url })
  return data
}

/**
 * Record a bump.
 *
 * The `.eq('state', LISTED)` is the race guard: if the item sold between the
 * worklist rendering and the tap, no row matches and we say so rather than
 * resurrecting a sold listing.
 */
export async function bumpListing(id) {
  const { data, error } = await supabase
    .from('resale_listings')
    .update({ last_bumped_at: new Date().toISOString() })
    .eq('id', id)
    .eq('state', LISTED)
    .select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('That listing is no longer live — it may have sold.')

  await logEvent(id, 'bumped')
  return data
}

export async function markSold(id, { sold_price, platform_fee, shipping_cost }) {
  const { data, error } = await supabase
    .from('resale_listings')
    .update({
      state: SOLD, sold_at: new Date().toISOString(),
      sold_price, platform_fee, shipping_cost,
    })
    .eq('id', id)
    .eq('state', LISTED)
    .select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('That listing is not live, so it cannot be marked sold.')

  await supabase.from('resale_items').update({ state: 'sold' }).eq('id', data.item_id)
  await logEvent(id, 'sold', { sold_price })
  return data
}

export async function delistListing(id) {
  const { data, error } = await supabase
    .from('resale_listings')
    .update({ state: DELISTED })
    .eq('id', id).eq('state', LISTED)
    .select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('That listing is not live.')

  await supabase.from('resale_items').update({ state: 'ready' }).eq('id', data.item_id)
  await logEvent(id, 'delisted')
  return data
}

export async function getListingEvents(listingId) {
  const { data, error } = await supabase
    .from('resale_listing_events').select('*')
    .eq('listing_id', listingId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── templates ──────────────────────────────────────────────────────────────

export async function getTemplates() {
  const { data, error } = await supabase.from('resale_templates').select('*').order('name')
  if (error) throw error
  return data
}

export async function saveTemplate(payload) {
  const { data, error } = await supabase
    .from('resale_templates').upsert(payload).select().single()
  if (error) throw error
  return data
}
