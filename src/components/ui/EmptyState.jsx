export function EmptyState({ title, body }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {body && <p>{body}</p>}
    </div>
  )
}
