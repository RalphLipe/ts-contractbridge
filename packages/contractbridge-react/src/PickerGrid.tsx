import type { CSSProperties, JSX, ReactNode } from 'react'

export type PickerGridProps<Item> = {
  readonly items: readonly Item[]
  readonly selected: Item | undefined
  readonly columns: number
  readonly aspectRatio: number
  // If the selected item is clicked again, selection becomes undefined; otherwise clicking the
  // selected item again does nothing (matches the Swift reference's bid grid, which never lets
  // you clear a bid by re-clicking it — only Pass clears it).
  readonly allowNilSelection: boolean
  readonly onSelect: (item: Item | undefined) => void
  readonly itemKey: (item: Item) => string
  readonly renderItem: (item: Item) => ReactNode
  readonly itemStyle?: (item: Item) => CSSProperties
}

// A single-selection grid of buttons, one per item, with rounded outer corners and a highlighted
// cell for the current selection. Not exported from the package — an internal building block for
// BiddingBox and ContractPicker's declarer picker, same as the Swift reference's own (non-public)
// PickerGrid. Unlike the reference, selection changes are not animated; that was called out as a
// nice-to-have, not a requirement.
export function PickerGrid<Item>({
  items, selected, columns, aspectRatio, allowNilSelection, onSelect, itemKey, renderItem, itemStyle,
}: PickerGridProps<Item>): JSX.Element {
  const selectedKey = selected === undefined ? undefined : itemKey(selected)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1px',
        background: 'var(--cb-bidbox-border, #999)',
        border: '1px solid var(--cb-bidbox-border, #999)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {items.map(item => {
        const key = itemKey(item)
        const isSelected = key === selectedKey
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected && allowNilSelection ? undefined : item)}
            style={{
              aspectRatio,
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.15em',
              background: isSelected
                ? 'var(--cb-bidbox-selected-bg, #ffffff)'
                : 'var(--cb-bidbox-cell-bg, transparent)',
              ...itemStyle?.(item),
            }}
          >
            {renderItem(item)}
          </button>
        )
      })}
    </div>
  )
}
