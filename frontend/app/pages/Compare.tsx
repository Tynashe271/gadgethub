// app/pages/Compare.tsx
'use client';

import type { Product } from '@/types';

interface CompareProps {
  products: Product[];
  allProducts: Product[];
  onToggle: (p: Product) => void;
}

function comparisonValue(p: Product, label: string): string {
  if (label === 'Price')
    return `$${Number(p.discountPrice ?? p.price).toLocaleString()}`;
  if (label === 'Condition') return p.condition?.replaceAll('_', ' ') || '—';
  if (label === 'Warranty') return `${p.warrantyMonths || 0} months`;
  if (label === 'Availability')
    return p.variants?.some((v) => (v.inventory?.quantity || 0) > 0)
      ? 'In stock'
      : 'Out of stock';
  return (
    p.specifications
      ?.find((s) => s.name.toLowerCase().includes(label.toLowerCase()))
      ?.value ||
    p.variants?.[0]?.[label.toLowerCase() as 'storage' | 'ram'] ||
    '—'
  );
}

export function Compare({ products, allProducts, onToggle }: CompareProps) {
  return (
    <section className="compare-page page shell">
      <span className="kicker">SIDE BY SIDE</span>
      <h2>
        Compare without <em>the confusion.</em>
      </h2>

      {products.length < 2 && (
        <>
          <p className="lead">
            Choose 2–4 products to compare price, storage, memory, camera,
            condition, warranty and availability.
          </p>
          <div className="compare-picks">
            {allProducts.slice(0, 8).map((p) => (
              <button
                onClick={() => onToggle(p)}
                className={
                  products.some((x) => x.id === p.id) ? 'picked' : ''
                }
                key={p.id}
                aria-pressed={products.some((x) => x.id === p.id)}
              >
                {p.name}
                <span>
                  {products.some((x) => x.id === p.id) ? '✓' : '+'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {products.length >= 2 && (
        <div className="compare-table">
          <div className="row heading">
            <b>Feature</b>
            {products.map((p) => (
              <b key={p.id}>
                {p.name}
                <button
                  onClick={() => onToggle(p)}
                  aria-label={`Remove ${p.name} from comparison`}
                >
                  ×
                </button>
              </b>
            ))}
          </div>
          {[
            'Price',
            'Condition',
            'Warranty',
            'Storage',
            'RAM',
            'Camera',
            'Availability',
          ].map((label) => (
            <div className="row" key={label}>
              <span>{label}</span>
              {products.map((p) => (
                <span key={p.id}>{comparisonValue(p, label)}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
