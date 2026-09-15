// app/__tests__/ProductGrid.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { ProductGrid } from '../components/ProductGrid';
import type { Product } from '@/types';

const mockProduct: Product = {
  id: 'test-1',
  name: 'Test Product',
  slug: 'test-product',
  price: 100,
  condition: 'BRAND_NEW',
  description: 'A test product',
  sku: 'TEST-001',
};

describe('ProductGrid', () => {
  it('renders products', () => {
    render(
      <ProductGrid
        products={[mockProduct]}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  it('calls onSelect when product is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ProductGrid
        products={[mockProduct]}
        onSelect={onSelect}
      />
    );
    screen.getByText('Test Product').click();
    expect(onSelect).toHaveBeenCalledWith(mockProduct);
  });

  it('renders lazy loading on images', () => {
    const productWithImage = {
      ...mockProduct,
      images: [{ url: 'test.jpg', alt: 'Test' }],
    };
    render(
      <ProductGrid
        products={[productWithImage]}
        onSelect={() => {}}
      />
    );
    const img = screen.getByAltText('Test');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders wishlist button when onWish is provided', () => {
    render(
      <ProductGrid
        products={[mockProduct]}
        onSelect={() => {}}
        onWish={() => {}}
      />
    );
    expect(screen.getByLabelText(/add to wishlist/i)).toBeTruthy();
  });

  it('shows full heart for items in wishlist', () => {
    render(
      <ProductGrid
        products={[mockProduct]}
        onSelect={() => {}}
        onWish={() => {}}
        wishlist={['test-1']}
      />
    );
    const button = screen.getByLabelText(/remove from wishlist/i);
    expect(button.textContent).toBe('♥');
  });
});
