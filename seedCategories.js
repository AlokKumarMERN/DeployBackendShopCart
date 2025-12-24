import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import connectDB from './config/db.js';

dotenv.config();

const defaultCategories = [
  'Perfumes',
  'Gifts',
  'Cosmetics',
  'Toys',
  'Bangles',
  'Belts',
  'Watches',
  'Caps',
  'Birthday Items',
];

const seedCategories = async () => {
  try {
    await connectDB();

    // Check if categories already exist
    const existingCategories = await Category.find();
    
    if (existingCategories.length > 0) {
      console.log('Categories already exist. Skipping seed...');
      console.log(`Found ${existingCategories.length} categories:`, existingCategories.map(c => c.name));
      process.exit(0);
    }

    // Create default categories
    const categories = await Category.insertMany(
      defaultCategories.map(name => ({ name }))
    );

    console.log('✅ Categories seeded successfully!');
    console.log(`Created ${categories.length} categories:`, categories.map(c => c.name));
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
