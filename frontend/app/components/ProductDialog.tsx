// app/components/ProductDialog.tsx
'use client';

import { useEffect } from 'react';
import type { Product } from '@/types';

const marks: Record<string, string> = {
  Phones: '◫',
  Laptops: '▰',
  Audio: '◉',
  Wearables: '⌚',
  Accessories: '◆',
};

interface ProductDialogProps {
  product: Product;
  onClose: () => void;
  onAdd: (p: Product) => void;
  onWish: (p: Product) => void;
  onCompare: (p: Product) => void;
}

export function ProductDialog({
  product,
  onClose,
  onAdd,
  onWish,
  onCompare,
}: ProductDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="modal" 
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-title"
    >
      <article onMouseDown={(e) => e.stopPropagation()}>
        <button 
          className="modal-close" 
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
        <div className="detail-art">
          {product.images?.[0]?.url ? (
            <img 
              src={product.images[0].url} 
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <span>{marks[product.category?.name] || '◆'}</span>
          )}
        </div>
        <div className="detail-copy">
          <span className="kicker">
            {product.brand?.name} · {product.condition?.replaceAll('_', ' ')}
          </span>
          <h2 id="product-title">{product.name}</h2>
          <strong>${Number(product.discountPrice ?? product.price).toLocaleString()}</strong>
          <p>
            {product.description ||
              'A verified GadgetHub device, selected for performance and reliability.'}
          </p>
          <div className="specs">
            {product.specifications?.slice(0, 6).map((s) => (
              <div key={s.name}>
                <small>{s.name}</small>
                <b>{s.value}</b>
              </div>
            ))}
          </div>
          <p className="stock">
            ●{' '}
            {product.variants?.length ? 'Live stock by variant' : 'Available to order'}{' '}
            · {product.warrantyMonths || 12}-month warranty
          </p>
          <button className="primary" onClick={() => onAdd(product)}>
            Add to cart →
          </button>
          <button className="secondary" onClick={() => onWish(product)}>
            ♡ Wishlist
          </button>
          <button className="secondary" onClick={() => onCompare(product)}>
            ⇄ Compare
          </button>
        </div>
      </article>
    </div>
  );
}
