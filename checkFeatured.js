import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import connectDB from './config/db.js';

dotenv.config();

const checkFeatured = async () => {
  try {
    await connectDB();
    
    const allProducts = await Product.find().select('_id name featured');
    const featuredProducts = await Product.find({ featured: true }).select('_id name');
    
    console.log('=== Product Analysis ===');
    console.log('Total products in database:', allProducts.length);
    console.log('Featured products:', featuredProducts.length);
    
    if (featuredProducts.length > 0) {
      console.log('\nFeatured Products:');
      featuredProducts.forEach(p => console.log(`  - ${p.name}`));
    } else {
      console.log('\n⚠️ NO FEATURED PRODUCTS FOUND!');
      console.log('The Home page only loads products with featured: true');
      console.log('\nAll products (showing featured status):');
      allProducts.slice(0, 10).forEach(p => console.log(`  - ${p.name} (featured: ${p.featured})`));
      if (allProducts.length > 10) {
        console.log(`  ... and ${allProducts.length - 10} more products`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkFeatured();
