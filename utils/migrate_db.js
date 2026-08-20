const { MongoClient } = require('mongodb');

async function migrate() {
    const uri = 'mongodb://localhost:27017';
    const sourceDbName = 'MOT_UK';
    const destDbName = 'multiple-mot-uk';

    console.log(`🚀 Starting Database Migration: [${sourceDbName}] ➡️ [${destDbName}]`);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('🔌 Connected to local MongoDB.');

        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        const dbExists = dbs.databases.some(db => db.name === sourceDbName);

        if (!dbExists) {
            console.error(`❌ Source database "${sourceDbName}" does not exist on this MongoDB server.`);
            process.exit(1);
        }

        const sourceDb = client.db(sourceDbName);
        const destDb = client.db(destDbName);

        // 1. Drop the destination database if it already exists to ensure a clean migration
        console.log(`🧹 Dropping destination database "${destDbName}" if it exists...`);
        await destDb.dropDatabase();
        console.log(`✅ Destination database dropped/cleaned.`);

        // 2. Get list of collections in the source database
        const collections = await sourceDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections in "${sourceDbName}".`);

        // 3. Migrate each collection
        for (const colInfo of collections) {
            const colName = colInfo.name;
            const sourceCol = sourceDb.collection(colName);
            const destCol = destDb.collection(colName);

            // Fetch all documents from the source collection
            const docs = await sourceCol.find({}).toArray();
            console.log(`📦 Collection [${colName}]: Found ${docs.length} documents.`);

            if (docs.length > 0) {
                // Insert documents into destination collection
                const insertResult = await destCol.insertMany(docs);
                console.log(`   ➡️ Copied ${insertResult.insertedCount} documents successfully.`);
            } else {
                // If collection is empty, just create it in the destination database
                await destDb.createCollection(colName);
                console.log(`   ➡️ Created empty collection.`);
            }
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log(`   Your database "${destDbName}" is ready and synced with "${sourceDbName}".`);

    } catch (error) {
        console.error('❌ Migration failed with error:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔌 Closed MongoDB connection.');
    }
}

migrate();
