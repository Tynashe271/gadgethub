import { Router } from 'express';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, validate, AppError } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { initiatePaynow, paynowPaymentStatus, pollPaynow, verifyPaynowHash } from '../lib/paynow.js';
import { normalizePhone } from '../lib/phone.js';
import { updatePaymentStatus } from '../lib/payments.js';
export const commerceRouter=Router();
const admin=[Role.STORE_MANAGER,Role.SUPER_ADMIN];
commerceRouter.get('/promotions',asyncHandler(async(_q,r)=>{const now=new Date();r.json(await prisma.promotion.findMany({where:{isActive:true,startsAt:{lte:now},endsAt:{gte:now}},include:{products:{include:{product:{include:{images:{take:1}}}}}}}));}));
commerceRouter.post('/promotions',authenticate,authorize(...admin),asyncHandler(async(q,r)=>{const d=validate(z.object({name:z.string(),description:z.string().optional(),type:z.string(),value:z.number().optional(),startsAt:z.coerce.date(),endsAt:z.coerce.date(),productIds:z.array(z.string()).default([])}),q.body);r.status(201).json(await prisma.promotion.create({data:{name:d.name,description:d.description,type:d.type,value:d.value,startsAt:d.startsAt,endsAt:d.endsAt,products:{create:d.productIds.map(productId=>({productId}))}},include:{products:true}}));}));
commerceRouter.get('/banners',asyncHandler(async(_q,r)=>{const now=new Date();r.json(await prisma.banner.findMany({where:{isActive:true,startsAt:{lte:now},endsAt:{gte:now}},orderBy:{sortOrder:'asc'}}));}));
commerceRouter.post('/banners',authenticate,authorize(...admin),asyncHandler(async(q,r)=>r.status(201).json(await prisma.banner.create({data:validate(z.object({title:z.string(),imageUrl:z.url(),linkUrl:z.url().optional(),position:z.string().default('HOME'),startsAt:z.coerce.date(),endsAt:z.coerce.date(),sortOrder:z.number().int().default(0)}),q.body)}))));
commerceRouter.get('/delivery-zones',asyncHandler(async(_q,r)=>r.json(await prisma.deliveryZone.findMany({where:{isActive:true}}))));
commerceRouter.post('/delivery-zones',authenticate,authorize(...admin),asyncHandler(async(q,r)=>r.status(201).json(await prisma.deliveryZone.create({data:validate(z.object({name:z.string(),cities:z.array(z.string()),fee:z.number().nonnegative(),estimatedDays:z.number().int().positive()}),q.body)}))));
const couponSchema=z.object({code:z.string().min(2).transform(x=>x.toUpperCase()),type:z.enum(['PERCENT','FIXED']),value:z.number().positive(),minSpend:z.number().nonnegative().optional(),maxDiscount:z.number().positive().optional(),startsAt:z.coerce.date(),endsAt:z.coerce.date(),usageLimit:z.number().int().positive().optional(),isActive:z.boolean().default(true)});
commerceRouter.get('/coupons',authenticate,authorize(...admin),asyncHandler(async(_q,r)=>r.json(await prisma.coupon.findMany({orderBy:{code:'asc'}}))));
commerceRouter.post('/coupons',authenticate,authorize(...admin),asyncHandler(async(q,r)=>r.status(201).json(await prisma.coupon.create({data:validate(couponSchema,q.body)}))));
commerceRouter.patch('/coupons/:id',authenticate,authorize(...admin),asyncHandler(async(q,r)=>r.json(await prisma.coupon.update({where:{id:String(q.params.id)},data:validate(couponSchema.partial(),q.body)}))));
commerceRouter.delete('/coupons/:id',authenticate,authorize(...admin),asyncHandler(async(q,r)=>{await prisma.coupon.delete({where:{id:String(q.params.id)}});r.status(204).send();}));
commerceRouter.post('/payments/:id/initialize',authenticate,asyncHandler(async(q,r)=>{
  const data=validate(z.object({phone:z.string().optional()}),q.body);
  const p=await prisma.payment.findFirst({where:{id:String(q.params.id),order:{userId:q.auth!.userId}},include:{order:{include:{user:true,address:true}}}});
  if(!p)throw new AppError(404,'Payment not found');
  if(p.status==='PAID')throw new AppError(409,'Payment is already complete');
  const ref=p.providerReference??`PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  if(['BANK_TRANSFER','CASH_ON_DELIVERY'].includes(p.method)){
    const updated=await prisma.payment.update({where:{id:p.id},data:{providerReference:ref,metadata:{processing:'manual',method:p.method}}});
    return r.json({payment:updated,status:'PENDING',manual:true});
  }
  const mobile=['ECOCASH','ONEMONEY'].includes(p.method);
  const rawPhone=(data.phone??p.order.address.phone).trim().replace(/[\s()-]/g,'');
  const paynowTestNumbers=['0771111111','0772222222','0773333333','0774444444'];
  const phone=paynowTestNumbers.includes(rawPhone)?rawPhone:normalizePhone(rawPhone);
  if(mobile&&!/^\+[1-9]\d{7,14}$/.test(phone)&&!paynowTestNumbers.includes(phone))throw new AppError(400,'Enter a valid mobile-money number');
  const apiBase=(process.env.PUBLIC_API_URL??'http://localhost:4000').replace(/\/$/,'');
  const frontendBase=(process.env.FRONTEND_URL??'http://localhost:3000').replace(/\/$/,'');
  const response=await initiatePaynow({reference:ref,amount:Number(p.amount),email:p.order.user.email,phone:mobile?phone:undefined,method:p.method==='ECOCASH'?'ecocash':p.method==='ONEMONEY'?'onemoney':'web',returnUrl:`${frontendBase}/?paymentId=${p.id}`,resultUrl:`${apiBase}/api/v1/commerce/paynow/result`});
  const pollUrl=response.pollurl??response.PollUrl;
  const browserUrl=response.browserurl??response.BrowserUrl;
  const updated=await prisma.payment.update({where:{id:p.id},data:{status:'PROCESSING',providerReference:ref,metadata:{provider:'paynow',pollUrl,browserUrl,paynowStatus:response.status}}});
  r.json({payment:updated,status:'PROCESSING',redirectUrl:browserUrl??null,pollUrl:Boolean(pollUrl)});
}));

commerceRouter.get('/payments/:id/status',authenticate,asyncHandler(async(q,r)=>{
  const p=await prisma.payment.findFirst({where:{id:String(q.params.id),order:{userId:q.auth!.userId}}});
  if(!p)throw new AppError(404,'Payment not found');
  const metadata=(p.metadata??{}) as Record<string,unknown>;
  const pollUrl=typeof metadata.pollUrl==='string'?metadata.pollUrl:null;
  if(!pollUrl)return r.json({status:p.status,payment:p});
  const result=await pollPaynow(pollUrl);
  const status=paynowPaymentStatus(result.status);
  const updated=await updatePaymentStatus(p.id,status,{...metadata,paynowStatus:result.status,paynowReference:result.paynowreference??null});
  r.json({status, payment:updated});
}));

commerceRouter.post('/paynow/result',asyncHandler(async(q,r)=>{
  const fields=Object.fromEntries(Object.entries(q.body as Record<string,unknown>).map(([key,value])=>[key,String(value)]));
  if(!verifyPaynowHash(fields))throw new AppError(401,'Invalid Paynow signature');
  const reference=fields.reference;
  const p=await prisma.payment.findUnique({where:{providerReference:reference}});
  if(!p)return r.status(200).send('OK');
  const metadata=(p.metadata??{}) as Record<string,unknown>;
  const pollUrl=fields.pollurl??(typeof metadata.pollUrl==='string'?metadata.pollUrl:null);
  if(!pollUrl)throw new AppError(400,'Missing Paynow poll URL');
  const result=await pollPaynow(pollUrl);
  const status=paynowPaymentStatus(result.status);
  await updatePaymentStatus(p.id,status,{...metadata,paynowStatus:result.status,paynowReference:result.paynowreference??null});
  r.status(200).send('OK');
}));
commerceRouter.post('/payments/:id/verify',authenticate,authorize(Role.ORDER,Role.STORE_MANAGER,Role.SUPER_ADMIN),asyncHandler(async(q,r)=>{const d=validate(z.object({status:z.enum([PaymentStatus.PAID,PaymentStatus.FAILED])}),q.body);const p=await prisma.payment.findUnique({where:{id:String(q.params.id)}});if(!p)throw new AppError(404,'Payment not found');r.json(await updatePaymentStatus(p.id,d.status));}));
commerceRouter.get('/payments/:id/receipt',authenticate,asyncHandler(async(q,r)=>{const p=await prisma.payment.findFirst({where:{id:String(q.params.id),order:{userId:q.auth!.userId}},include:{order:{include:{items:true,user:{select:{firstName:true,lastName:true,email:true}}}}}});if(!p||p.status!=='PAID')throw new AppError(404,'Paid transaction not found');r.json({receiptNumber:p.providerReference,paymentDate:p.updatedAt,amount:p.amount,method:p.method,order:p.order});}));
commerceRouter.patch('/orders/:id/status',authenticate,authorize(Role.ORDER,Role.DELIVERY,Role.STORE_MANAGER,Role.SUPER_ADMIN),asyncHandler(async(q,r)=>{const {status}=validate(z.object({status:z.nativeEnum(OrderStatus)}),q.body);const order=await prisma.order.update({where:{id:String(q.params.id)},data:{status,delivery:{update:{status}}}});await prisma.notification.create({data:{userId:order.userId,title:'Order updated',body:`Order ${order.orderNumber} is now ${status}`,type:'ORDER'}});r.json(order);}));
commerceRouter.get('/orders/:id/tracking',authenticate,asyncHandler(async(q,r)=>{const o=await prisma.order.findFirst({where:{id:String(q.params.id),...(q.auth!.role==='CUSTOMER'&&{userId:q.auth!.userId})},include:{delivery:true}});if(!o)throw new AppError(404,'Order not found');r.json({orderNumber:o.orderNumber,status:o.status,delivery:o.delivery,updatedAt:o.updatedAt});}));
