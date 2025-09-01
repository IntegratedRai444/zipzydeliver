import express from 'express';
import cors from 'cors';
import { setupSession } from './session-config';
import { completeRouter } from './complete-routes';
import { LocalMongoDBStorage } from './storage-local-mongodb';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Setup session middleware
setupSession(app);

// Use local MongoDB storage
app.locals.storage = new LocalMongoDBStorage();

// Mount API routes
app.use('/api', completeRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: 'Local MongoDB' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with Local MongoDB`);
  console.log(`📊 Database: mongodb://localhost:27017/zipzy`);
});
