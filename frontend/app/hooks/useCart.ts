// app/hooks/useCart.ts
import { useStore } from '../context/StoreContext';
import type { Product } from '@/types';

export function useCart() {
  const { cart, addToCart, removeFromCart, changeQuantity, clearCart } = useStore();

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.discountPrice ?? item.price);
  }, 0);

  const itemCount = cart.length;

  return {
    cart,
    total,
    itemCount,
    add: (product: Product) => addToCart(product),
    remove: (id: string) => removeFromCart(id),
    updateQuantity: (product: Product, delta: number) => changeQuantity(product, delta),
    clear: clearCart,
  };
}
