# MongoDB Quick Start Guide

## ✅ MongoDB Atlas is REQUIRED!

This application uses **MongoDB Atlas exclusively** for all data storage. Local file storage has been removed.

## 🚀 Quick Commands

```bash
# Test MongoDB connection (IMPORTANT: Run this first!)
npm run test:mongo

# Start the application
npm run dev

# Create admin user
npm run create-admin
```

## 📊 Current Setup

- **Database**: `workpulse`
- **Connection**: MongoDB Atlas Cloud (REQUIRED)
- **Status**: Must be configured before starting
- **Collections**: 9 collections with 20+ indexes

## ⚠️ Before You Start

You **MUST** have a valid `MONGODB_URI` in your `.env` file. Without it, the application will not start.

## 🔧 First-Time Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free (no credit card required)
3. Create a FREE M0 cluster

### Step 2: Get Connection String

1. Create a database user with password
2. Whitelist your IP (0.0.0.0/0 for development)
3. Get connection string from "Connect" button
4. Update `.env` file:

```bash
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/workpulse?retryWrites=true&w=majority"
```

### Step 3: Test & Start

```bash
# 1. Test connection
npm run test:mongo

# 2. Start app (will auto-seed initial data)
npm run dev
```

## ✅ Expected Output

When starting the app, you should see:

```
📦 Using MongoDB Cloud storage
✓ Connected to MongoDB: workpulse
✓ MongoDB indexes created
[WorkPulse Server] Running on http://0.0.0.0:3000
```

## ❌ Error: MongoDB Not Configured

If you see this error:

```
❌ MONGODB_URI is not configured!
   This application requires MongoDB Atlas for data storage.
```

**Solution**: Add `MONGODB_URI` to your `.env` file (see Step 2 above)

## 🔍 Verify Setup

Run the connection test:
```bash
npm run test:mongo
```

Expected output:
```
✅ Successfully connected to MongoDB!
📊 Database Statistics:
   Collections: 9
   Indexes: 20+
```

## 📚 Documentation

- **[MONGODB_SETUP.md](MONGODB_SETUP.md)** - Detailed setup guide
- **[README.md](README.md)** - General documentation

## 💾 Data Storage

- ✅ All data stored in MongoDB Atlas cloud
- ✅ Automatic backups (Atlas feature)
- ✅ Automatic indexing for performance
- ✅ Encrypted connections
- ❌ No local file storage
- ❌ No offline mode

## 🆘 Troubleshooting

### Connection Failed

1. Verify `MONGODB_URI` in `.env` is correct
2. Check IP whitelist in MongoDB Atlas (use 0.0.0.0/0 for testing)
3. Confirm username/password are correct
4. Check if special characters in password are URL-encoded

### App Won't Start

If the app exits immediately:
1. Run `npm run test:mongo` to diagnose
2. Check the error message
3. Update `MONGODB_URI` in `.env`
4. See [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed help

## 🎯 Production Ready

This setup is production-ready:
- ✅ Cloud-native storage
- ✅ Automatic backups
- ✅ Scalable infrastructure
- ✅ Enterprise security
- ✅ Multi-region support

For production, consider upgrading to M10+ cluster for:
- Dedicated resources
- Better performance
- Advanced monitoring
- Point-in-time recovery

---

**Ready to go! Run `npm run test:mongo` to verify, then `npm run dev` to start. 🚀**

