# MongoDB Cloud Storage Setup Guide

This application now supports **MongoDB Atlas** (cloud database) as the primary data storage solution, with automatic fallback to local JSON files if MongoDB is not configured.

## Features

✅ **Automatic Storage Selection**: The app automatically uses MongoDB when configured, or falls back to JSON storage  
✅ **Zero Downtime Migration**: Seamlessly migrate existing data from JSON to MongoDB  
✅ **Performance Optimized**: Includes database indexes for faster queries  
✅ **Development Friendly**: Works offline with JSON storage during development  
✅ **Production Ready**: Secure cloud storage for production deployments  

---

## Quick Start

### Option 1: Use MongoDB Atlas (Recommended for Production)

1. **Create a MongoDB Atlas Account** (if you don't have one)
   - Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account (includes 512MB free tier)

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose the FREE tier (M0)
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in the left menu
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Set username and password (save these!)
   - Grant "Read and write to any database" role
   - Click "Add User"

4. **Whitelist Your IP Address**
   - Go to "Network Access" in the left menu
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your specific IP addresses
   - Click "Confirm"

5. **Get Your Connection String**
   - Go to "Database" in the left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://<username>:<password>@...`)

6. **Configure Your Application**
   - Open `.env` file in your project
   - Update the `MONGODB_URI` with your connection string
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - Example:
     ```bash
     MONGODB_URI="mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/workpulse?retryWrites=true&w=majority"
     ```

7. **Migrate Existing Data** (if you have JSON data)
   ```bash
   npm run migrate:mongo
   ```

8. **Start Your Application**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   📦 Using MongoDB Cloud storage
   ✓ Connected to MongoDB: workpulse
   ✓ MongoDB indexes created
   ```

### Option 2: Continue Using Local JSON Storage

If you prefer to keep using local JSON file storage (for development or testing):

1. Open `.env` file
2. Remove or comment out the `MONGODB_URI` line:
   ```bash
   # MONGODB_URI=""
   ```
3. Start your application:
   ```bash
   npm run dev
   ```

   You should see:
   ```
   📦 Using local JSON file storage
   ```

---

## Migration Guide

### Migrating from JSON to MongoDB

If you already have data in the local JSON file (`.data/database.json`), migrate it to MongoDB:

```bash
npm run migrate:mongo
```

This script will:
1. Connect to your MongoDB Atlas cluster
2. Load all data from the JSON file
3. Upload it to MongoDB
4. Verify the migration

**After successful migration:**
- Your application will automatically use MongoDB
- The JSON file remains as a backup
- You can safely delete `.data/database.json` if desired

### Migrating from MongoDB back to JSON

If you need to export data from MongoDB to JSON:

1. Temporarily set `MONGODB_URI` in `.env`
2. Start the application (it will load data from MongoDB)
3. Remove or comment out `MONGODB_URI`
4. Restart the application
5. The data will be saved to `.data/database.json` on the first write operation

---

## Environment Variables

Add these to your `.env` file:

```bash
# MongoDB Atlas Connection URI
# Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
MONGODB_URI="your-connection-string-here"

# MongoDB Database Name (optional, defaults to 'workpulse')
MONGODB_DB_NAME="workpulse"
```

---

## Database Schema

The application stores data in these MongoDB collections:

- **users** - User accounts with authentication
- **tasks** - Task management data
- **activityLogs** - Audit trail of all actions
- **settings** - Company-wide settings
- **clients** - Client contact information
- **leads** - Sales leads and opportunities
- **scopeTemplates** - Project scope templates
- **estimates** - Cost estimates and proposals
- **projects** - Active projects with invoices, timesheets, and expenses

### Indexes

For optimal performance, the following indexes are automatically created:

- `users.email` (unique)
- `users.role`
- `tasks.assigneeId`, `tasks.status`, `tasks.deadline`
- `activityLogs.timestamp`, `activityLogs.actorId`
- `clients.email`
- `leads.stage`, `leads.clientEmail`
- `estimates.proposalNumber` (unique), `estimates.stage`, `estimates.leadId`
- `projects.status`, `projects.assignedPmId`

---

## Troubleshooting

### Connection Issues

**Problem:** `Failed to connect to MongoDB`

**Solutions:**
1. Verify your `MONGODB_URI` is correct in `.env`
2. Check that your IP address is whitelisted in MongoDB Atlas
3. Ensure your database user credentials are correct
4. Verify network connectivity

**Problem:** `MongoServerError: bad auth`

**Solutions:**
1. Double-check username and password in connection string
2. Ensure special characters in password are URL-encoded
3. Verify the database user exists in MongoDB Atlas

### Performance Issues

**Problem:** Slow queries

**Solutions:**
1. Check that indexes are created (logged on startup)
2. Monitor your MongoDB Atlas metrics dashboard
3. Consider upgrading from M0 free tier if needed

### Data Not Appearing

**Problem:** MongoDB is empty after migration

**Solutions:**
1. Verify `.data/database.json` exists and contains data
2. Run migration again: `npm run migrate:mongo`
3. Check application logs for errors

---

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use strong passwords** - For MongoDB database users
3. **Restrict IP access** - Only allow necessary IPs in production
4. **Enable encryption** - MongoDB Atlas encrypts data at rest by default
5. **Regular backups** - Set up automated backups in MongoDB Atlas
6. **Rotate credentials** - Change database passwords periodically

---

## Development vs Production

### Development
- Use local JSON storage for offline development
- Or use a separate MongoDB development cluster
- `NODE_ENV=development`

### Production
- Always use MongoDB Atlas for production
- Use dedicated production cluster
- Enable IP whitelisting for your production servers
- Set up automated backups
- Monitor performance metrics
- `NODE_ENV=production`

---

## Cost Considerations

**MongoDB Atlas Free Tier (M0):**
- ✅ 512 MB storage
- ✅ Shared RAM
- ✅ Perfect for development and small apps
- ✅ No credit card required

**Paid Tiers:**
- M10+ clusters start at ~$0.08/hour
- Required for production apps with higher traffic
- Includes dedicated resources and better performance

---

## Support

For MongoDB-specific issues:
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Community Forums](https://www.mongodb.com/community/forums/)

For application issues:
- Check application logs
- Review this documentation
- Contact your development team

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Migrate data from JSON to MongoDB
npm run migrate:mongo

# Start development server
npm run dev

# Create admin user
npm run create-admin

# Build for production
npm run build

# Start production server
npm start
```

---

**Last Updated:** October 2026  
**Version:** 2.0.0
