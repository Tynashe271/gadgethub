// app/pages/Finder.tsx
'use client';

import { FormEvent, useState } from 'react';
import { ProductGrid } from '../components/ProductGrid';
import { api, ApiException } from '../utils/apiClient';
import { finderSchema } from '../schemas/finder';
import type { Product } from '@/types';

interface FinderProps {
  results: Product[];
  products: Product[];
  onResultsChange: (results: Product[]) => void;
  onSelect: (p: Product) => void;
}

export function Finder({ results, products, onResultsChange, onSelect }: FinderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const catalogueMatches = (criteria: { budget: number; brand?: string; condition?: string }) =>
    products.filter((product) =>
      product.category?.name?.toLowerCase().includes('phone') &&
      Number(product.discountPrice ?? product.price) <= criteria.budget &&
      (!criteria.brand || product.brand?.name.toLowerCase().includes(criteria.brand.toLowerCase())) &&
      (!criteria.condition || product.condition === criteria.condition)
    );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError('');
    setSearched(true);

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      // Validate form data
      const validated = finderSchema.parse({
        budget: data.budget,
        brand: data.brand || undefined,
        storage: data.storage || undefined,
        ram: data.ram || undefined,
        camera: data.camera || undefined,
        battery: data.battery || undefined,
        use: data.use,
        condition: data.condition || undefined,
      });

      const response = await api<{ results: Product[] }>('/discovery/finder', {
        method: 'POST',
        body: JSON.stringify(validated),
      });

      const liveResults = response?.results || [];
      onResultsChange(liveResults.length ? liveResults : catalogueMatches(validated));
      if (!liveResults.length) setError('Showing the closest matches from the GadgetHub catalogue.');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid form data');
      } else if (err instanceof ApiException) {
        // Fallback to demo data on API error
        const budget = Number(formData.get('budget'));
        const brand = String(formData.get('brand') || '');
        const condition = String(formData.get('condition') || '');
        onResultsChange(catalogueMatches({ budget, brand, condition }));
        setError('Live matching is unavailable, so these are the closest catalogue matches.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to find phones');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="finder-page page shell">
      <div>
        <span className="kicker">SMART PHONE FINDER</span>
        <h2>
          Your priorities.
          <br />
          <em>Your perfect phone.</em>
        </h2>
        <p>
          Tell us what matters. Our recommendation engine checks budget,
          performance, camera, battery and condition against live stock.
        </p>
      </div>

      <form className="finder-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Find Your Perfect Phone</legend>

          <label>
            Maximum budget (USD) *
            <input
              type="number"
              name="budget"
              required
              defaultValue="1200"
              min="100"
              max="10000"
              aria-label="Maximum budget"
            />
          </label>

          <label>
            Preferred brand
            <input
              type="text"
              name="brand"
              placeholder="e.g. Apple, Samsung"
              aria-label="Preferred brand"
            />
          </label>

          <label>
            Storage
            <select name="storage" aria-label="Storage capacity">
              <option value="">Any</option>
              <option>128GB</option>
              <option>256GB</option>
              <option>512GB</option>
            </select>
          </label>

          <label>
            RAM
            <select name="ram" aria-label="RAM">
              <option value="">Any</option>
              <option>6GB</option>
              <option>8GB</option>
              <option>12GB</option>
            </select>
          </label>

          <label>
            Camera preference
            <select name="camera" aria-label="Camera preference">
              <option value="">Any</option>
              <option>48MP</option>
              <option>Telephoto</option>
            </select>
          </label>

          <label>
            Battery preference
            <select name="battery" aria-label="Battery preference">
              <option value="">Any</option>
              <option>All day</option>
              <option>5000mAh</option>
            </select>
          </label>

          <label>
            Primary use *
            <select name="use" required aria-label="Primary use">
              <option value="GENERAL">Everyday</option>
              <option value="PHOTOGRAPHY">Photography</option>
              <option value="GAMING">Gaming</option>
              <option value="BUSINESS">Business</option>
            </select>
          </label>

          <label>
            Condition
            <select name="condition" aria-label="Device condition">
              <option value="">Any</option>
              <option value="BRAND_NEW">Brand new</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="REFURBISHED">Refurbished</option>
            </select>
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Finding…' : 'Show my matches →'}
          </button>
        </fieldset>
      </form>

      {results.length > 0 && (
        <div className="finder-results">
          <h2>Recommended for you</h2>
          <ProductGrid products={results} onSelect={onSelect} />
        </div>
      )}
      {!busy && results.length === 0 && (
        <div className="finder-results finder-empty"><h2>{searched ? 'No matching phones found' : 'Ready when you are'}</h2><p>{searched ? 'Try increasing your budget or removing some preferences.' : 'Set your priorities above and select “Show my matches”.'}</p></div>
      )}
    </section>
  );
}
