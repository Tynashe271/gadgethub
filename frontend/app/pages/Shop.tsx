// app/pages/Shop.tsx
'use client';

import { ProductGrid } from '../components/ProductGrid';
import type { Product } from '@/types';

interface ShopProps {
  products: Product[];
  categories: string[];
  category: string;
  onCategoryChange: (c: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (p: Product) => void;
  onAdd: (p: Product) => void;
  onWish: (p: Product) => void;
  wishlist: string[];
  onCompare: (p: Product) => void;
}

export function Shop({
  products,
  categories,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  onSelect,
  onAdd,
  onWish,
  wishlist,
  onCompare,
}: ShopProps) {
  return (
    <section className="shop shell page">
      <div className="section-head">
        <div>
          <span className="kicker">THE COLLECTION</span>
          <h2>
            Find your next <em>essential.</em>
          </h2>
        </div>
        <p>
          Search, filter and compare verified devices. Live stock is loaded from
          GadgetHub&apos;s catalogue.
        </p>
      </div>
      <div className="tools">
        <div className="filters">
          {categories.map((cat) => (
            <button
              className={category === cat ? 'active' : ''}
              onClick={() => onCategoryChange(cat)}
              key={cat}
              aria-pressed={category === cat}
            >
              {cat}
            </button>
          ))}
        </div>
        <label className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
        </label>
      </div>
      <ProductGrid
        products={products}
        onSelect={onSelect}
        onAdd={onAdd}
        onWish={onWish}
        wishlist={wishlist}
        onCompare={onCompare}
      />
    </section>
  );
}
