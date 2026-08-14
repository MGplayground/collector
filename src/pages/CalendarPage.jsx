import { useState } from 'react'
import { CalendarList } from '../components/calendar/CalendarList'
import { ReleaseForm } from '../components/calendar/ReleaseForm'
import { useReleaseCalendar } from '../hooks/useReleaseCalendar'

export function CalendarPage() {
  const { releases, loading, create, update, remove } = useReleaseCalendar()
  const [formRelease, setFormRelease] = useState(null)

  async function handleSave(data) {
    if (formRelease?.id) await update(formRelease.id, data)
    else await create(data)
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Releases</h2>
        <button className="btn btn--primary" onClick={() => setFormRelease({})}>+ Add</button>
      </div>
      <CalendarList
        releases={releases}
        loading={loading}
        onEdit={r => setFormRelease(r)}
        onAdd={() => setFormRelease({})}
      />
      {formRelease !== null && (
        <ReleaseForm
          release={formRelease?.id ? formRelease : null}
          onSave={handleSave}
          onDelete={remove}
          onClose={() => setFormRelease(null)}
        />
      )}
    </div>
  )
}
