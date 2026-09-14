'use client';

import { FormEvent, useState } from 'react';
import { api } from '../utils/apiClient';
import type { Product, View } from '@/types';

type ChatMessage = { role: 'user' | 'assistant'; content: string; products?: Product[]; actions?: AssistantAction[] };
type AssistantAction = { type: 'navigate' | 'add_to_cart'; label: string; path: string; productId: string | null; variantId: string | null };
type AssistantResponse = { conversationId: string; reply: string; productIds: string[]; suggestedActions: AssistantAction[] };

interface Props {
  products: Product[];
  onNavigate: (view: View) => void;
  onAdd: (product: Product) => Promise<void>;
  onSelect: (product: Product) => void;
}

const pathToView = (path: string): View | null => {
  const value = path.replace(/^\//, '').split(/[?#]/)[0];
  const views: View[] = ['home', 'shop', 'finder', 'compare', 'services', 'account', 'admin', 'cart', 'assistant'];
  return views.includes(value as View) ? value as View : null;
};

export function Assistant({ products, onNavigate, onAdd, onSelect }: Props) {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Hi! Tell me what gadget you need, your budget, and what matters most. I’ll use the live GadgetHub catalogue to help.' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;
    const message = input.value.trim();
    if (!message || busy) return;
    setMessages((items) => [...items, { role: 'user', content: message }]);
    input.value = '';
    setBusy(true);
    setError('');
    try {
      const response = await api<AssistantResponse>('/assistant/chat', { method: 'POST', body: JSON.stringify({ conversationId, message }) });
      setConversationId(response.conversationId);
      const recommended = response.productIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
      setMessages((items) => [...items, { role: 'assistant', content: response.reply, products: recommended, actions: response.suggestedActions }]);
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : 'Assistant is unavailable';
      setError(messageText.includes('not configured') ? 'The AI assistant needs a DEEPSEEK_API_KEY on the backend before it can answer.' : messageText);
    } finally { setBusy(false); }
  };

  const runAction = async (action: AssistantAction) => {
    if (action.type === 'add_to_cart' && action.productId) {
      const product = products.find((item) => item.id === action.productId);
      if (product) await onAdd(product);
      return;
    }
    const view = pathToView(action.path);
    if (view) onNavigate(view);
  };

  return <section className="assistant-page page shell">
    <header><div><span className="kicker">GADGETHUB AI</span><h2>Your personal<br /><em>shopping expert.</em></h2><p>Ask for recommendations, compare options, understand specifications, or get help with your cart and recent orders.</p></div><div className="ai-orb">AI</div></header>
    <div className="assistant-chat" aria-live="polite">
      <div className="chat-messages">{messages.map((message, index) => <article className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><small>{message.role === 'assistant' ? 'GADGETHUB AI' : 'YOU'}</small><p>{message.content}</p>{message.products && message.products.length > 0 && <div className="assistant-products">{message.products.map((product) => <button key={product.id} onClick={() => onSelect(product)}><span>{product.brand?.name}</span><b>{product.name}</b><strong>${Number(product.discountPrice ?? product.price).toLocaleString()}</strong></button>)}</div>}{message.actions && message.actions.length > 0 && <div className="assistant-actions">{message.actions.map((action, actionIndex) => <button key={`${action.label}-${actionIndex}`} onClick={() => runAction(action)}>{action.label}</button>)}</div>}</article>)}{busy && <article className="chat-message assistant thinking"><small>GADGETHUB AI</small><p>Checking the live catalogue…</p></article>}</div>
      {error && <div className="assistant-error" role="alert">{error}</div>}
      <form onSubmit={send}><input name="message" maxLength={2000} placeholder="Ask me to find the best phone under $500…" aria-label="Message the AI assistant" required /><button disabled={busy} aria-label="Send message">Send →</button></form>
      <div className="assistant-prompts"><span>TRY ASKING</span>{['Best camera phone under $800', 'Compare Apple and Samsung', 'What should I buy for gaming?'].map((prompt) => <button key={prompt} onClick={(event) => { const form = event.currentTarget.closest('.assistant-chat')?.querySelector('form'); const input = form?.elements.namedItem('message') as HTMLInputElement | null; if (input) { input.value = prompt; input.focus(); } }}>{prompt}</button>)}</div>
    </div>
  </section>;
}
