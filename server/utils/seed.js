require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Stage = require('../models/Stage');

const STAGES = [
  { stageNumber: 1, stageName: 'Shearing' },
  { stageNumber: 2, stageName: 'Brushing' },
  { stageNumber: 3, stageName: 'Etching' },
  { stageNumber: 4, stageName: 'Circuit Printing' },
  { stageNumber: 5, stageName: 'CCD Inspection' },
  { stageNumber: 6, stageName: 'Mask Printing' },
  { stageNumber: 7, stageName: 'CNC Routing' },
  { stageNumber: 8, stageName: 'Final Inspection' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    const existingAdmin = await User.findOne({ userId: 'admin' });
    if (existingAdmin) {
      console.log('Default admin user already exists, skipping.');
    } else {
      await User.create({
        name: 'Administrator',
        userId: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true,
      });
      console.log('Default admin user created (userId: admin, password: admin123).');
    }

    for (const stage of STAGES) {
      await Stage.findOneAndUpdate(
        { stageNumber: stage.stageNumber },
        { $set: { stageName: stage.stageName } },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${STAGES.length} stages.`);

    console.log('Seeding complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
