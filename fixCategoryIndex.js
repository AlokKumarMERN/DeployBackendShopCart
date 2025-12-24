import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

dotenv.config();

const fixCategoryIndex = async () => {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    const collection = db.collection('categories');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the problematic slug index if it exists
    try {
      await collection.dropIndex('slug_1');
      console.log('✅ Dropped slug_1 index successfully');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index slug_1 does not exist (already removed)');
      } else {
        console.log('Error dropping index:', error.message);
      }
    }

    // Show remaining indexes
    const remainingIndexes = await collection.indexes();
    console.log('Remaining indexes:', remainingIndexes);

    console.log('✅ Category collection fixed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing category index:', error);
    process.exit(1);
  }
};

fixCategoryIndex();
