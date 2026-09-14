import 'dotenv/config';
import { PrismaClient, ProductCondition } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { name: 'iPhone 15 Pro 256GB', slug: 'iphone-15-pro-256gb', sku: 'GH-IP15P', description: 'Titanium iPhone with a Pro camera system, USB-C and all-day battery life.', price: 1299, discountPrice: 1199, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Apple', category: 'Phones', variant: { sku: 'GH-IP15P-256', storage: '256GB', ram: '8GB', quantity: 8 } },
  { name: 'Samsung Galaxy S24', slug: 'samsung-galaxy-s24', sku: 'GH-S24', description: 'Compact flagship with Galaxy AI, a bright AMOLED display and versatile cameras.', price: 999, discountPrice: 899, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Samsung', category: 'Phones', variant: { sku: 'GH-S24-256', storage: '256GB', ram: '8GB', quantity: 11 } },
  { name: 'MacBook Air M2', slug: 'macbook-air-m2', sku: 'GH-MBA-M2', description: 'Thin and silent 13-inch notebook with M2 performance and long battery life.', price: 1099, condition: 'EXCELLENT', warrantyMonths: 12, brand: 'Apple', category: 'Laptops', variant: { sku: 'GH-MBA-M2-256', storage: '256GB', ram: '8GB', quantity: 5 } },
  { name: 'AirPods Pro (2nd Gen)', slug: 'airpods-pro-2', sku: 'GH-APP2', description: 'Wireless earbuds with active noise cancellation and USB-C charging.', price: 249, discountPrice: 219, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Apple', category: 'Audio', variant: { sku: 'GH-APP2-USBC', quantity: 16 } },
  { name: 'Galaxy Watch6 Classic', slug: 'galaxy-watch6-classic', sku: 'GH-GW6C', description: 'Premium smartwatch with a rotating bezel, fitness tracking and sleep coaching.', price: 399, discountPrice: 349, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Samsung', category: 'Wearables', variant: { sku: 'GH-GW6C-43', quantity: 7 } },
  { name: 'JBL Flip 6 Speaker', slug: 'jbl-flip-6-speaker', sku: 'GH-JBL-F6-BASE', description: 'Portable waterproof Bluetooth speaker with up to 12 hours of playtime.', price: 149, discountPrice: 129, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'JBL', category: 'Audio', variant: { sku: 'GH-JBL-F6', quantity: 14 } },
  { name: 'iPhone 14 128GB', slug: 'iphone-14-128gb', sku: 'GH-IP14', description: 'A dependable iPhone with a bright OLED display, dual cameras and excellent battery life.', price: 799, discountPrice: 699, condition: 'EXCELLENT', warrantyMonths: 6, brand: 'Apple', category: 'Phones', variant: { sku: 'GH-IP14-128', storage: '128GB', ram: '6GB', quantity: 9 } },
  { name: 'Google Pixel 8 Pro', slug: 'google-pixel-8-pro', sku: 'GH-PIX8P', description: 'Google flagship with intelligent cameras, a smooth display and clean Android experience.', price: 949, discountPrice: 849, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Google', category: 'Phones', variant: { sku: 'GH-PIX8P-256', storage: '256GB', ram: '12GB', quantity: 6 } },
  { name: 'Samsung Galaxy A55', slug: 'samsung-galaxy-a55', sku: 'GH-A55', description: 'Balanced mid-range phone with a vivid AMOLED display, strong battery and expandable value.', price: 499, discountPrice: 449, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Samsung', category: 'Phones', variant: { sku: 'GH-A55-128', storage: '128GB', ram: '8GB', quantity: 18 } },
  { name: 'Xiaomi Redmi Note 13 Pro', slug: 'redmi-note-13-pro', sku: 'GH-RN13P', description: 'Feature-packed phone with a 200MP camera, fast charging and a smooth AMOLED display.', price: 399, discountPrice: 359, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Xiaomi', category: 'Phones', variant: { sku: 'GH-RN13P-256', storage: '256GB', ram: '8GB', quantity: 13 } },
  { name: 'Anker 20W USB-C Charger', slug: 'anker-20w-usb-c-charger', sku: 'GH-ANK20', description: 'Compact fast charger for compatible phones, tablets and accessories.', price: 29, condition: 'BRAND_NEW', warrantyMonths: 6, brand: 'Anker', category: 'Accessories', variant: { sku: 'GH-ANK20-WHT', quantity: 30 } },
  { name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', sku: 'GH-XM5', description: 'Premium wireless headphones with industry-leading noise cancellation and rich sound.', price: 399, discountPrice: 349, condition: 'BRAND_NEW', warrantyMonths: 12, brand: 'Sony', category: 'Audio', variant: { sku: 'GH-XM5-BLK', quantity: 10 } },
] as const;

const phoneSpecs: Record<string, Array<[string, string]>> = {
  'GH-IP15P': [['Display', '6.1-inch OLED'], ['Camera', '48MP triple camera'], ['Battery', 'Up to 23 hours video']],
  'GH-S24': [['Display', '6.2-inch AMOLED 120Hz'], ['Camera', '50MP triple camera'], ['Battery', '4000mAh']],
  'GH-IP14': [['Display', '6.1-inch OLED'], ['Camera', '12MP dual camera'], ['Battery', 'Up to 20 hours video']],
  'GH-PIX8P': [['Display', '6.7-inch OLED 120Hz'], ['Camera', '50MP triple camera'], ['Battery', '5050mAh']],
  'GH-A55': [['Display', '6.6-inch AMOLED 120Hz'], ['Camera', '50MP triple camera'], ['Battery', '5000mAh']],
  'GH-RN13P': [['Display', '6.67-inch AMOLED 120Hz'], ['Camera', '200MP triple camera'], ['Battery', '5100mAh']],
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  for (const item of products) {
    const [category, brand] = await Promise.all([
      prisma.category.upsert({ where: { slug: slugify(item.category) }, create: { name: item.category, slug: slugify(item.category) }, update: { name: item.category } }),
      prisma.brand.upsert({ where: { slug: slugify(item.brand) }, create: { name: item.brand, slug: slugify(item.brand) }, update: { name: item.brand } }),
    ]);
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      create: { name: item.name, slug: item.slug, sku: item.sku, reference: item.sku, description: item.description, price: item.price, discountPrice: 'discountPrice' in item ? item.discountPrice : null, condition: item.condition as ProductCondition, warrantyMonths: item.warrantyMonths, featured: true, categoryId: category.id, brandId: brand.id },
      update: { name: item.name, reference: item.sku, description: item.description, price: item.price, discountPrice: 'discountPrice' in item ? item.discountPrice : null, condition: item.condition as ProductCondition, warrantyMonths: item.warrantyMonths, isActive: true, categoryId: category.id, brandId: brand.id },
    });
    const variant = await prisma.productVariant.upsert({
      where: { sku: item.variant.sku },
      create: { sku: item.variant.sku, storage: 'storage' in item.variant ? item.variant.storage : null, ram: 'ram' in item.variant ? item.variant.ram : null, productId: product.id },
      update: { storage: 'storage' in item.variant ? item.variant.storage : null, ram: 'ram' in item.variant ? item.variant.ram : null, productId: product.id },
    });
    for (const [name, value] of phoneSpecs[item.sku] ?? []) {
      await prisma.productSpecification.upsert({ where: { productId_name: { productId: product.id, name } }, create: { productId: product.id, name, value, group: 'Key specifications' }, update: { value, group: 'Key specifications' } });
    }
    await prisma.inventory.upsert({ where: { variantId: variant.id }, create: { variantId: variant.id, quantity: item.variant.quantity, lowStockAt: 3 }, update: { quantity: item.variant.quantity } });
  }
  console.log(`Seeded ${products.length} backend catalogue products.`);
}

main().finally(() => prisma.$disconnect());
