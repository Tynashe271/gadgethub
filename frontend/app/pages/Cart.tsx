// app/pages/Cart.tsx
'use client';

import { FormEvent, useMemo, useState } from 'react';
import { api } from '../utils/apiClient';
import type { Order, Product, View } from '@/types';

const marks: Record<string, string> = {
  Phones: '◫',
  Laptops: '▰',
  Audio: '◉',
  Wearables: '⌚',
  Accessories: '◆',
};

interface CartItem {
  product: Product;
  quantity: number;
}

interface ReceiptData {
  orderNumber: string;
  date: string;
  paymentMethod: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paid: boolean;
}

interface CartProps {
  products: Product[];
  onRemove: (id: string) => void;
  onChangeQuantity: (product: Product, delta: number) => void;
  onNavigate: (view: View) => void;
  isAuthenticated: boolean;
  onCheckout: () => void;
  onContinueShopping: () => void;
  onOrderComplete: () => void;
}

export function Cart({
  products,
  onRemove,
  onChangeQuantity,
  onNavigate,
  isAuthenticated,
  onCheckout,
  onContinueShopping,
  onOrderComplete,
}: CartProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'payment' | 'complete'>('cart');
  const [addressId, setAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ECOCASH');
  const [mobileNumber, setMobileNumber] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ orderNumber: string; paymentId: string } | null>(null);
  const [error, setError] = useState('');
  const grouped = useMemo(() => {
    const map = new Map<string, CartItem>();
    products.forEach((product) => {
      const existing = map.get(product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        map.set(product.id, { product, quantity: 1 });
      }
    });
    return Array.from(map.values());
  }, [products]);

  const subtotal = useMemo(() => {
    return grouped.reduce(
      (sum, item) =>
        sum +
        Number(item.product.discountPrice ?? item.product.price) *
          item.quantity,
      0
    );
  }, [grouped]);

  const deliveryFee = subtotal >= 100 ? 0 : 15;
  const total = subtotal + deliveryFee;

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setProcessing(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const address = await api<{ id: string }>('/profile/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: 'Checkout', recipient: values.recipient, phone: values.phone,
          line1: values.line1, city: values.city, province: values.province || undefined,
          country: values.country || 'Zimbabwe', isDefault: true,
        }),
      });
      setAddressId(address.id);
      setStep('payment');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save delivery details');
    } finally {
      setProcessing(false);
    }
  };

  const placeOrder = async () => {
    setError('');
    if ((paymentMethod === 'ECOCASH' || paymentMethod === 'ONEMONEY') && !/^\+?[0-9]{9,15}$/.test(mobileNumber.replace(/\s/g, ''))) {
      setError('Enter a valid mobile-money number');
      return;
    }
    setProcessing(true);
    try {
      let confirmedOrderNumber: string;
      let paid = false;
      {
        let checkout = pendingOrder;
        if (!checkout) {
          const order = await api<Order>('/orders', {
            method: 'POST',
            body: JSON.stringify({ addressId, paymentMethod, deliveryMethod: 'STANDARD', deliveryFee, couponCode: couponCode.trim() || undefined }),
          });
          const payment = order.payments?.[0] as { id?: string } | undefined;
          if (!payment?.id) throw new Error('Order payment was not created');
          checkout = { orderNumber: order.orderNumber, paymentId: payment.id };
          setPendingOrder(checkout);
        }
        confirmedOrderNumber = checkout.orderNumber;
        const initialized = await api<{redirectUrl?:string|null;manual?:boolean}>(`/commerce/payments/${checkout.paymentId}/initialize`, {
          method: 'POST',
          body: JSON.stringify({ phone: mobileNumber || undefined }),
        });
        if (initialized.redirectUrl) {
          window.location.assign(initialized.redirectUrl);
          return;
        }
        if (!initialized.manual) {
          for (let attempt = 0; attempt < 16; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 2500));
            const result = await api<{status:string}>(`/commerce/payments/${checkout.paymentId}/status`);
            if (result.status === 'PAID') { paid = true; break; }
            if (['FAILED', 'REFUNDED'].includes(result.status)) throw new Error('Paynow payment was not completed');
          }
        }
      }
      setReceipt({ orderNumber: confirmedOrderNumber, date: new Date().toLocaleString(), paymentMethod, items: grouped.map((item) => ({ ...item })), subtotal, deliveryFee, total, paid });
      onOrderComplete();
      setStep('complete');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment could not be started');
    } finally {
      setProcessing(false);
    }
  };

  if (step === 'complete') {
    const downloadReceipt = () => {
      if (!receipt) return;
      const lines = ['GADGETHUB RECEIPT', `Order: ${receipt.orderNumber}`, `Date: ${receipt.date}`, `Payment: ${receipt.paymentMethod.replaceAll('_', ' ')}`, '', ...receipt.items.map(({ product, quantity }) => `${product.name} x${quantity} — $${(Number(product.discountPrice ?? product.price) * quantity).toLocaleString()}`), '', `Subtotal: $${receipt.subtotal.toLocaleString()}`, `Delivery: ${receipt.deliveryFee ? `$${receipt.deliveryFee}` : 'Free'}`, `Total: $${receipt.total.toLocaleString()}`, '', 'Thank you for shopping with GadgetHub.'];
      const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `GadgetHub-${receipt.orderNumber}-receipt.txt`; link.click();
      URL.revokeObjectURL(url);
    };
    return <section className="checkout-page receipt-page page shell"><span className="kicker no-print">ORDER CONFIRMED</span><h2 className="no-print">Thank you for your <em>order.</em></h2>{receipt && <article className="receipt" aria-label="Order receipt"><header><b>GADGET<span>HUB</span></b><small>PAYMENT RECEIPT</small></header><div className="receipt-meta"><span>Order <b>{receipt.orderNumber}</b></span><span>{receipt.date}</span><span>Payment <b>{receipt.paymentMethod.replaceAll('_', ' ')}</b></span></div><div className="receipt-items">{receipt.items.map(({ product, quantity }) => <div key={product.id}><span>{product.name} × {quantity}</span><b>${(Number(product.discountPrice ?? product.price) * quantity).toLocaleString()}</b></div>)}</div><div className="receipt-totals"><div><span>Subtotal</span><b>${receipt.subtotal.toLocaleString()}</b></div><div><span>Delivery</span><b>{receipt.deliveryFee ? `$${receipt.deliveryFee}` : 'Free'}</b></div><div className="receipt-grand"><span>Total paid</span><b>${receipt.total.toLocaleString()}</b></div></div><footer>Thank you for shopping with GadgetHub.</footer></article>}<aside className="post-purchase-rating no-print"><div><span>★★★★★</span><h3>How was your shopping experience?</h3><p>Your feedback takes less than a minute and helps us serve you better.</p></div><button className="primary" onClick={() => onNavigate('feedback')}>Rate your experience →</button></aside><div className="receipt-actions no-print"><p>Choose how you want to keep your receipt.</p><button className="primary" onClick={() => window.print()}>Print receipt</button><button onClick={downloadReceipt}>Download receipt</button><button onClick={onContinueShopping}>Continue shopping</button></div></section>;
  }

  if (step === 'checkout') {
    return <section className="checkout-page page shell"><span className="kicker">CHECKOUT · STEP 1 OF 2</span><h2>Delivery <em>details.</em></h2><form className="checkout-panel" onSubmit={saveAddress}>
      <label>Full name *<input name="recipient" required /></label><label>Phone number *<input name="phone" type="tel" minLength={7} required /></label>
      <label className="wide">Street address *<input name="line1" required /></label><label>City *<input name="city" required /></label><label>Province<input name="province" /></label>
      <label className="wide">Country *<input name="country" defaultValue="Zimbabwe" required /></label>
      {error && <div className="form-error wide" role="alert">{error}</div>}
      <div className="checkout-buttons wide"><button type="button" onClick={() => setStep('cart')}>← Back to cart</button><button className="primary" disabled={processing}>{processing ? 'Saving…' : 'Proceed to payment →'}</button></div>
    </form></section>;
  }

  if (step === 'payment') {
    const methods = [['ECOCASH','EcoCash'],['ONEMONEY','OneMoney'],['CARD','Card'],['BANK_TRANSFER','Bank transfer'],['CASH_ON_DELIVERY','Cash on delivery']];
    return <section className="checkout-page page shell"><span className="kicker">PAYMENT · STEP 2 OF 2</span><h2>Choose <em>payment.</em></h2><div className="checkout-panel payment-panel"><div className="payment-options">{methods.map(([value,label]) => <label key={value} className={paymentMethod === value ? 'selected' : ''}><input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={() => { setPaymentMethod(value); setError(''); }} /><span>{label}</span></label>)}</div>
      {(paymentMethod === 'ECOCASH' || paymentMethod === 'ONEMONEY') && <div className="payment-details"><h3>{paymentMethod === 'ECOCASH' ? 'EcoCash' : 'OneMoney'} number</h3><p>Enter the mobile number that should receive the payment prompt.</p><label>Mobile number *<input type="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="+263 77 123 4567" autoComplete="tel" required /></label></div>}
      {paymentMethod === 'CARD' && <div className="payment-details"><h3>Secure card payment</h3><p>You will be redirected to Paynow to enter your card details securely. GadgetHub never receives or stores your card number or CVV.</p></div>}
      {paymentMethod === 'BANK_TRANSFER' && <div className="payment-details"><h3>Bank transfer</h3><p>Banking instructions will be provided with your order confirmation.</p></div>}
      {paymentMethod === 'CASH_ON_DELIVERY' && <div className="payment-details"><h3>Cash on delivery</h3><p>Pay when your order arrives. Please have the exact amount available.</p></div>}
      <div className="payment-details"><h3>Coupon or reward</h3><label>Coupon code<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="GH-REWARD-…" /></label></div>
      <div className="payment-total"><span>Total due</span><b>${total.toLocaleString()}</b></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="checkout-buttons"><button onClick={() => setStep('checkout')}>← Delivery details</button><button className="primary" onClick={placeOrder} disabled={processing}>{processing ? 'Processing…' : 'Confirm and pay →'}</button></div></div></section>;
  }

  if (!grouped.length) {
    return (
      <section className="cart-page page shell">
        <span className="kicker">YOUR CART</span>
        <h2>
          Your selected <em>tech.</em>
        </h2>
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <button className="primary" onClick={onContinueShopping}>
            Start shopping →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page page shell">
      <span className="kicker">YOUR CART</span>
      <h2>
        Your selected <em>tech.</em>
      </h2>

      <div className="cart-layout">
        <div className="cart-items">
          {grouped.map(({ product, quantity }) => (
            <article key={product.id}>
              <div className="cart-thumb">
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    loading="lazy"
                  />
                ) : (
                  <span>{marks[product.category?.name || ''] || '◆'}</span>
                )}
              </div>
              <div>
                <small>{product.brand?.name}</small>
                <h3>{product.name}</h3>
                <button
                  className="remove"
                  onClick={() => onRemove(product.id)}
                  aria-label={`Remove ${product.name} from cart`}
                >
                  Remove
                </button>
              </div>
              <div className="quantity">
                <button
                  onClick={() => onChangeQuantity(product, -1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <b>{quantity}</b>
                <button
                  onClick={() => onChangeQuantity(product, 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <strong>
                $
                {(
                  Number(product.discountPrice ?? product.price) * quantity
                ).toLocaleString()}
              </strong>
            </article>
          ))}
        </div>

        <aside className="cart-summary">
          <h3>Order summary</h3>
          <div>
            <span>Subtotal</span>
            <b>${subtotal.toLocaleString()}</b>
          </div>
          <div>
            <span>Delivery</span>
            <b>{deliveryFee === 0 ? 'Free' : `$${deliveryFee}`}</b>
          </div>
          <div className="cart-total">
            <span>Total</span>
            <b>${total.toLocaleString()}</b>
          </div>
          <button
            className="primary"
            onClick={() => { onCheckout(); if (isAuthenticated) setStep('checkout'); }}
            aria-label="Continue to checkout"
          >
            {isAuthenticated ? 'Continue to checkout →' : 'Sign in to checkout →'}
          </button>
          <button
            className="continue"
            onClick={onContinueShopping}
            aria-label="Continue shopping"
          >
            Continue shopping
          </button>
        </aside>
      </div>
    </section>
  );
}
