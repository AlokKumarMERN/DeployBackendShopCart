import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import Product from './models/Product.js';
import User from './models/User.js';

dotenv.config();

const sampleProducts = [
  // Perfumes
  {
    name: 'Royal Eau de Parfum',
    category: 'Perfumes',
    description: 'Long lasting fragrance with floral top notes and woody base. Perfect for daily wear and special occasions.',
    images: ['https://i.ibb.co/m546HBqX/perfume-One.png', 'https://i.ibb.co/qYjgJNrj/P34.jpg', 'https://i.ibb.co/Nd8q4b5m/P37.jpg'],
    price: 999,
    discountPercent: 50,
    sizes: [
      { label: '30ml', price: 499, stock: 50 },
      { label: '50ml', price: 799, stock: 40 },
      { label: '100ml', price: 1299, stock: 30 },
    ],
    stock: 0,
    featured: true,
  },
  {
    name: 'Mystic Night Perfume',
    category: 'Perfumes',
    description: 'Sensual evening fragrance with oriental spices and musk. Makes a lasting impression.',
    images: ['https://i.ibb.co/JR4ddw96/fogg-two-resize.png', 'https://i.ibb.co/Nd8q4b5m/P37.jpg', 'https://i.ibb.co/hJLPLGnm/P42.jpg'],
    price: 1299,
    discountPercent: 40,
    sizes: [
      { label: '50ml', price: 779, stock: 35 },
      { label: '100ml', price: 1399, stock: 25 },
    ],
    stock: 0,
    featured: true,
  },
  
  // Gifts
  {
    name: 'Premium Gift Hamper',
    category: 'Gifts',
    description: 'Luxury gift box with assorted chocolates, dry fruits, and decorative items. Perfect for festivals and celebrations.',
    images: ['https://i.ibb.co/5xSJ55PV/giftTwo.png', 'https://i.ibb.co/hJLPLGnm/P42.jpg', 'https://i.ibb.co/qYfrXsQ6/P44.jpg'],
    price: 1499,
    discountPercent: 30,
    sizes: [],
    stock: 25,
    featured: true,
  },
  {
    name: 'Personalized Photo Frame Set',
    category: 'Gifts',
    description: 'Set of 3 elegant photo frames with customization options. Great for home decor.',
    images: ['https://i.ibb.co/B2KGrnSj/giftOne.png', 'https://i.ibb.co/qYfrXsQ6/P44.jpg', 'https://i.ibb.co/pB5fKCWM/P57.jpg'],
    price: 799,
    discountPercent: 25,
    sizes: [],
    stock: 40,
    featured: false,
  },

  // Cosmetics
  {
    name: 'Radiant Glow Face Serum',
    category: 'Cosmetics',
    description: 'Vitamin C enriched face serum for brightening and anti-aging. Suitable for all skin types.',
    images: ['https://i.ibb.co/R4gBD34W/makeup-Two.png', 'https://i.ibb.co/pB5fKCWM/P57.jpg', 'https://i.ibb.co/BKNSSHmd/P58.jpg'],
    price: 899,
    discountPercent: 35,
    sizes: [
      { label: '30ml', price: 584, stock: 35 },
      { label: '60ml', price: 999, stock: 25 },
    ],
    stock: 0,
    featured: true,
  },
  {
    name: 'Matte Lipstick Collection',
    category: 'Cosmetics',
    description: 'Set of 6 long-lasting matte lipsticks in trending shades. Smudge-proof and moisturizing.',
    images: ['https://i.ibb.co/CsBgZVDQ/makeup-One.png', 'https://i.ibb.co/BKNSSHmd/P58.jpg', 'https://i.ibb.co/6KqvFrd/P59.jpg'],
    price: 699,
    discountPercent: 40,
    sizes: [],
    stock: 50,
    featured: true,
  },

  // Toys
  {
    name: 'Educational Building Blocks',
    category: 'Toys',
    description: 'Colorful building blocks set with 200+ pieces. Enhances creativity and motor skills for kids 3+.',
    images: ['https://i.ibb.co/yBNtBn1n/toyTwo.png', 'https://i.ibb.co/6KqvFrd/P59.jpg', 'https://i.ibb.co/7x6h6hDN/P60.jpg'],
    price: 1199,
    discountPercent: 45,
    sizes: [],
    stock: 30,
    featured: true,
  },
  {
    name: 'Remote Control Racing Car',
    category: 'Toys',
    description: 'High-speed RC car with LED lights and rechargeable battery. Perfect gift for boys and girls.',
    images: ['https://i.ibb.co/XfqR8Tp1/topOne.png', 'https://i.ibb.co/7x6h6hDN/P60.jpg', 'https://i.ibb.co/dwnL1q9c/p21.jpg'],
    price: 1999,
    discountPercent: 35,
    sizes: [],
    stock: 20,
    featured: false,
  },

  // Bangles
  {
    name: 'Traditional Gold Plated Bangles',
    category: 'Bangles',
    description: 'Set of 4 elegant gold plated bangles with intricate designs. Perfect for ethnic wear.',
    images: ['https://i.ibb.co/ynRYFtxC/bangle-Two.png', 'https://i.ibb.co/dwnL1q9c/p21.jpg', 'https://i.ibb.co/qYjgJNrj/P34.jpg'],
    price: 599,
    discountPercent: 50,
    sizes: [
      { label: '2.4 (Small)', price: 299, stock: 25 },
      { label: '2.6 (Medium)', price: 299, stock: 30 },
      { label: '2.8 (Large)', price: 299, stock: 20 },
    ],
    stock: 0,
    featured: true,
  },
  {
    name: 'Crystal Stone Bangle Set',
    category: 'Bangles',
    description: 'Pair of stunning bangles with Austrian crystals. Adds sparkle to any outfit.',
    images: ['https://i.ibb.co/rRKNTPXF/bangle-One.png', 'https://i.ibb.co/qYjgJNrj/P34.jpg', 'https://i.ibb.co/Nd8q4b5m/P37.jpg'],
    price: 799,
    discountPercent: 40,
    sizes: [],
    stock: 35,
    featured: false,
  },

  // Belts
  {
    name: 'Leather Formal Belt',
    category: 'Belts',
    description: 'Genuine leather belt with reversible black and brown sides. Elegant metal buckle.',
    images: ['https://i.ibb.co/NnyY3nbT/beltTwo.png', 'https://i.ibb.co/Nd8q4b5m/P37.jpg', 'https://i.ibb.co/hJLPLGnm/P42.jpg'],
    price: 899,
    discountPercent: 45,
    sizes: [
      { label: '32', price: 494, stock: 15 },
      { label: '34', price: 494, stock: 20 },
      { label: '36', price: 494, stock: 20 },
      { label: '38', price: 494, stock: 15 },
    ],
    stock: 0,
    featured: true,
  },
  {
    name: 'Canvas Casual Belt',
    category: 'Belts',
    description: 'Durable canvas belt with military-style buckle. Perfect for casual and outdoor wear.',
    images: ['https://i.ibb.co/K3ndxp1/beltOne.png', 'https://i.ibb.co/hJLPLGnm/P42.jpg', 'https://i.ibb.co/qYfrXsQ6/P44.jpg'],
    price: 599,
    discountPercent: 35,
    sizes: [
      { label: 'S (28-32)', price: 389, stock: 18 },
      { label: 'M (32-36)', price: 389, stock: 25 },
      { label: 'L (36-40)', price: 389, stock: 22 },
    ],
    stock: 0,
    featured: false,
  },

  // Watches
  {
    name: 'Classic Analog Watch',
    category: 'Watches',
    description: 'Stylish analog watch with stainless steel strap and water resistance. Perfect for formal occasions.',
    images: ['https://i.ibb.co/bRq5hd09/watchTwo.png', 'https://i.ibb.co/qYfrXsQ6/P44.jpg', 'https://i.ibb.co/pB5fKCWM/P57.jpg'],
    price: 1999,
    discountPercent: 55,
    sizes: [],
    stock: 25,
    featured: true,
  },
  {
    name: 'Sports Digital Watch',
    category: 'Watches',
    description: 'Multifunctional digital watch with alarm, stopwatch, and backlight. Water resistant.',
    images: ['https://i.ibb.co/C3tgxhzT/watchOne.png', 'https://i.ibb.co/pB5fKCWM/P57.jpg', 'https://i.ibb.co/BKNSSHmd/P58.jpg'],
    price: 799,
    discountPercent: 50,
    sizes: [],
    stock: 30,
    featured: false,
  },

  // Caps
  {
    name: 'Premium Cotton Cap',
    category: 'Caps',
    description: 'Comfortable cotton cap with adjustable strap. Available in multiple colors.',
    images: ['https://i.ibb.co/FLXkM05W/capOne.png', 'https://i.ibb.co/BKNSSHmd/P58.jpg', 'https://i.ibb.co/6KqvFrd/P59.jpg'],
    price: 299,
    discountPercent: 30,
    sizes: [],
    stock: 60,
    featured: false,
  },
  {
    name: 'Trendy Snapback Cap',
    category: 'Caps',
    description: 'Urban style snapback with embroidered logo. Perfect for casual outings.',
    images: ['https://i.ibb.co/20Rvc1Wy/capTwo.png', 'https://i.ibb.co/6KqvFrd/P59.jpg', 'https://i.ibb.co/7x6h6hDN/P60.jpg'],
    price: 499,
    discountPercent: 40,
    sizes: [],
    stock: 45,
    featured: true,
  },

  // Birthday Items
  {
    name: 'Birthday Decoration Kit',
    category: 'Birthday Items',
    description: 'Complete party decoration set with balloons, banners, and confetti. Makes celebrations special.',
    images: ['https://i.ibb.co/N21wwj6X/birthday-Two.png', 'https://i.ibb.co/7x6h6hDN/P60.jpg', 'https://i.ibb.co/dwnL1q9c/p21.jpg'],
    price: 699,
    discountPercent: 35,
    sizes: [],
    stock: 40,
    featured: true,
  },
  {
    name: 'Happy Birthday LED Banner',
    category: 'Birthday Items',
    description: 'Colorful LED light-up banner with multiple lighting modes. Reusable and eye-catching.',
    images: ['https://i.ibb.co/zTshWQjW/birthday-One.png', 'https://i.ibb.co/dwnL1q9c/p21.jpg', 'https://i.ibb.co/qYjgJNrj/P34.jpg'],
    price: 399,
    discountPercent: 25,
    sizes: [],
    stock: 50,
    featured: false,
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await Product.deleteMany({});
    await User.deleteMany({});

    console.log('👤 Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    
    const adminUser = await User.create({
      name: 'Admin',
      email: 'adminalok@gmail.com',
      passwordHash,
      role: 'admin',
    });
    console.log(`✅ Admin user created: ${adminUser.email}`);

    console.log('�📦 Inserting products...');
    const products = await Product.insertMany(sampleProducts);


    console.log(`✅ Successfully seeded ${products.length} products!`);
    console.log('\nSample Products by Category:');
    
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(category => {
      const count = products.filter(p => p.category === category).length;
      console.log(`  - ${category}: ${count} products`);
    });

    console.log('\n📝 Admin Credentials:');
    console.log('   Email: adminalok@gmail.com');
    console.log('   Password: admin123');

    console.log('\n🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

