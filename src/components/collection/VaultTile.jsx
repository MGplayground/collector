import { useTilt } from '../../hooks/useTilt'
import { isSealed, isSlabbed } from '../../lib/itemTypes'

const CAT_LABELS = {
  pokemon: 'Pokémon', yugioh: 'Yu-Gi-Oh!', dragonball: 'Dragon Ball Z',
  riftbound: 'Riftbound', other: 'Other',
}

// Cards: flat plane, wide tilt, foil. Sealed: gentle tilt, gloss sweep, no foil.
const CARD_TILT   = { maxTilt: 15, scale: 1.04 }
const SEALED_TILT = { maxTilt: 6,  scale: 1.02 }

function fmt(n) {
  if (n == null) return null
  return '£' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 })
}

export function VaultTile({ item, onSelect }) {
  const sealed = isSealed(item.item_type)
  const slabbed = isSlabbed(item)
  const ref = useTilt(sealed ? SEALED_TILT : CARD_TILT)

  // Foil belongs to actual card artwork — never to sealed product or a placeholder.
  const foil = !sealed && Boolean(item.image_url)

  const face = (
    <div className="vault-tile__face">
      {item.image_url ? (
        <img src={item.image_url} alt="" className="vault-tile__img" loading="lazy" />
      ) : (
        <div className="vault-tile__placeholder">
          <span className="vault-tile__placeholder-cat mono">{CAT_LABELS[item.category] ?? item.category}</span>
          <span className="vault-tile__placeholder-name">{item.name}</span>
          <span className="vault-tile__placeholder-hint mono">No photo yet</span>
        </div>
      )}
      {sealed && item.quantity > 1 && (
        <span className="vault-tile__qty mono">×{item.quantity}</span>
      )}
      {foil && <span className="vault-tile__holo" aria-hidden="true" />}
      <span className="vault-tile__glare" aria-hidden="true" />
    </div>
  )

  return (
    <figure className="vault-figure">
      <button
        type="button"
        ref={ref}
        className={[
          'vault-tile',
          sealed ? 'vault-tile--sealed' : 'vault-tile--card',
          item.item_type === 'booster_pack' ? 'vault-tile--pack' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => onSelect(item)}
        aria-label={`Open ${item.name}`}
      >
        {slabbed ? (
          <span className="vault-tile__slab">
            <span className="vault-tile__slab-label">
              <span className="vault-tile__slab-co mono">{item.grade_company}</span>
              <span className="vault-tile__slab-grade mono">{item.grade}</span>
            </span>
            {face}
          </span>
        ) : face}
      </button>

      <figcaption className="vault-caption">
        <span className="vault-caption__name">{item.name}</span>
        <span className="vault-caption__meta mono">
          {fmt(item.current_value) ?? '—'}
          {item.is_raw ? ' · raw' : item.grade ? ` · ${item.grade_company} ${item.grade}` : ''}
        </span>
      </figcaption>
    </figure>
  )
}
