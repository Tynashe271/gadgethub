import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, validate } from '../lib/http.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { normalizePhone } from '../lib/phone.js';
export const profileRouter = Router();
profileRouter.use(authenticate);
const avatarDir=path.resolve(process.cwd(),'uploads','avatars');fs.mkdirSync(avatarDir,{recursive:true});
const avatarUpload=multer({storage:multer.diskStorage({destination:avatarDir,filename:(_req,file,done)=>done(null,`${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:2*1024*1024},fileFilter:(_req,file,done)=>done(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
profileRouter.patch('/',asyncHandler(async(req,res)=>{const d=validate(z.object({firstName:z.string().min(1).optional(),lastName:z.string().min(1).optional(),phone:z.string().min(7).transform(normalizePhone).nullable().optional(),avatarUrl:z.url().nullable().optional()}),req.body);res.json(await prisma.user.update({where:{id:req.auth!.userId},data:d,select:{id:true,email:true,phone:true,firstName:true,lastName:true,avatarUrl:true}}));}));
const settingsSchema = z.object({
  language: z.enum(['en', 'sn', 'nd']),
  theme: z.enum(['dark', 'light', 'system']),
  textSize: z.enum(['standard', 'large']),
  compactDashboard: z.boolean(),
  reducedMotion: z.boolean(),
  dataSaver: z.boolean(),
  orderUpdates: z.boolean(),
  offers: z.boolean(),
});
const defaultSettings = { language: 'en', theme: 'dark', textSize: 'standard', compactDashboard: false, reducedMotion: false, dataSaver: false, orderUpdates: true, offers: false } as const;
profileRouter.get('/settings', asyncHandler(async (req, res) => {
  const saved = await prisma.userPreference.findUnique({ where: { userId: req.auth!.userId } });
  res.json(saved ?? defaultSettings);
}));
profileRouter.put('/settings', asyncHandler(async (req, res) => {
  const settings = validate(settingsSchema, req.body);
  res.json(await prisma.userPreference.upsert({
    where: { userId: req.auth!.userId },
    create: { userId: req.auth!.userId, ...settings },
    update: settings,
  }));
}));
profileRouter.post('/avatar',avatarUpload.single('avatar'),asyncHandler(async(req,res)=>{if(!req.file)throw new AppError(400,'Choose a JPG, PNG, or WebP image');const origin=`${req.protocol}://${req.get('host')}`;const avatarUrl=`${origin}/uploads/avatars/${req.file.filename}`;res.json(await prisma.user.update({where:{id:req.auth!.userId},data:{avatarUrl},select:{id:true,email:true,phone:true,firstName:true,lastName:true,avatarUrl:true}}));}));
profileRouter.get('/addresses', asyncHandler(async (req, res) => {
  res.json(await prisma.address.findMany({ where: { userId: req.auth!.userId } }));
}));
profileRouter.post('/addresses', asyncHandler(async (req,res) => { const data=validate(z.object({ label:z.string().optional(),recipient:z.string().min(1),phone:z.string().min(7),line1:z.string().min(1),line2:z.string().optional(),city:z.string().min(1),province:z.string().optional(),country:z.string().default('Zimbabwe'),isDefault:z.boolean().default(false) }),req.body); res.status(201).json(await prisma.address.create({data:{...data,userId:req.auth!.userId}})); }));
profileRouter.patch('/addresses/:id',asyncHandler(async(req,res)=>{const address=await prisma.address.findFirst({where:{id:String(req.params.id),userId:req.auth!.userId}});if(!address)throw new AppError(404,'Address not found');const data=validate(z.object({label:z.string().optional(),recipient:z.string().min(1).optional(),phone:z.string().min(7).optional(),line1:z.string().min(1).optional(),line2:z.string().nullable().optional(),city:z.string().min(1).optional(),province:z.string().nullable().optional(),country:z.string().optional(),isDefault:z.boolean().optional()}),req.body);if(data.isDefault)await prisma.address.updateMany({where:{userId:req.auth!.userId,id:{not:address.id}},data:{isDefault:false}});res.json(await prisma.address.update({where:{id:address.id},data}));}));
profileRouter.delete('/addresses/:id',asyncHandler(async(req,res)=>{const used=await prisma.order.count({where:{addressId:String(req.params.id)}});if(used)throw new AppError(409,'Address is attached to an order');const deleted=await prisma.address.deleteMany({where:{id:String(req.params.id),userId:req.auth!.userId}});if(!deleted.count)throw new AppError(404,'Address not found');res.status(204).send();}));
profileRouter.get('/wishlist', asyncHandler(async(req,res)=>res.json(await prisma.wishlistItem.findMany({where:{userId:req.auth!.userId},include:{product:{include:{images:{take:1}}}}}))));
profileRouter.post('/wishlist/:productId', asyncHandler(async(req,res)=>res.status(201).json(await prisma.wishlistItem.upsert({where:{userId_productId:{userId:req.auth!.userId,productId:String(req.params.productId)}},create:{userId:req.auth!.userId,productId:String(req.params.productId)},update:{}}))));
profileRouter.delete('/wishlist/:productId', asyncHandler(async(req,res)=>{await prisma.wishlistItem.deleteMany({where:{userId:req.auth!.userId,productId:String(req.params.productId)}});res.status(204).send();}));
