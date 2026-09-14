'use client';

import { FormEvent, useState } from 'react';
import { api } from '../utils/apiClient';
import type { User } from '@/types';

interface Props { user: User | null; onNotification: (message: string) => void }

export function Feedback({ user, onNotification }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rating) { setError('Please choose a star rating.'); return; }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setError('');
    try {
      await api('/content/contact', { method: 'POST', body: JSON.stringify({
        name: String(data.name).trim(), email: String(data.email).trim(),
        subject: `GadgetHub rating: ${rating}/5 — ${String(data.experience)}`,
        message: `[Store feedback: ${rating}/5]\nExperience: ${String(data.experience)}\nRecommend: ${String(data.recommend)}\n\n${String(data.message).trim()}`,
      }) });
      form.reset(); setSubmitted(true); onNotification('Thank you for rating GadgetHub!');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send feedback'); }
    finally { setBusy(false); }
  };

  if (submitted) return <section className="feedback-page page shell"><div className="feedback-thanks"><span>★</span><h2>Thank <em>you.</em></h2><p>Your feedback has been received and will help us improve GadgetHub.</p><button className="primary" onClick={() => { setSubmitted(false); setRating(0); }}>Leave another rating</button></div></section>;

  return <section className="feedback-page page shell">
    <header><span className="kicker">RATE GADGETHUB</span><h2>How did we <em>do?</em></h2><p>Your honest feedback helps us improve our products, service, and shopping experience.</p></header>
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>Overall rating *</legend>
        <div className="star-rating" role="radiogroup" aria-label="Overall rating">{[1,2,3,4,5].map((star) => <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} star${star > 1 ? 's' : ''}`} className={(hovered || rating) >= star ? 'active' : ''} onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)} onClick={() => { setRating(star); setError(''); }}>★</button>)}</div>
        <small>{rating ? ['','Poor','Fair','Good','Very good','Excellent'][rating] : 'Select a rating'}</small>
        <div className="feedback-fields">
          <label>Name *<input name="name" defaultValue={user ? `${user.firstName} ${user.lastName}` : ''} required /></label>
          <label>Email *<input name="email" type="email" defaultValue={user?.email || ''} required /></label>
          <label>What are you rating? *<select name="experience" required><option value="Website experience">Website experience</option><option value="Customer service">Customer service</option><option value="Product selection">Product selection</option><option value="Delivery or collection">Delivery or collection</option><option value="Repairs or trade-in">Repairs or trade-in</option></select></label>
          <label>Would you recommend us? *<select name="recommend" required><option value="Yes">Yes</option><option value="Maybe">Maybe</option><option value="No">No</option></select></label>
          <label className="wide">Tell us more *<textarea name="message" minLength={5} maxLength={2000} placeholder="What went well, and what can we improve?" required /></label>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send feedback →'}</button>
      </fieldset>
    </form>
  </section>;
}
