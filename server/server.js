require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const teamRoutes = require('./routes/teamRoutes');
const stageRoutes = require('./routes/stageRoutes');
const userRoutes = require('./routes/userRoutes');
const ownerRoutes = require('./routes/ownerRoutes');

connectDB();

const app = express();

// Render sits behind a proxy; needed for the real client IP in req.ip.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('PCB Tracking Management Application API is running');
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/owner', ownerRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
