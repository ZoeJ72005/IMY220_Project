const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const {
    connectDB,
    getCollections,
    ObjectId,
    toObjectId,
    isValidObjectId,
} = require('./database');

let Users;
let Projects;
let Messages;
let ProjectTypes;
let DiscussionMessages;

// require('dotenv').config(); // Removed to use Docker's --env-file

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve bundle.js from dist
app.use('/dist', express.static(path.join(__dirname, '../dist')));

const ensureDirSync = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const UPLOADS_ROOT = path.join(__dirname, '../uploads');
const PROJECT_UPLOADS_ROOT = path.join(UPLOADS_ROOT, 'projects');
ensureDirSync(PROJECT_UPLOADS_ROOT);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROJECT_FILE_MAX_BYTES = 25 * 1024 * 1024;

const resolveProjectIdForUpload = (req) => {
    if (req.projectUploadId) {
        return req.projectUploadId.toString();
    }
    if (req.params?.id && isValidObjectId(req.params.id)) {
        return req.params.id.toString();
    }
    throw new Error('Unable to resolve project identifier for upload');
};

const projectStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const projectId = resolveProjectIdForUpload(req);
            const subFolder = file.fieldname === 'projectImage' ? 'image' : 'files';
            const destination = path.join(PROJECT_UPLOADS_ROOT, projectId, subFolder);
            ensureDirSync(destination);
            cb(null, destination);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${baseName || 'file'}-${uniqueSuffix}${ext}`);
    },
});

const projectUpload = multer({
    storage: projectStorage,
    limits: { fileSize: PROJECT_FILE_MAX_BYTES },
});

const DEFAULT_PROJECT_TYPES = [
    'web-application',
    'desktop-application',
    'mobile-application',
    'framework',
    'library',
    'tool',
    'game',
    'service',
    'other',
];

async function ensureDefaultProjectTypes() {
    if (!ProjectTypes) {
        return;
    }

    const existing = await ProjectTypes.find({}).project({ name: 1 }).toArray();
    const lowerExisting = new Set(existing.map((type) => (type.name || '').toLowerCase()));
    const missing = DEFAULT_PROJECT_TYPES.filter((type) => !lowerExisting.has(type.toLowerCase()));

    if (missing.length === 0) {
        return;
    }

    await ProjectTypes.insertMany(
        missing.map((name) => ({
            name: name.toLowerCase(),
            createdAt: new Date(),
        }))
    );
}

const initialiseDatabase = async () => {
    try {
        const { collections } = await connectDB();
        Users = collections.Users;
        Projects = collections.Projects;
        Messages = collections.Messages;
        ProjectTypes = collections.ProjectTypes;
        DiscussionMessages = collections.DiscussionMessages;
        await ensureDefaultProjectTypes();
    } catch (error) {
        console.error('Failed to initialise database:', error);
        process.exit(1);
    }
};

initialiseDatabase();

const normalizeTags = (tagsInput) => {
    if (!tagsInput) {
        return [];
    }
    if (Array.isArray(tagsInput)) {
        return tagsInput
            .flatMap((tag) => String(tag).split(/[,#]/))
            .map((tag) => tag.trim().replace(/^#+/, ''))
            .filter(Boolean);
    }
    return String(tagsInput)
        .split(/[,#]/)
        .map((tag) => tag.trim().replace(/^#+/, ''))
        .filter(Boolean);
};

const getRelativePath = (absolutePath) => {
    const relative = path.relative(UPLOADS_ROOT, absolutePath);
    return relative.replace(/\\/g, '/');
};

const buildPublicUrl = (relativePath) => {
    if (!relativePath) {
        return '';
    }
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
};

const removeFileIfExists = (relativePath) => {
    if (!relativePath) {
        return;
    }
    const absolutePath = path.join(UPLOADS_ROOT, relativePath);
    if (fs.existsSync(absolutePath)) {
        try {
            fs.unlinkSync(absolutePath);
        } catch (error) {
            console.warn('Unable to remove file:', absolutePath, error.message);
        }
    }
};

const cleanupUploadedFiles = (fileGroups = {}) => {
    Object.values(fileGroups).forEach((files) => {
        (files || []).forEach((file) => {
            if (file?.path && fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (error) {
                    console.warn('Unable to remove uploaded file:', file.path, error.message);
                }
            }
        });
    });
};

const createFileRecord = (file, projectId, userId) => ({
    _id: new ObjectId(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: userId,
    relativePath: getRelativePath(file.path),
});

const mapUserPreview = (user) => {
    if (!user) {
        return { id: null, username: 'unknown', profileImage: '' };
    }

    if (typeof user === 'string') {
        return { id: user, username: user, profileImage: '' };
    }

    if (user instanceof ObjectId) {
        const id = user.toString();
        return { id, username: id, profileImage: '' };
    }

    const id = user._id?.toString() || user.id?.toString() || null;
    return {
        id,
        username: user.username || 'unknown',
        profileImage: user.profileImage || '',
    };
};

const ADMIN_USER_SUMMARY_FIELDS = {
    username: 1,
    email: 1,
    role: 1,
    friends: 1,
    projects: 1,
};

const mapAdminUserSummary = (userDoc) => ({
    id: userDoc._id.toString(),
    username: userDoc.username,
    email: userDoc.email,
    role: userDoc.role || 'user',
    friends: Array.isArray(userDoc.friends) ? userDoc.friends.length : 0,
    projects: Array.isArray(userDoc.projects) ? userDoc.projects.length : 0,
});

const buildProjection = (select) => {
    if (!select) {
        return undefined;
    }

    if (typeof select === 'string') {
        const fields = select
            .split(/\s+/)
            .map((field) => field.trim())
            .filter(Boolean);

        if (fields.length === 0) {
            return undefined;
        }

        return fields.reduce((projection, field) => {
            projection[field] = 1;
            return projection;
        }, {});
    }

    if (Array.isArray(select)) {
        return select.reduce((projection, field) => {
            if (field) {
                projection[field] = 1;
            }
            return projection;
        }, {});
    }

    if (typeof select === 'object') {
        return select;
    }

    return undefined;
};

const normalizeObjectIdArray = (values = []) =>
    values
        .map((value) => {
            if (value instanceof ObjectId) {
                return value;
            }
            return toObjectId(value);
        })
        .filter((value) => value);

const docsToMapById = (docs = []) => {
    const map = new Map();
    docs.forEach((doc) => {
        if (doc?._id) {
            map.set(doc._id.toString(), doc);
        }
    });
    return map;
};

const buildPreviewList = (ids = [], docMap = new Map()) =>
    ids.map((id) => {
        const key = id instanceof ObjectId ? id.toString() : String(id);
        return mapUserPreview(docMap.get(key) || { _id: key });
    });

const fetchUsersByIds = async (ids, select = 'username profileImage') => {
    if (!Users) return [];
    const objectIds = normalizeObjectIdArray(ids);
    if (!objectIds.length) return [];
    const projection = buildProjection(select);
    const cursor = Users.find({ _id: { $in: objectIds } }, projection ? { projection } : {});
    return cursor.toArray();
};

const findUserById = async (id, select) => {
    if (!Users) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const projection = buildProjection(select);
    return Users.findOne({ _id: objectId }, projection ? { projection } : {});
};

const updateUserById = async (id, update, options = {}) => {
    if (!Users) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const returnDocument = options.new ? 'after' : 'before';
    const result = await Users.findOneAndUpdate(
        { _id: objectId },
        update,
        { returnDocument, upsert: !!options.upsert }
    );
    return result.value;
};

const deleteUserById = async (id) => {
    if (!Users) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const result = await Users.findOneAndDelete({ _id: objectId });
    return result.value;
};

const findProjectById = async (id) => {
    if (!Projects) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    return Projects.findOne({ _id: objectId });
};

const updateProjectById = async (id, update, options = {}) => {
    if (!Projects) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const returnDocument = options.new ? 'after' : 'before';
    const result = await Projects.findOneAndUpdate(
        { _id: objectId },
        update,
        { returnDocument, upsert: !!options.upsert }
    );
    return result.value;
};

const deleteProjectById = async (id) => {
    if (!Projects) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const result = await Projects.findOneAndDelete({ _id: objectId });
    return result.value;
};

const findMessageById = async (id) => {
    if (!Messages) return null;
    const objectId = toObjectId(id);
    if (!objectId) return null;
    return Messages.findOne({ _id: objectId });
};


const formatActivity = (activity = []) => {
    return activity
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }

            const time = entry.time ? new Date(entry.time) : null;
            return {
                id: entry._id?.toString() || entry.id?.toString() || null,
                user: mapUserPreview(entry.userId),
                action: entry.action,
                message: entry.message,
                time: time ? time.toLocaleString() : '',
            };
        })
        .filter(Boolean);
};

const buildFilePayload = (projectId, fileDoc) => ({
    id: fileDoc._id.toString(),
    name: fileDoc.originalName,
    size: fileDoc.size,
    mimeType: fileDoc.mimeType,
    uploadedAt: fileDoc.uploadedAt ? new Date(fileDoc.uploadedAt).toISOString() : null,
    uploadedBy: mapUserPreview(fileDoc.uploadedBy),
    downloadUrl: `/api/projects/${projectId}/files/${fileDoc._id.toString()}/download`,
});

const buildAuthUserPayload = async (userId) => {
    if (!Users) {
        return null;
    }

    const userObjectId = toObjectId(userId);
    if (!userObjectId) {
        return null;
    }

    const userDoc = await Users.findOne({ _id: userObjectId });

    if (!userDoc) {
        return null;
    }

    const friendIds = normalizeObjectIdArray(userDoc.friends);
    const pendingIds = normalizeObjectIdArray(userDoc.pendingFriendRequests);
    const outgoingIds = normalizeObjectIdArray(userDoc.outgoingFriendRequests);

    const [friendDocs, pendingDocs, outgoingDocs] = await Promise.all([
        fetchUsersByIds(friendIds),
        fetchUsersByIds(pendingIds),
        fetchUsersByIds(outgoingIds),
    ]);

    const friendMap = docsToMapById(friendDocs);
    const pendingMap = docsToMapById(pendingDocs);
    const outgoingMap = docsToMapById(outgoingDocs);

    return {
        id: userDoc._id.toString(),
        username: userDoc.username,
        email: userDoc.email,
        fullName: userDoc.fullName || '',
        profileImage: userDoc.profileImage || '',
        bio: userDoc.bio || '',
        location: userDoc.location || '',
        company: userDoc.company || '',
        website: userDoc.website || '',
        languages: userDoc.languages || [],
        joinDate: userDoc.joinDate ? new Date(userDoc.joinDate).toISOString() : null,
        role: userDoc.role || 'user',
        friends: buildPreviewList(friendIds, friendMap),
        pendingFriendRequests: buildPreviewList(pendingIds, pendingMap),
        outgoingFriendRequests: buildPreviewList(outgoingIds, outgoingMap),
    };
};

const buildProfilePayload = async (userId) => {
    if (!Projects) {
        return null;
    }

    const basePayload = await buildAuthUserPayload(userId);
    if (!basePayload) {
        return null;
    }

    const userObjectId = toObjectId(userId);
    const projects = await Projects.find({
        $or: [{ ownerId: userObjectId }, { members: userObjectId }],
    }).toArray();

    const projectSummaries = projects.map((projects) => {
        const projectOwnerId = projects.ownerId ? projects.ownerId.toString() : null;
        const isOwner = projectOwnerId === (userObjectId ? userObjectId.toString() : null);

        return {
            id: projects._id.toString(),
            name: projects.name,
            description: projects.description,
            role: isOwner ? 'owner' : 'member',
            lastActivity: projects.lastActivity ? new Date(projects.lastActivity).toLocaleDateString() : '',
            imageUrl: buildPublicUrl(projects.image),
        };
    });

    return {
        ...basePayload,
        projects: projectSummaries,
    };
};

const populateProjectDetail = async (projectId) => {
    if (!Projects) {
        return null;
    }

    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
        return null;
    }

    const projects = await Projects.findOne({ _id: projectObjectId });
    if (!projects) {
        return null;
    }

    const ownerId = projects.ownerId ? toObjectId(projects.ownerId) : null;
    const checkedOutId = projects.checkedOutBy ? toObjectId(projects.checkedOutBy) : null;
    const memberIds = normalizeObjectIdArray(projects.members);
    const fileUploaderIds = normalizeObjectIdArray(
        (projects.files || []).map((file) => file.uploadedBy)
    );
    const activityIds = normalizeObjectIdArray(projects.activity);

    const [ownerDocs, checkedOutDocs, memberDocs, fileUploaderDocs, activityDocs] = await Promise.all([
        ownerId ? fetchUsersByIds([ownerId]) : Promise.resolve([]),
        checkedOutId ? fetchUsersByIds([checkedOutId]) : Promise.resolve([]),
        memberIds.length ? fetchUsersByIds(memberIds) : Promise.resolve([]),
        fileUploaderIds.length ? fetchUsersByIds(fileUploaderIds) : Promise.resolve([]),
        activityIds.length
            ? Messages.find({ _id: { $in: activityIds } }).sort({ time: -1 }).toArray()
            : Promise.resolve([]),
    ]);

    const ownerDoc = ownerDocs[0] || (ownerId ? { _id: ownerId } : null);
    const checkedOutDoc = checkedOutDocs[0] || (checkedOutId ? { _id: checkedOutId } : null);
    const memberMap = docsToMapById(memberDocs);
    const fileUploaderMap = docsToMapById(fileUploaderDocs);

    const activityUserIds = normalizeObjectIdArray(activityDocs.map((activity) => activity.userId));
    const activityUserDocs = await fetchUsersByIds(activityUserIds);
    const activityUserMap = docsToMapById(activityUserDocs);

    const enrichedFiles = (projects.files || []).map((file) => {
        const uploaderId = file.uploadedBy ? toObjectId(file.uploadedBy) : null;
        const uploaderDoc = uploaderId ? fileUploaderMap.get(uploaderId.toString()) : null;
        return {
            ...file,
            uploadedBy: uploaderDoc || (uploaderId ? { _id: uploaderId } : null),
        };
    });

    const enrichedActivity = activityDocs.map((entry) => {
        const userId = entry.userId ? entry.userId.toString() : null;
        return {
            ...entry,
            userId: userId ? activityUserMap.get(userId) || { _id: entry.userId } : null,
        };
    });

    return {
        ...projects,
        ownerId: ownerDoc,
        checkedOutBy: checkedOutDoc,
        members: memberIds.map((id) => memberMap.get(id.toString()) || { _id: id }),
        files: enrichedFiles,
        activity: enrichedActivity,
    };
};

const getProjectTypes = async () => {
    if (!ProjectTypes) {
        return [];
    }
    const types = await ProjectTypes.find({}).sort({ name: 1 }).toArray();
    return types.map((type) => type.name);
};

const requireAdmin = async (userId) => {
    if (!Users) {
        const error = new Error('Database not initialised');
        error.statusCode = 500;
        throw error;
    }

    const userObjectId = toObjectId(userId);
    if (!userObjectId) {
        const error = new Error('Admin privileges required');
        error.statusCode = 403;
        throw error;
    }

    const users = await Users.findOne({ _id: userObjectId }, { projection: { role: 1 } });
    if (!users || users.role !== 'admin') {
        const error = new Error('Admin privileges required');
        error.statusCode = 403;
        throw error;
    }
    return users;
};


const formatProjectDetail = (projects) => ({
    id: projects._id.toString(),
    name: projects.name,
    description: projects.description,
    type: projects.type,
    version: projects.version,
    tags: projects.tags,
    owner: mapUserPreview(projects.ownerId),
    createdDate: projects.createdDate ? new Date(projects.createdDate).toISOString() : null,
    lastActivity: projects.lastActivity ? new Date(projects.lastActivity).toISOString() : null,
    downloads: projects.downloads || 0,
    checkoutStatus: projects.checkoutStatus,
    checkedOutBy: projects.checkedOutBy ? mapUserPreview(projects.checkedOutBy) : null,
    members: (projects.members || []).map(mapUserPreview),
    imageUrl: buildPublicUrl(projects.image),
    files: (projects.files || []).map((fileDoc) => buildFilePayload(projects._id, fileDoc)),
    activity: formatActivity(projects.activity),
});

const formatDiscussionMessage = (message) => ({
    id: message._id.toString(),
    user: mapUserPreview(message.userId),
    message: message.message,
    createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : null,
});

const getDiscussionMessages = async (projectId) => {
    if (!DiscussionMessages) {
        return [];
    }

    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
        return [];
    }

    const discussion = await DiscussionMessages.find({ projectId: projectObjectId })
        .sort({ createdAt: -1 })
        .toArray();

    const userIds = normalizeObjectIdArray(discussion.map((message) => message.userId));
    const userDocs = await fetchUsersByIds(userIds);
    const userMap = docsToMapById(userDocs);

    return discussion
        .map((message) =>
            formatDiscussionMessage({
                ...message,
                userId: message.userId
                    ? userMap.get(message.userId.toString()) || { _id: message.userId }
                    : null,
            })
        );
};

// ==============================
// AUTHENTICATION & PROFILE ROUTES
// ==============================

// Authentication endpoints (SIGNIN/SIGNUP/LOGOUT remain the same)
app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const normalisedEmail = email.trim().toLowerCase();
        const users = await Users.findOne({ email: normalisedEmail });

        if (!users || users.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const payload = await buildAuthUserPayload(users._id);
        if (!payload) {
            return res.status(500).json({ success: false, message: 'Unable to build user payload' });
        }

        res.json({
            success: true,
            user: payload,
            token: 'dummy_jwt_token_' + payload.id,
            message: 'Authentication successful',
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }

    try {
        const trimmedUsername = username.trim();
        const normalisedEmail = email.trim().toLowerCase();

        const existingUser = await Users.findOne({
            $or: [{ email: normalisedEmail }, { username: trimmedUsername }],
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const now = new Date();
        const insertResult = await Users.insertOne({
            username: trimmedUsername,
            email: normalisedEmail,
            password,
            fullName: '',
            profileImage: '',
            bio: '',
            location: '',
            company: '',
            website: '',
            languages: [],
            joinDate: now,
            role: 'user',
            friends: [],
            projects: [],
            pendingFriendRequests: [],
            outgoingFriendRequests: [],
        });

        const payload = await buildAuthUserPayload(insertResult.insertedId);
        res.json({
            success: true,
            user: payload,
            token: 'dummy_jwt_token_' + payload.id,
            message: 'User created successfully',
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logout successful' });
});

// GET Profile (View Own/Other users)
app.get('/api/users/:id', async (req, res) => {
    const userId = toObjectId(req.params.id);
    if (!userId) {
        return res.status(400).json({ success: false, message: 'Invalid user identifier' });
    }

    try {
        const profile = await buildProfilePayload(userId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT Profile (Edit Own Profile)
app.put('/api/users/:id', async (req, res) => {
    const userId = toObjectId(req.params.id);
    if (!userId) {
        return res.status(400).json({ success: false, message: 'Invalid user identifier' });
    }

    const allowedFields = ['fullName', 'bio', 'location', 'company', 'website', 'profileImage', 'languages'];
    const updateData = {};

    allowedFields.forEach((field) => {
        if (field in req.body) {
            updateData[field] = req.body[field];
        }
    });

    try {
        const updatedUser = await updateUserById(userId, { $set: updateData }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const profile = await buildProfilePayload(userId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST Add Friend
app.post('/api/users/:id/friend-requests', async (req, res) => {
    const targetUserId = toObjectId(req.params.id);
    const requesterId = toObjectId(req.body.currentUserId);

    if (!targetUserId || !requesterId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for friend request' });
    }

    if (targetUserId.toString() === requesterId.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
    }

    try {
        const [targetUser, requesterUser] = await Promise.all([
            findUserById(targetUserId),
            findUserById(requesterId),
        ]);

        if (!targetUser || !requesterUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const alreadyFriends = (requesterUser.friends || []).some(
            (id) => id.toString() === targetUserId.toString()
        );
        if (alreadyFriends) {
            return res.status(400).json({ success: false, message: 'You are already connected with this user' });
        }

        const alreadyPending = (targetUser.pendingFriendRequests || []).some(
            (id) => id.toString() === requesterId.toString()
        );
        if (alreadyPending) {
            return res.status(400).json({ success: false, message: 'Friend request already pending' });
        }

        const alreadyOutgoing = (requesterUser.outgoingFriendRequests || []).some(
            (id) => id.toString() === targetUserId.toString()
        );
        if (alreadyOutgoing) {
            return res.status(400).json({ success: false, message: 'You have already sent a friend request' });
        }

        await Promise.all([
            updateUserById(targetUserId, { $addToSet: { pendingFriendRequests: requesterId } }),
            updateUserById(requesterId, { $addToSet: { outgoingFriendRequests: targetUserId } }),
        ]);

        const [updatedRequester, updatedProfile] = await Promise.all([
            buildAuthUserPayload(requesterId),
            buildProfilePayload(targetUserId),
        ]);

        res.json({
            success: true,
            message: 'Friend request sent',
            user: updatedRequester,
            profile: updatedProfile,
        });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ success: false, message: 'Server error sending friend request' });
    }
});

app.post('/api/users/:id/friend-requests/:requesterId/accept', async (req, res) => {
    const currentUserId = toObjectId(req.params.id);
    const requesterId = toObjectId(req.params.requesterId);

    if (!currentUserId || !requesterId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for accepting friend request' });
    }

    try {
        const currentUser = await findUserById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'Current user not found' });
        }

        const hasRequest = (currentUser.pendingFriendRequests || []).some(
            (id) => id.toString() === requesterId.toString()
        );
        if (!hasRequest) {
            return res.status(400).json({ success: false, message: 'No pending friend request to accept' });
        }

        await Promise.all([
            updateUserById(currentUserId, {
                $pull: { pendingFriendRequests: requesterId },
                $addToSet: { friends: requesterId },
            }),
            updateUserById(requesterId, {
                $pull: { outgoingFriendRequests: currentUserId },
                $addToSet: { friends: currentUserId },
            }),
        ]);

        const [updatedUser, updatedProfile] = await Promise.all([
            buildAuthUserPayload(currentUserId),
            buildProfilePayload(requesterId),
        ]);

        res.json({
            success: true,
            message: 'Friend request accepted',
            user: updatedUser,
            profile: updatedProfile,
        });
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ success: false, message: 'Server error accepting friend request' });
    }
});

app.post('/api/users/:id/friend-requests/:requesterId/decline', async (req, res) => {
    const currentUserId = toObjectId(req.params.id);
    const requesterId = toObjectId(req.params.requesterId);

    if (!currentUserId || !requesterId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for declining friend request' });
    }

    try {
        await Promise.all([
            updateUserById(currentUserId, { $pull: { pendingFriendRequests: requesterId } }),
            updateUserById(requesterId, { $pull: { outgoingFriendRequests: currentUserId } }),
        ]);

        const [updatedUser, updatedProfile] = await Promise.all([
            buildAuthUserPayload(currentUserId),
            buildProfilePayload(requesterId),
        ]);

        res.json({
            success: true,
            message: 'Friend request declined',
            user: updatedUser,
            profile: updatedProfile,
        });
    } catch (error) {
        console.error('Decline friend request error:', error);
        res.status(500).json({ success: false, message: 'Server error declining friend request' });
    }
});

app.delete('/api/users/:id/friends', async (req, res) => {
    const { currentUserId } = req.body;
    const profileObjectId = toObjectId(req.params.id);
    const currentUserObjectId = toObjectId(currentUserId);

    if (!profileObjectId || !currentUserObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid user identifiers for friendship removal' });
    }

    try {
        await Promise.all([
            updateUserById(currentUserObjectId, {
                $pull: {
                    friends: profileObjectId,
                    outgoingFriendRequests: profileObjectId,
                    pendingFriendRequests: profileObjectId,
                },
            }),
            updateUserById(profileObjectId, {
                $pull: {
                    friends: currentUserObjectId,
                    outgoingFriendRequests: currentUserObjectId,
                    pendingFriendRequests: currentUserObjectId,
                },
            }),
        ]);

        const [updatedUser, updatedProfile] = await Promise.all([
            buildAuthUserPayload(currentUserObjectId),
            buildProfilePayload(profileObjectId),
        ]);

        res.json({
            success: true,
            message: 'Friend removed successfully',
            user: updatedUser,
            profile: updatedProfile,
        });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ success: false, message: 'Server error removing friend' });
    }
});

// DELETE Profile (Delete your profile) -- Placeholder Logic
app.delete('/api/users/:id', async (req, res) => {
    // NOTE: Full user deletion logic (cascading deletes for projects, messages, etc.) is complex.
    // For D2, we provide a success response acknowledging the route exists.
    try {
        const result = await deleteUserById(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'Profile deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during deletion' });
    }
});

// ==============================
// PROJECT ROUTES
// ==============================

app.get('/api/project-types', async (req, res) => {
    try {
        const types = await getProjectTypes();
        res.json({ success: true, types });
    } catch (error) {
        console.error('Fetch project types error:', error);
        res.status(500).json({ success: false, message: 'Server error loading project types' });
    }
});

app.post('/api/admin/project-types', async (req, res) => {
    const { adminId, name } = req.body;
    if (!adminId || !name) {
        return res.status(400).json({ success: false, message: 'Admin identifier and type name are required' });
    }
    try {
        await requireAdmin(adminId);
        const normalisedName = name.trim().toLowerCase();
        if (!normalisedName) {
            return res.status(400).json({ success: false, message: 'Type name cannot be empty' });
        }
        const existing = await ProjectTypes.findOne({ name: normalisedName });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Project type already exists' });
        }
        await ProjectTypes.insertOne({ name: normalisedName, createdAt: new Date() });
        const types = await getProjectTypes();
        res.status(201).json({ success: true, types });
    } catch (error) {
        console.error('Create project type error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error creating project type' });
    }
});


app.delete('/api/admin/project-types/:name', async (req, res) => {
    const { adminId } = req.body;
    const name = req.params.name;
    if (!adminId || !name) {
        return res.status(400).json({ success: false, message: 'Admin identifier and type name are required' });
    }
    try {
        await requireAdmin(adminId);
        const normalisedName = decodeURIComponent(name).toLowerCase();
        await ProjectTypes.findOneAndDelete({ name: normalisedName });
        const types = await getProjectTypes();
        res.json({ success: true, types });
    } catch (error) {
        console.error('Delete project type error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error deleting project type' });
    }
});


app.get('/api/admin/dashboard', async (req, res) => {
    const { adminId } = req.query;
    if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin identifier is required' });
    }

    try {
        await requireAdmin(adminId);
        const [userCount, projectCount, checkinCount, discussionCount] = await Promise.all([
            Users.countDocuments({}),
            Projects.countDocuments({}),
            Messages.countDocuments({ action: 'checked-in' }),
            DiscussionMessages.countDocuments({}),
        ]);

        res.json({
            success: true,
            stats: {
                users: userCount,
                projects: projectCount,
                checkins: checkinCount,
                discussions: discussionCount,
            },
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error loading dashboard' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    const { adminId } = req.query;
    if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin identifier is required' });
    }

    try {
        await requireAdmin(adminId);
        const users = await Users.find({}, { projection: ADMIN_USER_SUMMARY_FIELDS }).toArray();

        const payload = users.map(mapAdminUserSummary);

        res.json({ success: true, users: payload });
    } catch (error) {
        console.error('Admin users error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error loading users' });
    }
});

app.patch('/api/admin/users/:id/role', async (req, res) => {
    const targetUserId = toObjectId(req.params.id);
    const adminId = toObjectId(req.body?.adminId);
    const requestedRole = typeof req.body?.role === 'string' ? req.body.role.trim().toLowerCase() : null;

    if (!targetUserId || !adminId || !requestedRole) {
        return res.status(400).json({ success: false, message: 'Admin identifier, target user, and role are required' });
    }

    if (!['admin', 'user'].includes(requestedRole)) {
        return res.status(400).json({ success: false, message: 'Role must be either "admin" or "user"' });
    }

    try {
        await requireAdmin(adminId);

        const targetUser = await Users.findOne({ _id: targetUserId }, { projection: { role: 1 } });
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Target user not found' });
        }

        if ((targetUser.role || 'user') === requestedRole) {
            const unchanged = await Users.findOne(
                { _id: targetUserId },
                { projection: ADMIN_USER_SUMMARY_FIELDS }
            );
            return res.json({ success: true, user: mapAdminUserSummary(unchanged) });
        }

        if (targetUser.role === 'admin' && requestedRole !== 'admin') {
            const adminCount = await Users.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one administrator must remain in the system',
                });
            }
        }

        const updatedUser = await Users.findOneAndUpdate(
            { _id: targetUserId },
            { $set: { role: requestedRole } },
            {
                returnDocument: 'after',
                projection: ADMIN_USER_SUMMARY_FIELDS,
            }
        );

        if (!updatedUser.value) {
            return res.status(404).json({ success: false, message: 'Target user not found' });
        }

        res.json({ success: true, user: mapAdminUserSummary(updatedUser.value) });
    } catch (error) {
        console.error('Admin update user role error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error updating user role' });
    }
});

app.get('/api/admin/projects', async (req, res) => {
    const { adminId } = req.query;
    if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin identifier is required' });
    }

    try {
        await requireAdmin(adminId);
        const projects = await Projects.find({}).toArray();

        const ownerIds = normalizeObjectIdArray(projects.map((projects) => projects.ownerId));
        const ownerDocs = await fetchUsersByIds(ownerIds, 'username');
        const ownerMap = docsToMapById(ownerDocs);

        const payload = projects.map((projects) => ({
            id: projects._id.toString(),
            name: projects.name,
            owner: projects.ownerId ? (ownerMap.get(projects.ownerId.toString())?.username || 'unknown') : 'unknown',
            type: projects.type,
            members: projects.members?.length || 0,
            downloads: projects.downloads || 0,
            lastActivity: projects.lastActivity ? new Date(projects.lastActivity).toISOString() : null,
        }));

        res.json({ success: true, projects: payload });
    } catch (error) {
        console.error('Admin projects error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error loading projects' });
    }
});

const assignProjectId = (req, res, next) => {
    req.projectUploadId = new ObjectId();
    next();
};

const sanitizeProjectName = (value) => (value || '').trim();
const sanitizeProjectDescription = (value) => (value || '').trim();

// GET Projects Feed (Local/Global)
app.get('/api/projects/feed', async (req, res) => {
    const { feedType = 'global', sortBy = 'date', userId } = req.query;
    try {
        const sortQuery = sortBy === 'popularity'
            ? { downloads: -1, lastActivity: -1 }
            : { lastActivity: -1 };

        let matchQuery = {};

        if (feedType === 'local') {
            const viewerId = toObjectId(userId);
            if (!viewerId) {
                return res.status(400).json({ success: false, message: 'Invalid user identifier for feed' });
            }
            const viewer = await findUserById(viewerId);
            if (!viewer) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const friendIds = normalizeObjectIdArray(viewer.friends);
            const ownersToInclude = [viewerId, ...friendIds];
            matchQuery = {
                $or: [
                    { ownerId: { $in: ownersToInclude } },
                    { members: viewerId },
                ],
            };
        }

        const projects = await Projects.find(matchQuery).sort(sortQuery).toArray();

        // hydrate owner/checkedOutBy + last 3 activity messages
        const ownerIds = normalizeObjectIdArray(projects.map(p => p.ownerId));
        const checkoutIds = normalizeObjectIdArray(projects.map(p => p.checkedOutBy).filter(Boolean));
        const activityIds = normalizeObjectIdArray(
            projects.flatMap(p => (p.activity || []).slice(-3)) // last 3
        );

        const [ownerDocs, checkoutDocs, activityDocs] = await Promise.all([
            fetchUsersByIds(ownerIds, 'username profileImage'),
            fetchUsersByIds(checkoutIds, 'username profileImage'),
            activityIds.length
                ? Messages.find({ _id: { $in: activityIds } }).toArray()
                : Promise.resolve([]),
        ]);

        const ownerMap = docsToMapById(ownerDocs);
        const checkoutMap = docsToMapById(checkoutDocs);
        const activityMap = docsToMapById(activityDocs);

        const formattedProjects = projects.map((project) => {
            const actIds = (project.activity || []).slice(-3);
            const actDocs = actIds.map(id => activityMap.get(id.toString())).filter(Boolean);

            return {
                id: project._id.toString(),
                name: project.name,
                description: project.description,
                type: project.type,
                version: project.version,
                tags: project.tags,
                owner: mapUserPreview(ownerMap.get(project.ownerId?.toString()) || project.ownerId),
                imageUrl: buildPublicUrl(project.image),
                checkoutStatus: project.checkoutStatus,
                checkedOutBy: project.checkedOutBy
                    ? mapUserPreview(checkoutMap.get(project.checkedOutBy.toString()) || project.checkedOutBy)
                    : null,
                members: Array.isArray(project.members) ? project.members.length : 0,
                downloads: project.downloads || 0,
                lastActivity: project.lastActivity ? new Date(project.lastActivity).toLocaleDateString() : '',
                activity: formatActivity(actDocs),
            };
        });

        res.json({ success: true, projects: formattedProjects });
    } catch (error) {
        console.error('Projects feed error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// GET Project by ID (View Project)
app.get('/api/projects/:id', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Invalid project identifier' });
    }

    try {
        const projects = await populateProjectDetail(projectId);

        if (!projects) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, project: formatProjectDetail(projects) });
    } catch (error) {
        console.error('Project fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST Project (Create Project)
app.post(
    '/api/projects',
    assignProjectId,
    projectUpload.fields([
        { name: 'projectImage', maxCount: 1 },
        { name: 'projectFiles', maxCount: 50 },
    ]),
    async (req, res) => {
        const ownerObjectId = toObjectId(req.body.ownerId);
        const name = sanitizeProjectName(req.body.name);
        const description = sanitizeProjectDescription(req.body.description);
        const type = (req.body.type || '').toLowerCase();
        const version = (req.body.version || '').trim();
        const tags = normalizeTags(req.body.tags);

        const uploadedGroups = {
            projectImage: req.files?.projectImage || [],
            projectFiles: req.files?.projectFiles || [],
        };

        if (!ownerObjectId) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'A valid owner identifier is required' });
        }

        if (!name) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'Project name is required' });
        }

        if (!description) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'Project description is required' });
        }

        if (!version) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'Project version is required' });
        }

 // inside the existing route you already have:
try {
    const availableTypes = await getProjectTypes();
    if (!availableTypes.includes(type)) {
        cleanupUploadedFiles(uploadedGroups);
        return res.status(400).json({ success: false, message: 'Project type is invalid' });
    }

    const owner = await findUserById(ownerObjectId);
    if (!owner) {
        cleanupUploadedFiles(uploadedGroups);
        return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const imageFile = uploadedGroups.projectImage[0];
    if (imageFile && imageFile.size > IMAGE_MAX_SIZE_BYTES) {
        cleanupUploadedFiles({ projectImage: [imageFile] });
        return res.status(400).json({
            success: false,
            message: 'Project image must be smaller than 5MB. Please upload a smaller image.',
        });
    }

    const fileRecords = uploadedGroups.projectFiles.map((file) =>
        createFileRecord(file, req.projectUploadId, ownerObjectId)
    );

    const projectDoc = {
        _id: req.projectUploadId,
        name,
        description,
        ownerId: ownerObjectId,
        tags,
        type,
        version,
        createdDate: Date.now(),
        lastActivity: Date.now(),
        members: [ownerObjectId],
        image: imageFile ? getRelativePath(imageFile.path) : '',
        files: fileRecords,
        downloads: 0,
        checkoutStatus: 'checked-in',
        checkedOutBy: null,
        activity: [],
    };

    await Projects.insertOne(projectDoc);
    await Users.updateOne({ _id: ownerObjectId }, { $addToSet: { projects: projectDoc._id } });

    const creationMsg = {
        projectId: projectDoc._id,
        userId: ownerObjectId,
        action: 'created',
        message: fileRecords.length ? 'Project created with initial files' : 'Project created',
        time: new Date(),
    };
    const { insertedId: msgId } = await Messages.insertOne(creationMsg);
    await Projects.updateOne(
        { _id: projectDoc._id },
        { $push: { activity: msgId }, $set: { lastActivity: Date.now() } }
    );

    const populatedProject = await populateProjectDetail(projectDoc._id);
    res.status(201).json({
        success: true,
        project: formatProjectDetail(populatedProject),
        message: 'Project created successfully',
    });
} catch (error) {
    cleanupUploadedFiles(uploadedGroups);
    console.error('Project creation error:', error);
    res.status(500).json({ success: false, message: 'Server error creating project' });
}

    }
);

// PUT Project (Edit Project Details)
app.put('/api/projects/:id', projectUpload.single('projectImage'), async (req, res) => {
    const projectId = toObjectId(req.params.id);
    if (!projectId) return res.status(400).json({ success: false, message: 'Invalid project identifier' });

    try {
        const requesterId = toObjectId(req.body.requesterId);
        if (!requesterId) {
            if (req.file?.path) fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Requester identifier is required' });
        }

        const project = await Projects.findOne({ _id: projectId });
        if (!project) {
            if (req.file?.path) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.ownerId.toString() !== requesterId.toString()) {
            if (req.file?.path) fs.unlinkSync(req.file.path);
            return res.status(403).json({ success: false, message: 'Only the project owner can update details' });
        }

        const updateSet = { lastActivity: Date.now() };
        const maybeName = sanitizeProjectName(req.body.name);
        const maybeDescription = sanitizeProjectDescription(req.body.description);
        const maybeType = (req.body.type || '').toLowerCase();
        const maybeVersion = (req.body.version || '').trim();
        const maybeTags = normalizeTags(req.body.tags);

        if (maybeName) updateSet.name = maybeName;
        if (maybeDescription) updateSet.description = maybeDescription;
        if (maybeType) {
            const availableTypes = await getProjectTypes();
            if (!availableTypes.includes(maybeType)) {
                if (req.file?.path) fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'Project type is invalid' });
            }
            updateSet.type = maybeType;
        }
        if (maybeVersion) updateSet.version = maybeVersion;
        if (req.body.tags !== undefined) updateSet.tags = maybeTags;

        if (req.file) {
            if (req.file.size > IMAGE_MAX_SIZE_BYTES) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Project image must be smaller than 5MB. Please upload a smaller image.',
                });
            }
            if (project.image) removeFileIfExists(project.image);
            updateSet.image = getRelativePath(req.file.path);
        }

        await Projects.updateOne({ _id: projectId }, { $set: updateSet });

        const updatedProject = await populateProjectDetail(projectId);
        res.json({ success: true, project: formatProjectDetail(updatedProject) });
    } catch (error) {
        console.error('Project update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// DELETE Project (Delete Project)
app.delete('/api/projects/:id', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    if (!projectId) return res.status(400).json({ success: false, message: 'Invalid project identifier' });

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        await Promise.all([
            Messages.deleteMany({ projectId }),
            DiscussionMessages.deleteMany({ projectId }),
        ]);

        const memberIdSet = new Set((project.members || []).map(id => id.toString()));
        if (project.ownerId) memberIdSet.add(project.ownerId.toString());

        const memberIds = Array.from(memberIdSet).map(toObjectId).filter(Boolean);
        if (memberIds.length > 0) {
            await Users.updateMany(
                { _id: { $in: memberIds } },
                { $pull: { projects: projectId } }
            );
        }

        await Projects.deleteOne({ _id: projectId });

        const projectDirectory = path.join(PROJECT_UPLOADS_ROOT, projectId.toString());
        if (fs.existsSync(projectDirectory)) {
            try {
                fs.rmSync(projectDirectory, { recursive: true, force: true });
            } catch (err) {
                console.warn('Unable to remove project directory:', projectDirectory, err.message);
            }
        }

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Project deletion error:', error);
        res.status(500).json({ success: false, message: 'Server error during deletion' });
    }
});


// ==============================
// PROJECT COLLABORATION ROUTES
// ==============================

// POST Check-out Project
app.post('/api/projects/:id/checkout', async (req, res) => {
    const { userId } = req.body;
    const projectId = toObjectId(req.params.id);
    const userObjectId = toObjectId(userId);
    if (!projectId || !userObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for checkout' });
    }
    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const isMember = (project.members || []).some(m => m.toString() === userObjectId.toString());
        if (!isMember) return res.status(403).json({ success: false, message: 'Only project members can check out the project' });

        if (project.checkoutStatus === 'checked-out' &&
            project.checkedOutBy &&
            project.checkedOutBy.toString() !== userObjectId.toString()
        ) {
            return res.status(400).json({ success: false, message: 'Project already checked out by another user' });
        }

        await Projects.updateOne(
            { _id: projectId },
            { $set: { checkoutStatus: 'checked-out', checkedOutBy: userObjectId, lastActivity: Date.now() } }
        );

        const msg = { projectId, userId: userObjectId, action: 'checked-out', message: 'Checked out project for changes', time: new Date() };
        const { insertedId } = await Messages.insertOne(msg);
        await Projects.updateOne({ _id: projectId }, { $push: { activity: insertedId } });

        const populatedProject = await populateProjectDetail(projectId);
        res.json({ success: true, project: formatProjectDetail(populatedProject), message: 'Project checked out successfully' });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, message: 'Server error during check-out' });
    }
});


// POST Check-in Project
app.post(
    '/api/projects/:id/checkin',
    projectUpload.fields([{ name: 'projectFiles', maxCount: 50 }]),
    async (req, res) => {
        const projectId = toObjectId(req.params.id);
        const userObjectId = toObjectId(req.body.userId);
        const message = (req.body.message || '').trim();
        const version = (req.body.version || '').trim();

        const uploadedGroups = {
            projectFiles: req.files?.projectFiles || [],
        };

        if (!projectId || !userObjectId) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'Invalid identifiers for check-in' });
        }

        if (!message) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'A check-in message describing your changes is required' });
        }

        if (!version) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'Please provide the updated project version for the check-in' });
        }

        // keep your route signature; replace body
try {
    const project = await Projects.findOne({ _id: projectId });
    if (!project) { cleanupUploadedFiles(uploadedGroups); return res.status(404).json({ success: false, message: 'Project not found' }); }
    if (project.checkoutStatus !== 'checked-out') { cleanupUploadedFiles(uploadedGroups); return res.status(400).json({ success: false, message: 'Project is not currently checked out' }); }
    if (!project.checkedOutBy || project.checkedOutBy.toString() !== userObjectId.toString()) {
        cleanupUploadedFiles(uploadedGroups); return res.status(403).json({ success: false, message: 'Only the member who checked out the project can check it back in' });
    }

    const newFileRecords = uploadedGroups.projectFiles.map((file) =>
        createFileRecord(file, projectId, userObjectId)
    );

    const { insertedId: actId } = await Messages.insertOne({
        projectId, userId: userObjectId, action: 'checked-in', message, time: new Date()
    });

    const updateOps = {
        $set: { checkoutStatus: 'checked-in', checkedOutBy: null, lastActivity: Date.now(), version },
        $push: { activity: actId }
    };
    if (newFileRecords.length) updateOps.$push.files = { $each: newFileRecords };

    await Projects.updateOne({ _id: projectId }, updateOps);

    const populatedProject = await populateProjectDetail(projectId);
    res.json({ success: true, project: formatProjectDetail(populatedProject), message: 'Project checked in successfully' });
} catch (error) {
    cleanupUploadedFiles(uploadedGroups);
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Server error during check-in' });
}

    }
);

app.post('/api/projects/:id/download', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const userObjectId = req.body.userId ? toObjectId(req.body.userId) : null;

    if (!projectId) return res.status(400).json({ success: false, message: 'Invalid project identifier for download' });

    try {
        const projectExists = await Projects.findOne({ _id: projectId });
        if (!projectExists) return res.status(404).json({ success: false, message: 'Project not found' });

        await Projects.updateOne({ _id: projectId }, { $inc: { downloads: 1 }, $set: { lastActivity: Date.now() } });

        if (userObjectId) {
            const { insertedId } = await Messages.insertOne({
                projectId, userId: userObjectId, action: 'downloaded', message: 'Downloaded project files', time: new Date()
            });
            await Projects.updateOne({ _id: projectId }, { $push: { activity: insertedId } });
        }

        const populatedProject = await populateProjectDetail(projectId);
        res.json({ success: true, project: formatProjectDetail(populatedProject), message: 'Download recorded successfully' });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ success: false, message: 'Server error during download' });
    }
});


app.post('/api/projects/:id/messages', async (req, res) => {
    const { userId, message } = req.body;
    const projectId = toObjectId(req.params.id);
    const userObjectId = toObjectId(userId);

    if (!projectId || !userObjectId) return res.status(400).json({ success: false, message: 'Invalid identifiers for message creation' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Message content is required' });

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const isMember = (project.members || []).some(m => m.toString() === userObjectId.toString());
        if (!isMember) return res.status(403).json({ success: false, message: 'Only project members can post messages' });

        const doc = { projectId, userId: userObjectId, action: 'commented', message: message.trim(), time: new Date() };
        const { insertedId } = await Messages.insertOne(doc);

        await Projects.updateOne({ _id: projectId }, { $push: { activity: insertedId }, $set: { lastActivity: Date.now() } });

        const user = await findUserById(userObjectId, 'username profileImage');
        res.status(201).json({
            success: true,
            activity: {
                id: insertedId.toString(),
                user: mapUserPreview(user || userObjectId),
                action: doc.action,
                message: doc.message,
                time: doc.time.toLocaleString(),
            },
        });
    } catch (error) {
        console.error('Message creation error:', error);
        res.status(500).json({ success: false, message: 'Server error while creating message' });
    }
});


app.post('/api/projects/:id/discussion', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const userObjectId = toObjectId(req.body.userId);
    const message = (req.body.message || '').trim();

    if (!projectId || !userObjectId) return res.status(400).json({ success: false, message: 'Invalid identifiers for discussion message' });
    if (!message) return res.status(400).json({ success: false, message: 'Message content is required' });

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const isMember = (project.members || []).some(m => m.toString() === userObjectId.toString());
        if (!isMember) return res.status(403).json({ success: false, message: 'Only project members can post to the discussion board' });

        const doc = { projectId, userId: userObjectId, message, createdAt: new Date() };
        const { insertedId } = await DiscussionMessages.insertOne(doc);

        const user = await findUserById(userObjectId, 'username profileImage');
        res.status(201).json({
            success: true,
            message: {
                id: insertedId.toString(),
                user: mapUserPreview(user || userObjectId),
                message,
                createdAt: doc.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Discussion post error:', error);
        res.status(500).json({ success: false, message: 'Server error posting to discussion' });
    }
});


app.post('/api/projects/:id/members', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const requesterId = toObjectId(req.body.requesterId);
    const friendId = toObjectId(req.body.friendId);

    if (!projectId || !requesterId || !friendId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for adding a member' });
    }

    try {
        const [project, requester, friend] = await Promise.all([
            Projects.findOne({ _id: projectId }),
            Users.findOne({ _id: requesterId }),
            Users.findOne({ _id: friendId }),
        ]);

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (!requester || !friend) return res.status(404).json({ success: false, message: 'User not found' });

        const isMember = (project.members || []).some((memberId) => memberId.toString() === requesterId.toString());
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Only project members can add additional members' });
        }

        const isFriend = (requester.friends || []).some((id) => id.toString() === friendId.toString());
        if (!isFriend) {
            return res.status(403).json({ success: false, message: 'You can only add users who are in your network' });
        }

        const alreadyMember = (project.members || []).some((memberId) => memberId.toString() === friendId.toString());
        if (alreadyMember) {
            return res.status(400).json({ success: false, message: 'User is already a project member' });
        }

        await Projects.updateOne(
            { _id: projectId },
            { $addToSet: { members: friendId }, $set: { lastActivity: Date.now() } }
        );
        await Users.updateOne({ _id: friendId }, { $addToSet: { projects: projectId } });

        const { insertedId: msgId } = await Messages.insertOne({
            projectId,
            userId: requesterId,
            action: 'member-added',
            message: `Added ${friend.username} to the project`,
            time: new Date(),
        });
        await Projects.updateOne({ _id: projectId }, { $push: { activity: msgId } });

        const populatedProject = await populateProjectDetail(projectId);
        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: `${friend.username} added to the project`,
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ success: false, message: 'Server error while adding member' });
    }
});

app.delete('/api/projects/:id/members/:memberId', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const memberId = toObjectId(req.params.memberId);
    const requesterId = toObjectId(req.body?.requesterId);

    if (!projectId || !memberId || !requesterId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for removing a member' });
    }

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (project.ownerId.toString() !== requesterId.toString()) {
            return res.status(403).json({ success: false, message: 'Only the project owner can remove members' });
        }
        if (project.ownerId.toString() === memberId.toString()) {
            return res.status(400).json({ success: false, message: 'The owner cannot be removed from the project' });
        }

        const isMember = (project.members || []).some((id) => id.toString() === memberId.toString());
        if (!isMember) {
            return res.status(404).json({ success: false, message: 'Member not found on this project' });
        }

        await Projects.updateOne(
            { _id: projectId },
            { $pull: { members: memberId }, $set: { lastActivity: Date.now() } }
        );
        await Users.updateOne({ _id: memberId }, { $pull: { projects: projectId } });

        const removedUser = await Users.findOne({ _id: memberId }, { projection: { username: 1 } });

        const { insertedId: msgId } = await Messages.insertOne({
            projectId,
            userId: requesterId,
            action: 'member-removed',
            message: removedUser ? `Removed ${removedUser.username} from the project` : 'Removed a project member',
            time: new Date(),
        });
        await Projects.updateOne({ _id: projectId }, { $push: { activity: msgId } });

        const populatedProject = await populateProjectDetail(projectId);
        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: 'Member removed successfully',
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: 'Server error while removing member' });
    }
});

app.post('/api/projects/:id/transfer-ownership', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const requesterId = toObjectId(req.body.requesterId);
    const newOwnerId = toObjectId(req.body.newOwnerId);

    if (!projectId || !requesterId || !newOwnerId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for transferring ownership' });
    }

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (project.ownerId.toString() !== requesterId.toString()) {
            return res.status(403).json({ success: false, message: 'Only the current owner can transfer ownership' });
        }

        const isMember = (project.members || []).some((id) => id.toString() === newOwnerId.toString());
        if (!isMember) {
            return res.status(400).json({ success: false, message: 'Ownership can only be transferred to an existing member' });
        }

        await Projects.updateOne(
            { _id: projectId },
            { $set: { ownerId: newOwnerId, lastActivity: Date.now() }, $addToSet: { members: newOwnerId } }
        );
        await Users.updateOne({ _id: newOwnerId }, { $addToSet: { projects: projectId } });

        const newOwner = await Users.findOne({ _id: newOwnerId }, { projection: { username: 1 } });
        const { insertedId: msgId } = await Messages.insertOne({
            projectId,
            userId: requesterId,
            action: 'ownership-transferred',
            message: newOwner ? `Transferred ownership to ${newOwner.username}` : 'Transferred project ownership',
            time: new Date(),
        });
        await Projects.updateOne({ _id: projectId }, { $push: { activity: msgId } });

        const populatedProject = await populateProjectDetail(projectId);
        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: 'Ownership transferred successfully',
        });
    } catch (error) {
        console.error('Transfer ownership error:', error);
        res.status(500).json({ success: false, message: 'Server error while transferring ownership' });
    }
});

app.get('/api/projects/:id/files/:fileId/download', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const fileId = toObjectId(req.params.fileId);

    if (!projectId || !fileId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for file download' });
    }

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const fileDoc = (project.files || []).find((file) => file._id.toString() === fileId.toString());
        if (!fileDoc) {
            return res.status(404).json({ success: false, message: 'File not found on this project' });
        }

        const absolutePath = path.join(UPLOADS_ROOT, fileDoc.relativePath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ success: false, message: 'File is no longer available on the server' });
        }

        res.download(absolutePath, fileDoc.originalName);
    } catch (error) {
        console.error('Project file download error:', error);
        res.status(500).json({ success: false, message: 'Server error while downloading file' });
    }
});

// ==============================
// SEARCH ROUTE
// ==============================

app.get('/api/search', async (req, res) => {
    const { term, type } = req.query;
    if (!term || !type) {
        return res.status(400).json({ success: false, message: 'Search term and type are required' });
    }

    const regex = new RegExp(term, 'i');

    try {
        if (type === 'projects') {
            const projects = await Projects.find({
                $or: [{ name: regex }, { tags: regex }, { type: regex }],
            }).toArray();

            const ownerIds = normalizeObjectIdArray(projects.map((project) => project.ownerId));
            const ownerDocs = await fetchUsersByIds(ownerIds, 'username');
            const ownerMap = docsToMapById(ownerDocs);

            const formatted = projects.map((project) => ({
                id: project._id.toString(),
                name: project.name,
                type: 'projects',
                description: project.description || '',
                imageUrl: buildPublicUrl(project.image),
                owner: ownerMap.get(project.ownerId?.toString())?.username || 'unknown',
            }));
            return res.json({ success: true, results: formatted });
        }

        if (type === 'users') {
            const users = await Users.find({
                $or: [{ username: regex }, { fullName: regex }, { email: regex }],
            }).toArray();

            const formatted = users.map((user) => ({
                id: user._id.toString(),
                name: user.username,
                type: 'users',
                description: user.bio || user.email || '',
            }));
            return res.json({ success: true, results: formatted });
        }

        if (type === 'tags') {
            const taggedProjects = await Projects.find({ tags: regex }).toArray();
            const formatted = taggedProjects.map((project) => ({
                id: project._id.toString(),
                name: project.name,
                type: 'projects',
                description: project.description || '',
                imageUrl: buildPublicUrl(project.image),
            }));
            return res.json({ success: true, results: formatted });
        }

        if (type === 'activity') {
            const activities = await Messages.find({ action: 'checked-in', message: regex }).toArray();
            const projectIds = normalizeObjectIdArray(activities.map((activity) => activity.projectId));
            const userIds = normalizeObjectIdArray(activities.map((activity) => activity.userId));

            const [projects, users] = await Promise.all([
                projectIds.length ? Projects.find({ _id: { $in: projectIds } }).toArray() : [],
                userIds.length ? fetchUsersByIds(userIds, 'username profileImage') : [],
            ]);

            const projectMap = docsToMapById(projects);
            const userMap = docsToMapById(users);

            const formatted = activities.map((activity) => {
                const project = projectMap.get(activity.projectId?.toString());
                return {
                    id: activity._id.toString(),
                    name: project?.name || 'Unknown project',
                    type: 'activity',
                    description: activity.message || '',
                    projectId: project?._id?.toString(),
                    projectImage: buildPublicUrl(project?.image || ''),
                    user: mapUserPreview(userMap.get(activity.userId?.toString()) || activity.userId),
                    time: activity.time ? new Date(activity.time).toLocaleString() : '',
                };
            });
            return res.json({ success: true, results: formatted });
        }

        return res.status(400).json({ success: false, message: 'Unsupported search type' });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Server error during search' });
    }
});

// Catch-all handler for React routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(PORT, () => {
    console.log(`> Terminal server running on port ${PORT}`);
    console.log(`> Access at: http://localhost:${PORT}`);
});
