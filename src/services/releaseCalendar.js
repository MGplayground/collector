import { supabase } from '../lib/supabase'

export async function getReleases() {
  const { data, error } = await supabase
    .from('release_calendar')
    .select('*')
    .order('release_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createRelease(data) {
  const { data: release, error } = await supabase
    .from('release_calendar').insert(data).select().single()
  if (error) throw error
  return release
}

export async function updateRelease(id, data) {
  const { data: release, error } = await supabase
    .from('release_calendar').update(data).eq('id', id).select().single()
  if (error) throw error
  return release
}

export async function deleteRelease(id) {
  const { error } = await supabase.from('release_calendar').delete().eq('id', id)
  if (error) throw error
}
