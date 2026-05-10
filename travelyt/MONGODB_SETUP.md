# MongoDB Setup Guide

## Local Development with MongoDB

### Option 1: MongoDB Community Edition (Local Installation)

1. **Download & Install MongoDB**
   - Visit: https://www.mongodb.com/try/download/community
   - Choose your OS and follow the installation instructions

2. **Start MongoDB Service**
   - **Windows**: MongoDB should start automatically as a service
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

3. **Verify Connection**
   ```bash
   mongosh
   # Should connect to mongodb://localhost:27017/
   ```

4. **Create Database**
   ```bash
   use travelyt
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create Free Account**
   - Visit: https://www.mongodb.com/cloud/atlas
   - Sign up for a free account

2. **Create Cluster**
   - Click "Create" → Choose "Free" tier
   - Select your region
   - Wait for cluster to deploy

3. **Create Database User**
   - Go to "Database Access"
   - Add a new user with username and password
   - Note: Password must be URL-encoded if it contains special characters

4. **Get Connection String**
   - Click "Connect"
   - Choose "Drivers"
   - Copy the connection string
   - Replace `<password>` with your user password

5. **Update .env.local**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/travelyt?retryWrites=true&w=majority
   ```

## Database Collections

The application will automatically use these collections:

- **users**: User accounts
- **trips**: Travel trip records
- **tripMembers**: Join table for user-trip relationships
- **activities**: Activities within trips
- **expenses**: Trip expenses
- **packingItems**: Packing list items

## Testing the Connection

Once configured, start the development server:

```bash
npm install
npm run dev
```

Visit http://localhost:5173 and test the application. Errors will appear in the console if MongoDB connection fails.
