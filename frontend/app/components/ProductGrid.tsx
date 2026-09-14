// app/components/ProductGrid.tsx
'use client';

import type { Product } from '@/types';

const marks: Record<string, string> = {
  Phones: '◫',
  Laptops: '▰',
  Audio: '◉',
  Wearables: '⌚',
  Accessories: '◆',
};

interface ProductGridProps {
  products: Product[];
  onSelect: (p: Product) => void;
  onAdd?: (p: Product) => void;
  onWish?: (p: Product) => void;
  wishlist?: string[];
  onCompare?: (p: Product) => void;
}

export function ProductGrid({
  products,
  onSelect,
  onAdd,
  onWish,
  wishlist = [],
  onCompare,
}: ProductGridProps) {
  return (
    <div className="product-grid">
      {products.map((p, i) => (
        <article className="product" key={p.id}>
          <button
            className={`product-art art-${i % 4}`}
            onClick={() => onSelect(p)}
            aria-label={`View ${p.name}`}
          >
            {p.images?.[0]?.url ? (
              <img 
                src={p.images[0].url} 
                alt={p.images[0].alt || p.name}
                loading="lazy"
              />
            ) : (
              <span>{marks[p.category?.name || ''] || '◆'}</span>
            )}
            <small>{p.condition?.replaceAll('_', ' ') || 'AVAILABLE'}</small>
          </button>
          <div className="card-tools">
            {onWish && (
              <button 
                onClick={() => onWish(p)}
                aria-label={wishlist.includes(p.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {wishlist.includes(p.id) ? '♥' : '♡'}
              </button>
            )}
            {onCompare && (
              <button 
                onClick={() => onCompare(p)}
                aria-label="Add to comparison"
              >
                ⇄
              </button>
            )}
            {onAdd && (
              <button 
                onClick={() => onAdd(p)}
                aria-label={`Add ${p.name} to cart`}
              >
                +
              </button>
            )}
          </div>
          <div className="product-meta">
            <span>{p.brand?.name || p.category?.name}</span>
            <h3 onClick={() => onSelect(p)}>{p.name}</h3>
            <div>
              <strong>${Number(p.discountPrice ?? p.price).toLocaleString()}</strong>
              {p.discountPrice && <del>${Number(p.price).toLocaleString()}</del>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
