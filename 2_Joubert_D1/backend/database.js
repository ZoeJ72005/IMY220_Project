const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('> MongoDB connection established successfully');
    } catch (error) {
        console.error('> MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String },
    profileImage: { type: String, default: '' },
    bio: { type: String },
    location: { type: String },
    company: { type: String },
    website: { type: String },
    languages: [{ type: String }],
    joinDate: { type: Date, default: Date.now },
    friends: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    projects: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
        default: []
    },
});

const projectFileSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    relativePath: { type: String, required: true },
});

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    type: { type: String, required: true },
    version: { type: String, required: true },
    createdDate: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    checkoutStatus: { type: String, enum: ['checked-in', 'checked-out'], default: 'checked-in' },
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    downloads: { type: Number, default: 0 },
    image: { type: String, default: '' },
    files: {
        type: [projectFileSchema],
        default: []
    },
    activity: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});

const messageSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    message: { type: String },
    time: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = { connectDB, User, Project, Message };
