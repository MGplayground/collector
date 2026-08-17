import { supabase } from '../lib/supabase'

export async function getPriceHistory(itemId) {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('item_id', itemId)
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data
}

// Paired write: always call this instead of updating items.current_value directly.
// If the items UPDATE fails, we compensate by deleting the inserted price_history row
// so the DB is not left with a dangling row and a stale current_value.
export async function logPrice(itemId, price, note = null) {
  const { data: inserted, error: historyError } = await supabase
    .from('price_history')
    .insert({ item_id: itemId, price, note })
    .select('id')
    .single()
  if (historyError) throw historyError

  const { error: itemError } = await supabase
    .from('items')
    .update({ current_value: price })
    .eq('id', itemId)
  if (itemError) {
    // Compensating rollback: remove the orphaned price_history row.
    const { error: rollbackError } = await supabase
      .from('price_history').delete().eq('id', inserted.id)
    if (rollbackError) {
      // The rollback is the only thing preventing a dangling row, so its own
      // failure must not pass silently.
      console.error('logPrice rollback failed; price_history row %s is orphaned',
        inserted.id, rollbackError)
    }
    throw itemError
  }
}

export async function getAllPriceHistory() {
  const { data, error } = await supabase
    .from('price_history')
    .select('*, items(name, category, status)')
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data
}
