import crypto from 'node:crypto';
import { AppError } from './http.js';

const integrationId = process.env.PAYNOW_INTEGRATION_ID;
const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;

export const paynowConfigured = () => Boolean(integrationId && integrationKey);

type PaynowFields = Record<string, string>;

function hash(fields: PaynowFields) {
  if (!integrationKey) throw new AppError(503, 'Paynow is not configured');
  const value = Object.entries(fields)
    .filter(([key]) => key.toLowerCase() !== 'hash')
    .map(([, field]) => field)
    .join('') + integrationKey;
  return crypto.createHash('sha512').update(value, 'utf8').digest('hex').toUpperCase();
}

export function verifyPaynowHash(fields: PaynowFields) {
  const received = fields.hash ?? fields.Hash;
  if (!received) return false;
  const expected = hash(fields);
  return received.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(received.toUpperCase()), Buffer.from(expected));
}

function parse(body: string) {
  return Object.fromEntries(new URLSearchParams(body).entries());
}

async function post(url: string, fields?: PaynowFields) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: fields ? new URLSearchParams({ ...fields, hash: hash(fields) }) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new AppError(502, `Paynow returned HTTP ${response.status}`);
  const result = parse(await response.text());
  if (result.status?.toLowerCase() === 'error') throw new AppError(502, result.error || 'Paynow rejected the payment');
  if (!verifyPaynowHash(result)) throw new AppError(502, 'Paynow response signature is invalid');
  return result;
}

type InitiateInput = {
  reference: string;
  amount: number;
  email: string;
  phone?: string;
  method: 'ecocash' | 'onemoney' | 'web';
  returnUrl: string;
  resultUrl: string;
};

export async function initiatePaynow(input: InitiateInput) {
  if (!paynowConfigured()) throw new AppError(503, 'Paynow is not configured');
  const fields: PaynowFields = {
    id: integrationId!,
    reference: input.reference,
    amount: input.amount.toFixed(2),
    additionalinfo: `GadgetHub order ${input.reference}`,
    returnurl: input.returnUrl,
    resulturl: input.resultUrl,
    authemail: input.email,
    status: 'Message',
  };
  if (input.method !== 'web') {
    fields.phone = input.phone!;
    fields.method = input.method;
    return post('https://www.paynow.co.zw/interface/remotetransaction', fields);
  }
  return post('https://www.paynow.co.zw/interface/initiatetransaction', fields);
}

export const pollPaynow = (pollUrl: string) => post(pollUrl);

export function paynowPaymentStatus(status = '') {
  const normalized = status.toLowerCase().replace(/\s+/g, '');
  if (['paid', 'awaitingdelivery', 'delivered'].includes(normalized)) return 'PAID' as const;
  if (['cancelled', 'disputed'].includes(normalized)) return 'FAILED' as const;
  if (normalized === 'refunded') return 'REFUNDED' as const;
  return 'PROCESSING' as const;
}
