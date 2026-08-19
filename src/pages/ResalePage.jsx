import { useState } from 'react'
import { BumpWorklist } from '../components/resale/BumpWorklist'
import { ListingComposer } from '../components/resale/ListingComposer'
import { MarkSoldForm } from '../components/resale/MarkSoldForm'
import { PublishPanel } from '../components/resale/PublishPanel'
import { ResaleItemForm } from '../components/resale/ResaleItemForm'
import { ResaleItemList } from '../components/resale/ResaleItemList'
import { Modal } from '../components/ui/Modal'
import { useResaleItems } from '../hooks/useResale'
import { LISTED } from '../domain/resale/types'

/** The listing a stock item is currently working through, if any. */
function activeListing(item) {
  const listings = item?.resale_listings ?? []
  return listings.find(l => l.state === LISTED)
    ?? listings.find(l => l.state === 'draft')
    ?? listings.find(l => l.state === 'delisted')
    ?? null
}

export function ResalePage() {
  const {
    items, loading, error, refetch,
    createItem, updateItem, deleteItem,
    createListing, updateListing, publish, bump, markSold,
  } = useResaleItems()

  // null = closed. Each holds the item being worked on.
  const [editing, setEditing] = useState(null)     // {} for add, item for edit
  const [composing, setComposing] = useState(null)
  const [publishing, setPublishing] = useState(null)
  const [selling, setSelling] = useState(null)

  async function handleSaveItem(payload) {
    if (editing?.id) return updateItem(editing.id, payload)
    const created = await createItem(payload)
    // Photos need an item_id, so reopen in edit mode rather than making the
    // user find the item again to attach them.
    setEditing(created)
    return created
  }

  /** Compose against the item's working listing, creating one on first use. */
  async function handleSaveCopy(copy) {
    const listing = activeListing(composing)
    if (listing) await updateListing(listing.id, copy)
    else await createListing({ item_id: composing.id, ...copy })
    setComposing(null)
  }

  function openFor(item, setter) {
    setter(item)
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Resale</h2>
        <button className="btn btn--primary" onClick={() => setEditing({})}>+ Add</button>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      <BumpWorklist items={items} onBump={bump} onRefresh={refetch} />

      <ResaleItemList
        items={items}
        loading={loading}
        onSelect={item => openFor(item, activeListing(item)?.state === LISTED
          ? setSelling
          : activeListing(item)
            ? setPublishing
            : setComposing)}
      />

      {editing !== null && (
        <ResaleItemForm
          item={editing?.id ? editing : null}
          onSave={handleSaveItem}
          onDelete={deleteItem}
          onClose={() => setEditing(null)}
          onPhotosChange={refetch}
        />
      )}

      {composing && (
        <Modal title={`Listing copy — ${composing.name}`} onClose={() => setComposing(null)}>
          <ListingComposer
            item={composing}
            listing={activeListing(composing)}
            onSave={handleSaveCopy}
            onCancel={() => setComposing(null)}
          />
        </Modal>
      )}

      {publishing && (
        <Modal title={`Publish — ${publishing.name}`} onClose={() => setPublishing(null)}>
          <PublishPanel
            item={publishing}
            listing={activeListing(publishing)}
            onPublish={publish}
            onDone={() => setPublishing(null)}
          />
        </Modal>
      )}

      {selling && (
        <Modal title={`Mark sold — ${selling.name}`} onClose={() => setSelling(null)}>
          <MarkSoldForm
            listing={activeListing(selling)}
            item={selling}
            onMarkSold={markSold}
            onCancel={() => setSelling(null)}
            onDone={() => setSelling(null)}
          />
        </Modal>
      )}
    </div>
  )
}
