import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import connectDB from './config/db.js';

dotenv.config();

const checkProduct = async () => {
  try {
    await connectDB();
    
    const products = await Product.find({ name: /Trendy Snapback/i });
    
    if (products.length > 0) {
      console.log('✅ Product found!');
      console.log('Product ID:', products[0]._id);
      console.log('Product Name:', products[0].name);
      console.log('Total Reviews:', products[0].reviews.length);
    } else {
      console.log('❌ Product NOT found in database');
      console.log('\nSearching all products...');
      const allProducts = await Product.find().select('_id name');
      console.log('Total products:', allProducts.length);
      allProducts.forEach(p => console.log(`- ${p.name} (${p._id})`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkProduct();
