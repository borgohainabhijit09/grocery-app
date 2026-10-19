import { PrismaClient, type FulfillmentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedVariant = {
  label: string;
  pricePaise: number;
  mrpPaise?: number;
  stockQty: number;
  sku: string;
};

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  brand?: string;
  unit?: string;
  image: string;
  categorySlug: string;
  isFeatured?: boolean;
  tags?: string[];
  variants: SeedVariant[];
};

const categories: { name: string; slug: string; image: string; sortOrder: number }[] = [
  { name: "Fruits & Vegetables", slug: "fruits-vegetables", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600", sortOrder: 1 },
  { name: "Dairy & Eggs", slug: "dairy-eggs", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600", sortOrder: 2 },
  { name: "Bakery", slug: "bakery", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600", sortOrder: 3 },
  { name: "Staples & Grains", slug: "staples-grains", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600", sortOrder: 4 },
  { name: "Snacks & Beverages", slug: "snacks-beverages", image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600", sortOrder: 5 },
  { name: "Personal Care", slug: "personal-care", image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600", sortOrder: 6 },
  { name: "Household", slug: "household", image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600", sortOrder: 7 },
];

const image = (id: string) => `https://images.unsplash.com/${id}?w=800`;

const products: SeedProduct[] = [
  {
    name: "Fresh Bananas",
    slug: "fresh-bananas",
    description: "Naturally ripened, sweet and rich in potassium. Ideal for smoothies and snacking.",
    unit: "6 pcs",
    image: image("photo-1571771894821-ce9b6c11b08e"),
    categorySlug: "fruits-vegetables",
    isFeatured: true,
    tags: ["fruit", "fresh"],
    variants: [{ label: "Bunch of 6", pricePaise: 4000, mrpPaise: 5000, stockQty: 120, sku: "FV-BAN-6" }],
  },
  {
    name: "Shimla Apples",
    slug: "shimla-apples",
    description: "Crisp and juicy apples sourced from Himachal orchards.",
    unit: "1 kg",
    image: image("photo-1568702846914-96b305d2aaeb"),
    categorySlug: "fruits-vegetables",
    isFeatured: true,
    tags: ["fruit"],
    variants: [
      { label: "500 g", pricePaise: 9500, mrpPaise: 11000, stockQty: 60, sku: "FV-APP-500" },
      { label: "1 kg", pricePaise: 18000, mrpPaise: 21000, stockQty: 45, sku: "FV-APP-1K" },
    ],
  },
  {
    name: "Farm Tomatoes",
    slug: "farm-tomatoes",
    description: "Firm, tangy tomatoes perfect for curries and salads.",
    unit: "1 kg",
    image: image("photo-1592924357228-91a4daadcfea"),
    categorySlug: "fruits-vegetables",
    tags: ["vegetable"],
    variants: [{ label: "1 kg", pricePaise: 3000, mrpPaise: 4000, stockQty: 200, sku: "FV-TOM-1K" }],
  },
  {
    name: "Red Onions",
    slug: "red-onions",
    description: "Fresh, pungent onions — a kitchen staple.",
    unit: "1 kg",
    image: image("photo-1518977676601-b53f82aba655"),
    categorySlug: "fruits-vegetables",
    tags: ["vegetable"],
    variants: [{ label: "1 kg", pricePaise: 3500, stockQty: 180, sku: "FV-ONI-1K" }],
  },
  {
    name: "Full Cream Milk",
    slug: "full-cream-milk",
    description: "Farm-fresh homogenised full cream milk.",
    unit: "1 L",
    image: image("photo-1563636619-e9143da7973b"),
    categorySlug: "dairy-eggs",
    isFeatured: true,
    tags: ["dairy"],
    variants: [
      { label: "500 ml", pricePaise: 3000, stockQty: 150, sku: "DE-MLK-500" },
      { label: "1 L", pricePaise: 5800, mrpPaise: 6200, stockQty: 120, sku: "DE-MLK-1L" },
    ],
  },
  {
    name: "Farm Eggs",
    slug: "farm-eggs",
    description: "Protein-rich, cage-free farm eggs.",
    unit: "6 pcs",
    image: image("photo-1582722872445-44dc5f7e3c8f"),
    categorySlug: "dairy-eggs",
    tags: ["eggs"],
    variants: [
      { label: "6 pcs", pricePaise: 4500, stockQty: 80, sku: "DE-EGG-6" },
      { label: "12 pcs", pricePaise: 8500, mrpPaise: 9000, stockQty: 50, sku: "DE-EGG-12" },
    ],
  },
  {
    name: "Fresh Paneer",
    slug: "fresh-paneer",
    description: "Soft, creamy paneer made from pure milk.",
    unit: "200 g",
    image: image("photo-1631452180519-c014fe946bc7"),
    categorySlug: "dairy-eggs",
    tags: ["dairy"],
    variants: [{ label: "200 g", pricePaise: 9000, mrpPaise: 10000, stockQty: 40, sku: "DE-PAN-200" }],
  },
  {
    name: "Brown Bread",
    slug: "brown-bread",
    description: "Soft, fibre-rich brown bread baked fresh daily.",
    unit: "400 g",
    image: image("photo-1509440159596-0249088772ff"),
    categorySlug: "bakery",
    isFeatured: true,
    tags: ["bakery"],
    variants: [{ label: "400 g", pricePaise: 4500, stockQty: 60, sku: "BK-BRD-400" }],
  },
  {
    name: "Butter Croissants",
    slug: "butter-croissants",
    description: "Flaky, buttery croissants — perfect for breakfast.",
    unit: "2 pcs",
    image: image("photo-1555507036-ab1f4038808a"),
    categorySlug: "bakery",
    tags: ["bakery"],
    variants: [{ label: "Pack of 2", pricePaise: 12000, mrpPaise: 14000, stockQty: 30, sku: "BK-CRO-2" }],
  },
  {
    name: "Basmati Rice",
    slug: "basmati-rice",
    description: "Long-grain aged basmati rice with a rich aroma.",
    unit: "1 kg",
    image: image("photo-1586201375761-83865001e31c"),
    categorySlug: "staples-grains",
    isFeatured: true,
    tags: ["staples"],
    variants: [
      { label: "1 kg", pricePaise: 14000, mrpPaise: 16000, stockQty: 100, sku: "SG-RIC-1K" },
      { label: "5 kg", pricePaise: 65000, mrpPaise: 72000, stockQty: 40, sku: "SG-RIC-5K" },
    ],
  },
  {
    name: "Toor Dal",
    slug: "toor-dal",
    description: "Premium quality unpolished toor dal.",
    unit: "1 kg",
    image: image("photo-1596797038530-2c107229654b"),
    categorySlug: "staples-grains",
    tags: ["staples", "pulses"],
    variants: [{ label: "1 kg", pricePaise: 16000, stockQty: 90, sku: "SG-DAL-TOR" }],
  },
  {
    name: "Whole Wheat Atta",
    slug: "whole-wheat-atta",
    description: "Stone-ground whole wheat flour for soft rotis.",
    unit: "5 kg",
    image: image("photo-1509440159596-0249088772ff"),
    categorySlug: "staples-grains",
    tags: ["staples"],
    variants: [{ label: "5 kg", pricePaise: 26000, mrpPaise: 29000, stockQty: 70, sku: "SG-ATT-5K" }],
  },
  {
    name: "Potato Chips - Salted",
    slug: "potato-chips-salted",
    description: "Crispy salted potato chips.",
    unit: "52 g",
    image: image("photo-1566478989037-eec170784d0b"),
    categorySlug: "snacks-beverages",
    tags: ["snacks"],
    variants: [{ label: "52 g", pricePaise: 2000, stockQty: 300, sku: "SB-CHP-52" }],
  },
  {
    name: "Orange Juice",
    slug: "orange-juice",
    description: "100% pure squeezed orange juice, no added sugar.",
    unit: "1 L",
    image: image("photo-1600271886742-f049cd451bba"),
    categorySlug: "snacks-beverages",
    isFeatured: true,
    tags: ["beverages"],
    variants: [{ label: "1 L", pricePaise: 12000, mrpPaise: 14000, stockQty: 55, sku: "SB-OJ-1L" }],
  },
  {
    name: "Herbal Toothpaste",
    slug: "herbal-toothpaste",
    description: "Fluoride-free herbal toothpaste with neem.",
    unit: "150 g",
    image: image("photo-1556228578-8c89e6adf883"),
    categorySlug: "personal-care",
    tags: ["oral-care"],
    variants: [{ label: "150 g", pricePaise: 9500, stockQty: 80, sku: "PC-TPS-150" }],
  },
  {
    name: "Dishwash Liquid",
    slug: "dishwash-liquid",
    description: "Concentrated lemon dishwash gel — tough on grease.",
    unit: "750 ml",
    image: image("photo-1583947215259-38e31be8751f"),
    categorySlug: "household",
    tags: ["cleaning"],
    variants: [{ label: "750 ml", pricePaise: 11000, mrpPaise: 12500, stockQty: 65, sku: "HH-DWL-750" }],
  },
];

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0); // @db.Date stores UTC date — must use UTC midnight
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const deliverySlotTemplates = [
  { startTime: "09:00", endTime: "12:00" },
  { startTime: "12:00", endTime: "15:00" },
  { startTime: "16:00", endTime: "19:00" },
  { startTime: "19:00", endTime: "21:00" },
];

const pickupSlotTemplates = [
  { startTime: "08:00", endTime: "11:00" },
  { startTime: "11:00", endTime: "14:00" },
  { startTime: "15:00", endTime: "18:00" },
];

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const customerPassword = await bcrypt.hash("Customer@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@grocery.test" },
    update: { role: "ADMIN" },
    create: {
      name: "Store Admin",
      email: "admin@grocery.test",
      phone: "9876543210",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@grocery.test" },
    update: { role: "STAFF" },
    create: {
      name: "Store Staff",
      email: "staff@grocery.test",
      phone: "9876543211",
      password: adminPassword,
      role: "STAFF",
    },
  });

  const deliveryPassword = await bcrypt.hash("Delivery@123", 10);
  await prisma.user.upsert({
    where: { email: "delivery@grocery.test" },
    update: { role: "DELIVERY" },
    create: {
      name: "Ravi Kumar",
      email: "delivery@grocery.test",
      phone: "9876543212",
      password: deliveryPassword,
      role: "DELIVERY",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@grocery.test" },
    update: {},
    create: {
      name: "Sample Customer",
      email: "customer@grocery.test",
      phone: "9876500000",
      password: customerPassword,
      role: "CUSTOMER",
    },
  });

  await prisma.address.upsert({
    where: { id: "seed-address-1" },
    update: {
      line1: "Jail Road",
      city: "Dibrugarh",
      state: "Assam",
      pincode: "786001",
      latitude: 27.4728,
      longitude: 94.9120,
    },
    create: {
      id: "seed-address-1",
      userId: customer.id,
      label: "Home",
      fullName: "Sample Customer",
      phone: "9876500000",
      line1: "Jail Road",
      city: "Dibrugarh",
      state: "Assam",
      pincode: "786001",
      latitude: 27.4728,
      longitude: 94.9120,
      isDefault: true,
    },
  });

  const categoryBySlug = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, image: c.image, sortOrder: c.sortOrder, isActive: true },
      create: { name: c.name, slug: c.slug, image: c.image, sortOrder: c.sortOrder, isActive: true },
    });
    categoryBySlug.set(c.slug, cat.id);
  }

  for (const p of products) {
    const categoryId = categoryBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`Skipping product ${p.slug}: unknown category ${p.categorySlug}`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        brand: p.brand ?? null,
        unit: p.unit ?? null,
        images: [p.image],
        tags: p.tags ?? [],
        categoryId,
        isActive: true,
        isFeatured: p.isFeatured ?? false,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        brand: p.brand ?? null,
        unit: p.unit ?? null,
        images: [p.image],
        tags: p.tags ?? [],
        categoryId,
        isActive: true,
        isFeatured: p.isFeatured ?? false,
      },
    });

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          label: v.label,
          pricePaise: v.pricePaise,
          mrpPaise: v.mrpPaise ?? null,
          stockQty: v.stockQty,
        },
        create: {
          productId: product.id,
          label: v.label,
          pricePaise: v.pricePaise,
          mrpPaise: v.mrpPaise ?? null,
          stockQty: v.stockQty,
          sku: v.sku,
        },
      });
    }
  }

  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {
      addressLine: "Sygmia Learning, AT Road",
      city: "Dibrugarh",
      state: "Assam",
      pincode: "786001",
      latitude: 27.4728,
      longitude: 94.9120,
    },
    create: {
      id: "singleton",
      storeName: "Fresh Basket",
      tagline: "Daily essentials, delivered fresh.",
      contactEmail: "hello@grocery.test",
      contactPhone: "9876543210",
      addressLine: "Sygmia Learning, AT Road",
      city: "Dibrugarh",
      state: "Assam",
      pincode: "786001",
      latitude: 27.4728,
      longitude: 94.9120,
      deliveryRadiusKm: 10,
      deliveryFeePaise: 3000,
      freeDeliveryAbovePaise: 50000,
      minOrderValuePaise: 10000,
      gstEnabled: false,
      taxRatePercent: 0,
      acceptingOrders: true,
    },
  });

  const today = startOfToday();
  // Clean up past slots with no orders (safe raw SQL avoids Prisma relation-filter limits)
  await prisma.$executeRaw`DELETE FROM "Slot" WHERE date < ${today}::date AND id NOT IN (SELECT DISTINCT "slotId" FROM "Order" WHERE "slotId" IS NOT NULL)`;
  await prisma.slot.deleteMany({ where: { date: { gte: today } } });

  for (let day = 0; day < 7; day++) {
    const date = addDays(today, day);
    for (const t of deliverySlotTemplates) {
      await prisma.slot.create({
        data: { date, startTime: t.startTime, endTime: t.endTime, fulfillmentType: "DELIVERY" as FulfillmentType, capacity: 20, isActive: true },
      });
    }
    for (const t of pickupSlotTemplates) {
      await prisma.slot.create({
        data: { date, startTime: t.startTime, endTime: t.endTime, fulfillmentType: "PICKUP" as FulfillmentType, capacity: 30, isActive: true },
      });
    }
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME50" },
    update: {},
    create: {
      code: "WELCOME50",
      description: "Flat ₹50 off on your first order",
      type: "FLAT",
      value: 5000,
      minOrderPaise: 30000,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "FRESH10" },
    update: {},
    create: {
      code: "FRESH10",
      description: "10% off up to ₹100",
      type: "PERCENT",
      value: 10,
      minOrderPaise: 50000,
      maxDiscountPaise: 10000,
      isActive: true,
    },
  });

  console.log(`Seed complete. Admin: ${admin.email} / Admin@12345`);
  console.log(`Customer: ${customer.email} / Customer@123`);
  console.log(`Delivery partner: delivery@grocery.test / Delivery@123`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
