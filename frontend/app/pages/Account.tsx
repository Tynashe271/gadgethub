'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ZodError } from 'zod';
import { api, ApiException, API_URL } from '../utils/apiClient';
import { loginSchema, registerSchema } from '../schemas/auth';
import type { User, AuthResponse, Product } from '@/types';

type Section = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'rewards' | 'security';
type FormError = Record<string, string>;
type Address = { id: string; label?: string; recipient: string; phone: string; line1: string; line2?: string | null; city: string; province?: string | null; country: string; isDefault: boolean };
type OrderItem = { id: string; name: string; quantity: number; unitPrice: number | string };
type Order = { id: string; orderNumber: string; total: number | string; status: string; createdAt: string; items: OrderItem[] };
type WishlistItem = { id: string; productId: string; product: Product };
type LoyaltyTransaction = { id: string; points: number; reason: string; reference?: string | null; balance: number; createdAt: string };
type Loyalty = { loyaltyPoints: number; level: string; loyaltyTransactions: LoyaltyTransaction[] };

interface AccountProps {
  user: User | null;
  token: boolean;
  onLogin: (data: AuthResponse) => void;
  onLogout: () => void;
  onNotification: (message: string) => void;
  onUserUpdate: (user: Partial<User>) => void;
}

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong';
const money = (value: number | string) => `$${Number(value).toFixed(2)}`;

export function Account({ user, token, onLogin, onLogout, onNotification, onUserUpdate }: AccountProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<Section>('profile');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const userId = user?.id;

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError('');
    try {
      const [orderData, addressData, wishlistData, loyaltyData] = await Promise.all([
        api<Order[]>('/orders'),
        api<Address[]>('/profile/addresses'),
        api<WishlistItem[]>('/profile/wishlist'),
        api<Loyalty>('/loyalty'),
      ]);
      setOrders(orderData);
      setAddresses(addressData);
      setWishlist(wishlistData);
      setLoyalty(loyaltyData);
    } catch (error) {
      setAccountError(messageOf(error));
    } finally {
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading begins after authentication and subsequent state updates happen asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token && userId) void loadAccount();
  }, [token, userId, loadAccount]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setErrors({});
    setLoading(true);
    const data = Object.fromEntries(new FormData(form));
    try {
      const payload = mode === 'register' ? (() => {
        const account = registerSchema.parse(data);
        return { firstName: account.firstName, lastName: account.lastName, email: account.email, password: account.password, ...(account.phone ? { phone: account.phone } : {}) };
      })() : loginSchema.parse(data);
      const result = await api<AuthResponse>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      onLogin(result);
      onNotification(mode === 'register' ? `Welcome to GadgetHub, ${result.user.firstName}!` : `Welcome back, ${result.user.firstName}!`);
    } catch (error) {
      if (error instanceof ZodError) {
        const fields = error.flatten().fieldErrors;
        setErrors(Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0] || 'Invalid value'])));
      } else if (error instanceof ApiException && error.status === 0) {
        const email = String(data.email || '').toLowerCase();
        const firstName = mode === 'register' ? String(data.firstName || 'Demo') : email.split('@')[0] || 'Demo';
        const lastName = mode === 'register' ? String(data.lastName || 'Customer') : 'Customer';
        const demo: AuthResponse = { token: `demo-session-${crypto.randomUUID()}`, user: { id: `demo-${email}`, email, firstName, lastName, role: 'CUSTOMER', loyaltyPoints: 250 } };
        form.reset(); onLogin(demo); onNotification('Demo account ready — welcome to GadgetHub');
      } else setErrors({ _general: messageOf(error) });
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') || '').trim();
    setErrors({});
    setLoading(true);
    try {
      const result = await api<{ message: string; verificationRequired?: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (result.verificationRequired) {
        setResetEmail(email);
        setVerificationSent(true);
        onNotification(result.message);
        return;
      }
      form.reset();
      onNotification(result.message);
      setMode('login');
    } catch (error) {
      setErrors({ _general: messageOf(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('code') || '').trim();
    setErrors({});
    setLoading(true);
    try {
      const result = await api<{ resetUrl: string }>('/auth/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, code }),
      });
      window.location.assign(result.resetUrl);
    } catch (error) {
      setErrors({ _general: messageOf(error) });
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const updated = await api<Partial<User>>('/profile', { method: 'PATCH', body: JSON.stringify({ firstName: String(data.firstName).trim(), lastName: String(data.lastName).trim(), phone: String(data.phone).trim() || null }) });
      onUserUpdate(updated); onNotification('Profile updated');
    } catch (error) { onNotification(messageOf(error)); }
    finally { setLoading(false); }
  };

  const addAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true);
    const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    try {
      const created = await api<Address>('/profile/addresses', { method: 'POST', body: JSON.stringify({ label: data.label, recipient: data.recipient, phone: data.phone, line1: data.line1, line2: data.line2 || undefined, city: data.city, province: data.province || undefined, country: data.country || 'Zimbabwe', isDefault: data.isDefault === 'on' }) });
      setAddresses((items) => created.isDefault ? [created, ...items.map((item) => ({ ...item, isDefault: false }))] : [created, ...items]);
      form.reset(); setShowAddressForm(false); onNotification('Address added');
    } catch (error) { onNotification(messageOf(error)); }
    finally { setLoading(false); }
  };

  const deleteAddress = async (id: string) => {
    try { await api(`/profile/addresses/${id}`, { method: 'DELETE' }); setAddresses((items) => items.filter((item) => item.id !== id)); onNotification('Address removed'); }
    catch (error) { onNotification(messageOf(error)); }
  };

  const makeDefault = async (id: string) => {
    try { await api(`/profile/addresses/${id}`, { method: 'PATCH', body: JSON.stringify({ isDefault: true }) }); setAddresses((items) => items.map((item) => ({ ...item, isDefault: item.id === id }))); onNotification('Default address updated'); }
    catch (error) { onNotification(messageOf(error)); }
  };

  const removeWishlist = async (item: WishlistItem) => {
    try { await api(`/profile/wishlist/${item.productId}`, { method: 'DELETE' }); setWishlist((items) => items.filter((saved) => saved.id !== item.id)); onNotification('Removed from wishlist'); }
    catch (error) { onNotification(messageOf(error)); }
  };

  const cancelOrder = async (id: string) => {
    try { const updated = await api<Order>(`/orders/${id}/cancel`, { method: 'POST' }); setOrders((items) => items.map((order) => order.id === id ? { ...order, ...updated } : order)); onNotification('Order cancelled'); }
    catch (error) { onNotification(messageOf(error)); }
  };

  const redeemPoints = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const points = Number(new FormData(form).get('points')); setLoading(true);
    try { const result = await api<{ balance: number; rewardValue: number; couponCode: string }>('/loyalty/redeem', { method: 'POST', body: JSON.stringify({ points }) }); onUserUpdate({ loyaltyPoints: result.balance }); form.reset(); await loadAccount(); onNotification(`${points} points redeemed. Use coupon ${result.couponCode} for $${result.rewardValue.toFixed(2)} off.`); }
    catch (error) { onNotification(messageOf(error)); }
    finally { setLoading(false); }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    if (data.newPassword !== data.confirmPassword) { onNotification('New passwords do not match'); return; }
    setLoading(true);
    try { await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }) }); form.reset(); onNotification('Password updated'); }
    catch (error) { onNotification(messageOf(error)); }
    finally { setLoading(false); }
  };

  const updateAvatar = async (file?: File) => {
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { onNotification('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { onNotification('Profile picture must be smaller than 2 MB'); return; }
    setLoading(true);
    try {
      const uploadBody = new FormData();
      uploadBody.append('avatar', file);
      const token = localStorage.getItem('gh_token');
      const upload = await fetch(`${API_URL}/profile/avatar`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: uploadBody });
      if (!upload.ok) throw new Error('Image upload failed');
      const updated = await upload.json() as Partial<User>;
      onUserUpdate(updated); onNotification('Profile picture updated');
    } catch (error) { onNotification(messageOf(error)); }
    finally { setLoading(false); }
  };

  const removeAvatar = () => {
    if (!user) return;
    setLoading(true);
    void api<Partial<User>>('/profile', { method: 'PATCH', body: JSON.stringify({ avatarUrl: null }) })
      .then((updated) => { onUserUpdate({ ...updated, avatarUrl: undefined }); onNotification('Profile picture removed'); })
      .catch((error) => onNotification(messageOf(error)))
      .finally(() => setLoading(false));
  };

  if (token && user) {
    const sections: Array<[Section, string]> = [['profile', 'Profile'], ['orders', 'Orders'], ['addresses', 'Addresses'], ['wishlist', 'Wishlist'], ['rewards', 'Rewards'], ['security', 'Security']];
    return <section className="account-page page shell">
      <div className="account-heading"><div><span className="kicker">MY GADGETHUB</span><h2>My <em>account.</em></h2></div><button className="logout" onClick={onLogout}>Sign out</button></div>
      <div className="account-layout">
        <nav className="account-tabs" aria-label="Account sections">{sections.map(([key, label]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}>{label}{key === 'orders' && <b>{orders.length}</b>}{key === 'wishlist' && <b>{wishlist.length}</b>}</button>)}</nav>
        <div className="account-panel">
          {accountLoading && <p className="account-status">Loading your account…</p>}
          {accountError && <div className="form-error" role="alert">{accountError} <button onClick={loadAccount}>Try again</button></div>}
          {!accountLoading && section === 'profile' && <><header><h3>Personal details</h3><p>Keep your photo and contact information up to date.</p></header><div className="profile-photo"><div>{user.avatarUrl ? <img src={user.avatarUrl} alt="Profile" /> : <span>{`${user.firstName[0] || ''}${user.lastName[0] || ''}`}</span>}</div><div><b>Profile picture</b><p>JPG, PNG or WebP. Maximum 2 MB.</p><label className="photo-upload">Choose photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => updateAvatar(event.target.files?.[0])} /></label>{user.avatarUrl && <button type="button" onClick={removeAvatar}>Remove</button>}</div></div><form className="account-form" onSubmit={submitProfile}><label>First name<input name="firstName" defaultValue={user.firstName} required /></label><label>Last name<input name="lastName" defaultValue={user.lastName} required /></label><label>Email<input value={user.email} disabled /></label><label>Phone<input name="phone" type="tel" defaultValue={user.phone || ''} placeholder="+263…" /></label><button className="primary" disabled={loading}>Save changes</button></form></>}
          {!accountLoading && section === 'orders' && <><header><h3>Order history</h3><p>Track purchases and review order details.</p></header>{orders.length === 0 ? <Empty text="You have not placed any orders yet." /> : <div className="account-list">{orders.map((order) => <article key={order.id}><div><b>{order.orderNumber}</b><small>{new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item(s)</small></div><div><strong>{money(order.total)}</strong><span className={`order-status status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span></div>{['PLACED', 'PAYMENT_CONFIRMED'].includes(order.status) && <button className="text-action" onClick={() => cancelOrder(order.id)}>Cancel order</button>}</article>)}</div>}</>}
          {!accountLoading && section === 'addresses' && <><header className="panel-title"><div><h3>Delivery addresses</h3><p>Manage locations used at checkout.</p></div><button onClick={() => setShowAddressForm((value) => !value)}>{showAddressForm ? 'Close' : '+ Add address'}</button></header>{showAddressForm && <form className="account-form address-form" onSubmit={addAddress}><label>Label<input name="label" placeholder="Home" /></label><label>Recipient<input name="recipient" defaultValue={`${user.firstName} ${user.lastName}`} required /></label><label>Phone<input name="phone" type="tel" defaultValue={user.phone || ''} minLength={7} required /></label><label>Address line<input name="line1" required /></label><label>Address line 2<input name="line2" /></label><label>City<input name="city" required /></label><label>Province<input name="province" /></label><label>Country<input name="country" defaultValue="Zimbabwe" required /></label><label className="check-label"><input name="isDefault" type="checkbox" /> Make default</label><button className="primary" disabled={loading}>Save address</button></form>}{addresses.length === 0 ? <Empty text="No delivery addresses saved." /> : <div className="address-list">{addresses.map((address) => <article key={address.id}><div><b>{address.label || 'Address'} {address.isDefault && <span>DEFAULT</span>}</b><p>{address.recipient}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}{address.province ? `, ${address.province}` : ''}, {address.country}<br />{address.phone}</p></div><div>{!address.isDefault && <button onClick={() => makeDefault(address.id)}>Make default</button>}<button onClick={() => deleteAddress(address.id)}>Remove</button></div></article>)}</div>}</>}
          {!accountLoading && section === 'wishlist' && <><header><h3>Saved products</h3><p>Your GadgetHub wishlist.</p></header>{wishlist.length === 0 ? <Empty text="Your wishlist is empty." /> : <div className="wishlist-list">{wishlist.map((item) => <article key={item.id}>{item.product.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" /> : <div className="wish-placeholder">GH</div>}<div><b>{item.product.name}</b><small>{item.product.brand?.name || 'GadgetHub'}</small><strong>{money(item.product.discountPrice ?? item.product.price)}</strong></div><button onClick={() => removeWishlist(item)}>Remove</button></article>)}</div>}</>}
          {!accountLoading && section === 'rewards' && <><header><h3>Loyalty rewards</h3><p>Earn 1 point for every $1 on a confirmed payment. Redeem each 100 points for a $1 coupon.</p></header><div className="reward-card"><span>{loyalty?.level || 'BRONZE'} MEMBER</span><b>{loyalty?.loyaltyPoints || 0}</b><small>AVAILABLE POINTS</small></div><form className="redeem-form" onSubmit={redeemPoints}><label>Points to redeem<input name="points" type="number" min="100" step="100" max={loyalty?.loyaltyPoints || 0} required /></label><button className="primary" disabled={loading || (loyalty?.loyaltyPoints || 0) < 100}>Redeem for coupon</button></form><div className="transactions">{loyalty?.loyaltyTransactions?.map((transaction) => <div key={transaction.id}><span>{transaction.reason.replaceAll('_', ' ')}{transaction.reference?.startsWith('GH-REWARD-') && <small>Coupon: {transaction.reference}</small>}<small>{new Date(transaction.createdAt).toLocaleDateString()}</small></span><b className={transaction.points > 0 ? 'positive' : ''}>{transaction.points > 0 ? '+' : ''}{transaction.points}</b></div>)}</div></>}
          {!accountLoading && section === 'security' && <><header><h3>Password & security</h3><p>Changing your password signs out your other sessions.</p></header><form className="account-form security-form" onSubmit={changePassword}><label>Current password<input name="currentPassword" type="password" required /></label><label>New password<input name="newPassword" type="password" minLength={8} required /></label><label>Confirm new password<input name="confirmPassword" type="password" minLength={8} required /></label><button className="primary" disabled={loading}>Update password</button></form></>}
        </div>
      </div>
    </section>;
  }

  const resetMode = mode === 'forgot';
  return <section className="auth-page page shell"><div><span className="kicker">YOUR ACCOUNT</span><h2>{resetMode ? <>Reset your<br /><em>password.</em></> : <>One account.<br /><em>Every service.</em></>}</h2><p>{resetMode ? verificationSent ? 'Enter the verification code sent to your phone.' : 'Enter your account email and we’ll send a verification code.' : 'Save products, keep your cart, track orders, manage warranties and earn loyalty rewards.'}</p></div><form onSubmit={resetMode ? verificationSent ? handleVerifyResetCode : handleForgotPassword : handleAuth}><div className="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setVerificationSent(false); setErrors({}); }} aria-selected={mode === 'login'}>Sign in</button><button type="button" role="tab" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setVerificationSent(false); setErrors({}); }} aria-selected={mode === 'register'}>Create account</button></div><fieldset disabled={loading}>{mode === 'register' && <><Field label="First name" name="firstName" error={errors.firstName} /><Field label="Last name" name="lastName" error={errors.lastName} /><Field label="Phone number" name="phone" type="tel" error={errors.phone} required={false} /></>}{resetMode && verificationSent ? <Field label="Verification code" name="code" type="text" error={errors.code} minLength={4} /> : <Field label="Email address" name="email" type="email" error={errors.email} />}{!resetMode && <Field label="Password" name="password" type="password" error={errors.password} minLength={8} />}{mode === 'register' && <Field label="Confirm password" name="confirmPassword" type="password" error={errors.confirmPassword} minLength={8} />}{mode === 'login' && <button type="button" className="forgot-password-link" onClick={() => { setMode('forgot'); setVerificationSent(false); setErrors({}); }}>Forgot password?</button>}{errors._general && <div className="form-error" role="alert">{errors._general}</div>}<button type="submit" className="primary" disabled={loading}>{loading ? 'Processing…' : mode === 'login' ? 'Sign in →' : mode === 'register' ? 'Create account →' : verificationSent ? 'Verify code →' : 'Send code →'}</button>{resetMode && <button type="button" className="back-to-login" onClick={() => { setMode('login'); setVerificationSent(false); setErrors({}); }}>← Back to sign in</button>}</fieldset></form></section>;
}

function Field({ label, name, type = 'text', error, required = true, minLength }: { label: string; name: string; type?: string; error?: string; required?: boolean; minLength?: number }) {
  return <label>{label}{required ? ' *' : ''}<input name={name} type={type} required={required} minLength={minLength} aria-invalid={Boolean(error)} />{error && <span className="field-error">{error}</span>}</label>;
}

function Empty({ text }: { text: string }) { return <div className="account-empty"><b>Nothing here yet</b><p>{text}</p></div>; }
