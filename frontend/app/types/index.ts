// app/types/index.ts
export interface Category {
  id?: string;
  name: string;
  slug?: string;
}

export interface Brand {
  id?: string;
  name: string;
  slug?: string;
}

export interface ProductSpecification {
  name: string;
  value: string;
}

export interface ProductImage {
  id?: string;
  url: string;
  alt?: string;
  sortOrder?: number;
}

export interface ProductInventory {
  id: string;
  quantity: number;
  reserved?: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  priceAdjustment?: number;
  storage?: string;
  ram?: string;
  inventory?: ProductInventory;
}

export type ProductCondition = 
  | 'BRAND_NEW'
  | 'EXCELLENT'
  | 'GOOD'
  | 'REFURBISHED';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  condition: ProductCondition;
  warrantyMonths?: number;
  brand?: Brand;
  category?: Category;
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  variants?: ProductVariant[];
  reviews?: unknown[];
  viewCount?: number;
  isActive?: boolean;
  sku?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'PRODUCT' | 'STORE_MANAGER' | 'SUPER_ADMIN';
  loyaltyPoints?: number;
  isActive?: boolean;
  createdAt?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status?: string;
  items?: unknown[];
  payments?: unknown[];
  delivery?: unknown[];
  createdAt?: string;
}

export interface Address {
  id: string;
  userId: string;
  type?: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface ApiError {
  error?: string;
  message?: string;
  details?: unknown;
}

export type View = 
  | 'home'
  | 'shop'
  | 'finder'
  | 'compare'
  | 'services'
  | 'account'
  | 'admin'
  | 'cart'
  | 'assistant'
  | 'feedback'
  | 'settings';
