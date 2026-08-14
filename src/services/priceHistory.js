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
export async function logPrice(itemId, price, note = null) {
  const { error: historyError } = await supabase
    .from('price_history')
    .insert({ item_id: itemId, price, note })
  if (historyError) throw historyError

  const { error: itemError } = await supabase
    .from('items')
    .update({ current_value: price })
    .eq('id', itemId)
  if (itemError) throw itemError
}

export async function getAllPriceHistory() {
  const { data, error } = await supabase
    .from('price_history')
    .select('*, items(name, category, status)')
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data
}
