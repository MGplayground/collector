import { supabase } from '../lib/supabase'

export async function getItems({ status, category, minValue, maxValue, sortBy } = {}) {
  let query = supabase.from('items').select('*')

  if (status)    query = query.eq('status', status)
  if (category)  query = query.eq('category', category)
  if (minValue != null) query = query.gte('current_value', minValue)
  if (maxValue != null) query = query.lte('current_value', maxValue)

  const sortMap = {
    value_desc:   { column: 'current_value', ascending: false },
    value_asc:    { column: 'current_value', ascending: true },
    gain_desc:    { column: 'current_value', ascending: false }, // computed client-side
    date_desc:    { column: 'created_at',    ascending: false },
  }
  const sort = sortMap[sortBy] ?? sortMap.date_desc
  query = query.order(sort.column, { ascending: sort.ascending })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createItem(data) {
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return item
}

export async function updateItem(id, data) {
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return item
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}
