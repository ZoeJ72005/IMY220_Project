// 2_Joubert 05084360
const { MongoClient, ObjectId } = require('mongodb');

let client;
let db;

const COLLECTION_MAP = {
    Users: 'users',
    Projects: 'projects',
    Messages: 'messages',
    ProjectTypes: 'projecttypes',
    DiscussionMessages: 'discussionmessages',
};

const collections = {};

const ensureCollectionsInitialised = () => {
    if (!db) {
        throw new Error('Database connection not initialised. Call connectDB() first.');
    }

    for (const [key, name] of Object.entries(COLLECTION_MAP)) {
        if (!collections[key]) {
            collections[key] = db.collection(name);
        }
    }

    return collections;
};

const connectDB = async () => {
    if (db) {
        return { db, collections: ensureCollectionsInitialised() };
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
        console.error('> MongoDB connection failed: MONGODB_URI environment variable is not set.');
        process.exit(1);
    }

    try {
        client = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });

        await client.connect();

        const dbName = process.env.MONGODB_DB_NAME;
        db = dbName ? client.db(dbName) : client.db();

        if (!db) {
            throw new Error('Unable to resolve database from connection string.');
        }

        console.log('> MongoDB connection established successfully');
        return { db, collections: ensureCollectionsInitialised() };
    } catch (error) {
        console.error('> MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const getCollections = () => ensureCollectionsInitialised();

const closeDB = async () => {
    if (client) {
        await client.close();
        client = null;
        db = null;
        Object.keys(collections).forEach((key) => {
            delete collections[key];
        });
    }
};

const isValidObjectId = (value) => {
    if (!value) {
        return false;
    }

    if (value instanceof ObjectId) {
        return true;
    }

    if (typeof value === 'string') {
        return ObjectId.isValid(value);
    }

    return false;
};

const toObjectId = (value) => {
    if (!value) {
        return null;
    }
    if (value instanceof ObjectId) {
        return value;
    }
    if (!ObjectId.isValid(value)) {
        return null;
    }
    return new ObjectId(value);
};

module.exports = {
    connectDB,
    getCollections,
    closeDB,
    ObjectId,
    isValidObjectId,
    toObjectId,
};
