# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b1428e2b-632f-41d4-a3ae-cbc67a0c5fa0

## Features

- ✅ **MongoDB Cloud Storage** - All data stored securely in MongoDB Atlas
- ✅ **Production Ready** - Enterprise-grade cloud database
- ✅ **Automatic Indexing** - Optimized queries with 20+ indexes
- ✅ **Scalable** - Grows with your application
- ✅ **Secure** - Encrypted connections and data at rest

## Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account (free tier available)

## Setup Instructions

### 1. MongoDB Atlas Setup (Required)

This application requires MongoDB Atlas for data storage. Follow these steps:

1. **Create MongoDB Atlas Account**
   - Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free (no credit card required)

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose FREE tier (M0)
   - Select your preferred region
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Set username and password
   - Grant "Read and write to any database" permission

4. **Whitelist IP Address**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development: Allow Access from Anywhere (0.0.0.0/0)
   - For production: Add specific IP addresses

5. **Get Connection String**
   - Go to "Database" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string

### 2. Application Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```bash
   # Required: Your Gemini API key
   GEMINI_API_KEY="your-gemini-api-key"
   
   # Required: MongoDB connection string
   MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/workpulse?retryWrites=true&w=majority"
   ```

3. Test MongoDB connection:
   ```bash
   npm run test:mongo
   ```

4. Start the application:
   ```bash
   npm run dev
   ```

   You should see:
   ```
   📦 Using MongoDB Cloud storage
   ✓ Connected to MongoDB: workpulse
   [WorkPulse Server] Running on http://0.0.0.0:3000
   ```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run test:mongo   # Test MongoDB connection
npm run create-admin # Create an admin user
```

## Database Information

- **Storage**: MongoDB Atlas (Cloud)
- **Collections**: 9 collections (users, tasks, projects, etc.)
- **Indexes**: 20+ optimized indexes
- **Backup**: Automatic with MongoDB Atlas
- **Scaling**: Horizontal scaling available

## Troubleshooting

### MongoDB Connection Failed

If you see an error connecting to MongoDB:

1. **Verify connection string** in `.env`
2. **Check IP whitelist** in MongoDB Atlas
3. **Confirm database user credentials**
4. **Test connection**: `npm run test:mongo`

See [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed troubleshooting.

## Documentation

- [MONGODB_SETUP.md](MONGODB_SETUP.md) - Complete MongoDB setup guide
- [QUICK_START_MONGODB.md](QUICK_START_MONGODB.md) - Quick reference

## Production Deployment

For production deployments:
1. Use dedicated MongoDB cluster (M10+)
2. Enable authentication and TLS
3. Set up automated backups
4. Configure monitoring and alerts
5. Use environment-specific databases

---

**Need Help?** Check [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed instructions and troubleshooting.

