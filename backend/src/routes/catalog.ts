import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, validate, AppError } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { cache, CacheKeys } from '../lib/redis.js';

export const catalogRouter = Router();
const staff = [Role.PRODUCT, Role.STORE_MANAGER, Role.SUPER_ADMIN];
async function invalidateCatalogue(productId?: string) {
  await Promise.all([
    cache.invalidatePattern('products:*'),
    cache.invalidate(CacheKeys.categories()),
    cache.invalidate(CacheKeys.brands()),
  ]);
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
    await Promise.all([cache.invalidate(CacheKeys.product(productId)), ...(product ? [cache.invalidate(CacheKeys.productSlug(product.slug))] : [])]);
  }
}
const taxon = z.object({ name:z.string().min(1), slug:z.string().regex(/^[a-z0-9-]+$/), description:z.string().optional(), parentId:z.string().nullable().optional() });
catalogRouter.get('/categories', asyncHandler(async(_q,r)=>r.json(await prisma.category.findMany({include:{children:true,_count:{select:{products:true}}},orderBy:{name:'asc'}}))));
catalogRouter.post('/categories',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const v=await prisma.category.create({data:validate(taxon,q.body)});await audit(q,'CREATE','Category',v.id);await invalidateCatalogue();r.status(201).json(v);}));
catalogRouter.patch('/categories/:id',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const v=await prisma.category.update({where:{id:String(q.params.id)},data:validate(taxon.partial(),q.body)});await audit(q,'UPDATE','Category',v.id);await invalidateCatalogue();r.json(v);}));
catalogRouter.delete('/categories/:id',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{if(await prisma.product.count({where:{categoryId:String(q.params.id)}}))throw new AppError(409,'Category contains products');await prisma.category.delete({where:{id:String(q.params.id)}});await invalidateCatalogue();r.status(204).send();}));
const brand=z.object({name:z.string().min(1),slug:z.string().regex(/^[a-z0-9-]+$/),logoUrl:z.url().optional()});
catalogRouter.get('/brands',asyncHandler(async(_q,r)=>r.json(await prisma.brand.findMany({include:{_count:{select:{products:true}}},orderBy:{name:'asc'}}))));
catalogRouter.post('/brands',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const v=await prisma.brand.create({data:validate(brand,q.body)});await invalidateCatalogue();r.status(201).json(v);}));
catalogRouter.patch('/brands/:id',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const v=await prisma.brand.update({where:{id:String(q.params.id)},data:validate(brand.partial(),q.body)});await invalidateCatalogue();r.json(v);}));
catalogRouter.delete('/brands/:id',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{if(await prisma.product.count({where:{brandId:String(q.params.id)}}))throw new AppError(409,'Brand contains products');await prisma.brand.delete({where:{id:String(q.params.id)}});await invalidateCatalogue();r.status(204).send();}));
const variant=z.object({sku:z.string(),storage:z.string().optional(),colour:z.string().optional(),ram:z.string().optional(),priceAdjustment:z.number().default(0),quantity:z.number().int().nonnegative().default(0),lowStockAt:z.number().int().nonnegative().default(5)});
catalogRouter.post('/products/:id/variants',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const productId=String(q.params.id);const d=validate(variant,q.body);const v=await prisma.productVariant.create({data:{sku:d.sku,storage:d.storage,colour:d.colour,ram:d.ram,priceAdjustment:d.priceAdjustment,productId,inventory:{create:{quantity:d.quantity,lowStockAt:d.lowStockAt}}},include:{inventory:true}});await invalidateCatalogue(productId);r.status(201).json(v);}));
catalogRouter.post('/products/:id/images',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const productId=String(q.params.id);const v=await prisma.productImage.create({data:{...validate(z.object({url:z.url(),alt:z.string().optional(),sortOrder:z.number().int().default(0)}),q.body),productId}});await invalidateCatalogue(productId);r.status(201).json(v);}));
catalogRouter.put('/products/:id/specifications',authenticate,authorize(...staff),asyncHandler(async(q,r)=>{const productId=String(q.params.id);const specs=validate(z.array(z.object({name:z.string(),value:z.string(),group:z.string().optional()})),q.body);await prisma.$transaction([prisma.productSpecification.deleteMany({where:{productId}}),...specs.map(s=>prisma.productSpecification.create({data:{...s,productId}}))]);await invalidateCatalogue(productId);r.json(specs);}));
catalogRouter.post('/inventory/:variantId/adjust',authenticate,authorize(Role.INVENTORY,Role.STORE_MANAGER,Role.SUPER_ADMIN),asyncHandler(async(q,r)=>{const variantId=String(q.params.variantId);const d=validate(z.object({quantity:z.number().int(),reason:z.string().min(1)}),q.body);const before=await prisma.inventory.findUnique({where:{variantId},include:{variant:{select:{productId:true}}}});if(!before)throw new AppError(404,'Inventory not found');if(before.quantity+d.quantity<0)throw new AppError(409,'Adjustment would make stock negative');const inv=await prisma.inventory.update({where:{variantId},data:{quantity:{increment:d.quantity},movements:{create:{type:'ADJUSTMENT',quantity:d.quantity,reason:d.reason}}},include:{movements:{take:10,orderBy:{createdAt:'desc'}}}});await invalidateCatalogue(before.variant.productId);r.json(inv);}));
catalogRouter.get('/inventory/low-stock',authenticate,authorize(Role.INVENTORY,Role.STORE_MANAGER,Role.SUPER_ADMIN),asyncHandler(async(_q,r)=>{const all=await prisma.inventory.findMany({include:{variant:{include:{product:true}}}});r.json(all.filter(x=>x.quantity-x.reserved<=x.lowStockAt));}));
