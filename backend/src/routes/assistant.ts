import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, validate, AppError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export const assistantRouter = Router();
assistantRouter.use(authenticate);

const shoppingResponseSchema = z.object({
  reply: z.string(),
  productIds: z.array(z.string()),
  suggestedActions: z.array(z.object({
    type: z.enum(['navigate', 'add_to_cart']),
    label: z.string(),
    path: z.string(),
    productId: z.string().nullable(),
    variantId: z.string().nullable(),
  })),
});

const system = `You are GadgetHub's shopping assistant. Use only the supplied live catalogue, stock, cart, and order data. Never invent prices, specifications, availability, warranties, or discounts. Help customers choose by needs and budget. Return only valid JSON in this exact shape: {"reply":"string","productIds":["string"],"suggestedActions":[{"type":"navigate|add_to_cart","label":"string","path":"string","productId":null,"variantId":null}]}. Use an empty array when there are no products or actions. Navigation paths are /shop, /finder, /compare, /services, /account, or /cart. Never perform checkout, payment, or order placement. Purchases require explicit customer confirmation through normal API endpoints.`;

assistantRouter.post('/chat', asyncHandler(async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AppError(503, 'DeepSeek API key is not configured');

  const data = validate(z.object({
    conversationId: z.string().optional(),
    message: z.string().min(1).max(2000),
  }), req.body);

  const conversation = data.conversationId
    ? await prisma.assistantConversation.findFirst({ where: { id: data.conversationId, userId: req.auth!.userId } })
    : await prisma.assistantConversation.create({ data: { userId: req.auth!.userId } });
  if (!conversation) throw new AppError(404, 'Conversation not found');

  await prisma.assistantMessage.create({
    data: { conversationId: conversation.id, userId: req.auth!.userId, role: 'user', content: data.message },
  });

  const [products, cart, orders, history] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, take: 40, include: { brand: true, category: true, specifications: true, variants: { include: { inventory: true } } } }),
    prisma.cart.findUnique({ where: { userId: req.auth!.userId }, include: { items: { include: { product: true, variant: true } } } }),
    prisma.order.findMany({ where: { userId: req.auth!.userId }, take: 5, orderBy: { createdAt: 'desc' } }),
    prisma.assistantMessage.findMany({ where: { conversationId: conversation.id }, take: 12, orderBy: { createdAt: 'asc' }, select: { role: true, content: true } }),
  ]);

  const configuredModel = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL;
  const model = configuredModel?.startsWith('deepseek-') ? configuredModel : 'deepseek-v4-flash';
  const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Conversation: ${JSON.stringify(history)}\nCustomer: ${data.message}\nLive data: ${JSON.stringify({ products, cart, orders })}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new AppError(502, 'DeepSeek returned an empty response. Please try again.');
  const parsed = shoppingResponseSchema.parse(JSON.parse(content));

  await prisma.assistantMessage.create({
    data: { conversationId: conversation.id, userId: req.auth!.userId, role: 'assistant', content: parsed.reply, actions: parsed.suggestedActions },
  });
  res.json({ conversationId: conversation.id, ...parsed });
}));

assistantRouter.get('/conversations/:id', asyncHandler(async (req, res) => {
  const conversation = await prisma.assistantConversation.findFirst({
    where: { id: String(req.params.id), userId: req.auth!.userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation) throw new AppError(404, 'Conversation not found');
  res.json(conversation);
}));
