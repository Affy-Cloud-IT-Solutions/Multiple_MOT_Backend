const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS cannot be set
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/multi-mot-database');

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📦 Database: ${conn.connection.name}`);
        console.log(`🔢 Port: ${conn.connection.port}`);
        
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;