const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { connectDB, User, Project, Message } = require('./database');
const mongoose = require('mongoose');

// require('dotenv').config(); // Removed to use Docker's --env-file

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

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

const PROJECT_TYPES = [
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

const resolveProjectIdForUpload = (req) => {
    if (req.projectUploadId) {
        return req.projectUploadId.toString();
    }
    if (req.params?.id && mongoose.Types.ObjectId.isValid(req.params.id)) {
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
    _id: new mongoose.Types.ObjectId(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: userId,
    relativePath: getRelativePath(file.path),
});

// Helper to format Activity Messages for frontend
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toObjectId = (value) => {
    if (!isValidObjectId(value)) {
        return null;
    }
    return new mongoose.Types.ObjectId(value);
};

const mapUserPreview = (user) => {
    if (!user) {
        return { id: null, username: 'unknown', profileImage: '' };
    }

    if (typeof user === 'string') {
        return { id: user, username: user, profileImage: '' };
    }

    if (user instanceof mongoose.Types.ObjectId) {
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
    const userDoc = await User.findById(userId)
        .populate('friends', 'username profileImage')
        .lean();

    if (!userDoc) {
        return null;
    }

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
        joinDate: userDoc.joinDate ? userDoc.joinDate.toISOString() : null,
        friends: (userDoc.friends || []).map(mapUserPreview),
    };
};

const buildProfilePayload = async (userId) => {
    const userDoc = await User.findById(userId)
        .populate('friends', 'username profileImage')
        .lean();

    if (!userDoc) {
        return null;
    }

    const projects = await Project.find({
        $or: [
            { ownerId: userDoc._id },
            { members: userDoc._id },
        ],
    })
        .populate('ownerId', 'username')
        .lean();

    const projectSummaries = projects.map((project) => {
        const isOwner = project.ownerId?._id?.toString() === userDoc._id.toString();
        return {
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            role: isOwner ? 'owner' : 'member',
            lastActivity: project.lastActivity ? new Date(project.lastActivity).toLocaleDateString() : '',
            imageUrl: buildPublicUrl(project.image),
        };
    });

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
        joinDate: userDoc.joinDate ? userDoc.joinDate.toISOString() : null,
        friends: (userDoc.friends || []).map(mapUserPreview),
        projects: projectSummaries,
    };
};

const populateProjectDetail = async (projectId) => {
    return Project.findById(projectId)
        .populate('ownerId', 'username profileImage')
        .populate('checkedOutBy', 'username profileImage')
        .populate({ path: 'members', select: 'username profileImage' })
        .populate({ path: 'files.uploadedBy', select: 'username profileImage' })
        .populate({
            path: 'activity',
            options: { sort: { time: -1 } },
            populate: { path: 'userId', select: 'username profileImage' },
        })
        .lean();
};

const formatProjectDetail = (project) => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    type: project.type,
    version: project.version,
    tags: project.tags,
    owner: mapUserPreview(project.ownerId),
    createdDate: project.createdDate ? new Date(project.createdDate).toISOString() : null,
    lastActivity: project.lastActivity ? new Date(project.lastActivity).toISOString() : null,
    downloads: project.downloads || 0,
    checkoutStatus: project.checkoutStatus,
    checkedOutBy: project.checkedOutBy ? mapUserPreview(project.checkedOutBy) : null,
    members: (project.members || []).map(mapUserPreview),
    imageUrl: buildPublicUrl(project.image),
    files: (project.files || []).map((fileDoc) => buildFilePayload(project._id, fileDoc)),
    activity: formatActivity(project.activity),
});

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
        const user = await User.findOne({ email: normalisedEmail });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const payload = await buildAuthUserPayload(user._id);
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

        const existingUser = await User.findOne({
            $or: [{ email: normalisedEmail }, { username: trimmedUsername }],
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const newUser = new User({ username: trimmedUsername, email: normalisedEmail, password });
        await newUser.save();

        const payload = await buildAuthUserPayload(newUser._id);
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
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true },
        );

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
app.post('/api/users/:id/friends', async (req, res) => {
    const { currentUserId } = req.body;
    const profileObjectId = toObjectId(req.params.id);
    const currentUserObjectId = toObjectId(currentUserId);

    if (!profileObjectId || !currentUserObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid user identifiers for friendship' });
    }

    if (profileObjectId.toString() === currentUserObjectId.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot add yourself as a friend' });
    }

    try {
        const users = await Promise.all([
            User.findById(currentUserObjectId).lean(),
            User.findById(profileObjectId).lean(),
        ]);

        if (!users[0] || !users[1]) {
            return res.status(404).json({ success: false, message: 'One or both users not found' });
        }

        await Promise.all([
            User.findByIdAndUpdate(currentUserObjectId, { $addToSet: { friends: profileObjectId } }),
            User.findByIdAndUpdate(profileObjectId, { $addToSet: { friends: currentUserObjectId } }),
        ]);

        const [updatedUser, updatedProfile] = await Promise.all([
            buildAuthUserPayload(currentUserObjectId),
            buildProfilePayload(profileObjectId),
        ]);

        res.json({
            success: true,
            message: 'Friend added successfully',
            user: updatedUser,
            profile: updatedProfile,
        });
    } catch (error) {
        console.error('Add friend error:', error);
        res.status(500).json({ success: false, message: 'Server error adding friend' });
    }
});

// DELETE Unfriend
app.delete('/api/users/:id/friends', async (req, res) => {
    const { currentUserId } = req.body;
    const profileObjectId = toObjectId(req.params.id);
    const currentUserObjectId = toObjectId(currentUserId);

    if (!profileObjectId || !currentUserObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid user identifiers for friendship removal' });
    }

    try {
        await Promise.all([
            User.findByIdAndUpdate(currentUserObjectId, { $pull: { friends: profileObjectId } }),
            User.findByIdAndUpdate(profileObjectId, { $pull: { friends: currentUserObjectId } }),
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
        const result = await User.findByIdAndDelete(req.params.id);
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

app.get('/api/project-types', (req, res) => {
    res.json({ success: true, types: PROJECT_TYPES });
});

const assignProjectId = (req, res, next) => {
    req.projectUploadId = new mongoose.Types.ObjectId();
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

            const viewer = await User.findById(viewerId).lean();
            if (!viewer) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const friendIds = (viewer.friends || []).map((id) => toObjectId(id)).filter(Boolean);
            const ownersToInclude = [viewerId, ...friendIds];

            matchQuery = {
                $or: [
                    { ownerId: { $in: ownersToInclude } },
                    { members: viewerId },
                ],
            };
        }

        const projects = await Project.find(matchQuery)
            .populate('ownerId', 'username profileImage')
            .populate('checkedOutBy', 'username profileImage')
            .populate({
                path: 'activity',
                options: { sort: { time: -1 }, limit: 3 },
                populate: { path: 'userId', select: 'username profileImage' },
            })
            .sort(sortQuery)
            .lean();

        const formattedProjects = projects.map((project) => ({
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            type: project.type,
            version: project.version,
            tags: project.tags,
            owner: mapUserPreview(project.ownerId),
            imageUrl: buildPublicUrl(project.image),
            checkoutStatus: project.checkoutStatus,
            checkedOutBy: project.checkedOutBy ? mapUserPreview(project.checkedOutBy) : null,
            members: Array.isArray(project.members) ? project.members.length : 0,
            downloads: project.downloads || 0,
            lastActivity: project.lastActivity ? new Date(project.lastActivity).toLocaleDateString() : '',
            activity: formatActivity(project.activity),
        }));

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
        const project = await populateProjectDetail(projectId);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, project: formatProjectDetail(project) });
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

        if (!type || !PROJECT_TYPES.includes(type)) {
            cleanupUploadedFiles(uploadedGroups);
            return res.status(400).json({ success: false, message: 'Project type is invalid' });
        }

        try {
            const owner = await User.findById(ownerObjectId).lean();
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

            const newProject = new Project({
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
            });

            await newProject.save();
            await User.findByIdAndUpdate(ownerObjectId, { $addToSet: { projects: newProject._id } });

            const creationMessage = new Message({
                projectId: newProject._id,
                userId: ownerObjectId,
                action: 'created',
                message: fileRecords.length
                    ? 'Project created with initial files'
                    : 'Project created',
            });
            await creationMessage.save();
            await Project.findByIdAndUpdate(newProject._id, {
                $push: { activity: creationMessage._id },
                $set: { lastActivity: Date.now() },
            });

            const populatedProject = await populateProjectDetail(newProject._id);

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
    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Invalid project identifier' });
    }

    try {
        const requesterId = toObjectId(req.body.requesterId);
        if (!requesterId) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ success: false, message: 'Requester identifier is required' });
        }

        const project = await Project.findById(projectId).lean();
        if (!project) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.ownerId.toString() !== requesterId.toString()) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({ success: false, message: 'Only the project owner can update details' });
        }

        const updateSet = { lastActivity: Date.now() };
        const maybeName = sanitizeProjectName(req.body.name);
        const maybeDescription = sanitizeProjectDescription(req.body.description);
        const maybeType = (req.body.type || '').toLowerCase();
        const maybeVersion = (req.body.version || '').trim();
        const maybeTags = normalizeTags(req.body.tags);

        if (maybeName) {
            updateSet.name = maybeName;
        }
        if (maybeDescription) {
            updateSet.description = maybeDescription;
        }
        if (maybeType) {
            if (!PROJECT_TYPES.includes(maybeType)) {
                if (req.file?.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ success: false, message: 'Project type is invalid' });
            }
            updateSet.type = maybeType;
        }
        if (maybeVersion) {
            updateSet.version = maybeVersion;
        }
        if (req.body.tags !== undefined) {
            updateSet.tags = maybeTags;
        }

        if (req.file) {
            if (req.file.size > IMAGE_MAX_SIZE_BYTES) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Project image must be smaller than 5MB. Please upload a smaller image.',
                });
            }
            if (project.image) {
                removeFileIfExists(project.image);
            }
            updateSet.image = getRelativePath(req.file.path);
        }

        await Project.findByIdAndUpdate(
            projectId,
            { $set: updateSet },
            { runValidators: true },
        );

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
    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Invalid project identifier' });
    }

    try {
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        await Message.deleteMany({ projectId });

        const memberIdSet = new Set((project.members || []).map((id) => id.toString()));
        if (project.ownerId) {
            memberIdSet.add(project.ownerId.toString());
        }
        const memberIds = Array.from(memberIdSet).map((id) => new mongoose.Types.ObjectId(id));
        if (memberIds.length > 0) {
            await User.updateMany(
                { _id: { $in: memberIds } },
                { $pull: { projects: projectId } },
            );
        }

        await Project.findByIdAndDelete(projectId);

        const projectDirectory = path.join(PROJECT_UPLOADS_ROOT, projectId.toString());
        if (fs.existsSync(projectDirectory)) {
            try {
                fs.rmSync(projectDirectory, { recursive: true, force: true });
            } catch (error) {
                console.warn('Unable to remove project directory:', projectDirectory, error.message);
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
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const isMember = (project.members || []).some(
            (memberId) => memberId.toString() === userObjectId.toString(),
        );
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Only project members can check out the project' });
        }

        if (
            project.checkoutStatus === 'checked-out' &&
            project.checkedOutBy &&
            project.checkedOutBy.toString() !== userObjectId.toString()
        ) {
            return res.status(400).json({ success: false, message: 'Project already checked out by another user' });
        }

        await Project.findByIdAndUpdate(
            projectId,
            { checkoutStatus: 'checked-out', checkedOutBy: userObjectId, lastActivity: Date.now() },
        );

        const activityMessage = new Message({
            projectId,
            userId: userObjectId,
            action: 'checked-out',
            message: 'Checked out project for changes',
        });
        await activityMessage.save();
        await Project.findByIdAndUpdate(projectId, { $push: { activity: activityMessage._id } });

        const populatedProject = await populateProjectDetail(projectId);

        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: 'Project checked out successfully',
        });
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

        try {
            const project = await Project.findById(projectId).lean();
            if (!project) {
                cleanupUploadedFiles(uploadedGroups);
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            if (project.checkoutStatus !== 'checked-out') {
                cleanupUploadedFiles(uploadedGroups);
                return res.status(400).json({ success: false, message: 'Project is not currently checked out' });
            }

            if (!project.checkedOutBy || project.checkedOutBy.toString() !== userObjectId.toString()) {
                cleanupUploadedFiles(uploadedGroups);
                return res.status(403).json({ success: false, message: 'Only the member who checked out the project can check it back in' });
            }

            const newFileRecords = uploadedGroups.projectFiles.map((file) =>
                createFileRecord(file, projectId, userObjectId)
            );

            const activityMessage = new Message({
                projectId,
                userId: userObjectId,
                action: 'checked-in',
                message,
            });
            await activityMessage.save();

            const updateOps = {
                $set: {
                    checkoutStatus: 'checked-in',
                    checkedOutBy: null,
                    lastActivity: Date.now(),
                    version,
                },
                $push: {
                    activity: activityMessage._id,
                },
            };

            if (newFileRecords.length) {
                updateOps.$push.files = { $each: newFileRecords };
            }

            await Project.findByIdAndUpdate(projectId, updateOps);

            const populatedProject = await populateProjectDetail(projectId);

            res.json({
                success: true,
                project: formatProjectDetail(populatedProject),
                message: 'Project checked in successfully',
            });
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

    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Invalid project identifier for download' });
    }

    try {
        const projectExists = await Project.findById(projectId).lean();
        if (!projectExists) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        await Project.findByIdAndUpdate(
            projectId,
            { $inc: { downloads: 1 }, lastActivity: Date.now() },
        );

        if (userObjectId) {
            const downloadMessage = new Message({
                projectId,
                userId: userObjectId,
                action: 'downloaded',
                message: 'Downloaded project files',
            });
            await downloadMessage.save();
            await Project.findByIdAndUpdate(projectId, { $push: { activity: downloadMessage._id } });
        }

        const populatedProject = await populateProjectDetail(projectId);

        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: 'Download recorded successfully',
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ success: false, message: 'Server error during download' });
    }
});

app.post('/api/projects/:id/messages', async (req, res) => {
    const { userId, message } = req.body;
    const projectId = toObjectId(req.params.id);
    const userObjectId = toObjectId(userId);

    if (!projectId || !userObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for message creation' });
    }

    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    try {
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const isMember = (project.members || []).some(
            (memberId) => memberId.toString() === userObjectId.toString(),
        );
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Only project members can post messages' });
        }

        const newMessage = new Message({
            projectId,
            userId: userObjectId,
            action: 'commented',
            message: message.trim(),
        });
        await newMessage.save();

        await Project.findByIdAndUpdate(
            projectId,
            { $push: { activity: newMessage._id }, lastActivity: Date.now() },
        );

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('userId', 'username profileImage')
            .lean();

        res.status(201).json({
            success: true,
            activity: {
                id: populatedMessage._id.toString(),
                user: mapUserPreview(populatedMessage.userId),
                action: populatedMessage.action,
                message: populatedMessage.message,
                time: populatedMessage.time ? new Date(populatedMessage.time).toLocaleString() : '',
            },
        });
    } catch (error) {
        console.error('Message creation error:', error);
        res.status(500).json({ success: false, message: 'Server error while creating message' });
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
            Project.findById(projectId).lean(),
            User.findById(requesterId).lean(),
            User.findById(friendId).lean(),
        ]);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        if (!requester || !friend) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

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

        await Project.findByIdAndUpdate(projectId, {
            $addToSet: { members: friendId },
            $set: { lastActivity: Date.now() },
        });

        await User.findByIdAndUpdate(friendId, { $addToSet: { projects: projectId } });

        const activityMessage = new Message({
            projectId,
            userId: requesterId,
            action: 'member-added',
            message: `Added ${friend.username} to the project`,
        });
        await activityMessage.save();
        await Project.findByIdAndUpdate(projectId, { $push: { activity: activityMessage._id } });

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
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

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

        await Project.findByIdAndUpdate(projectId, {
            $pull: { members: memberId },
            $set: { lastActivity: Date.now() },
        });
        await User.findByIdAndUpdate(memberId, { $pull: { projects: projectId } });

        const removedUser = await User.findById(memberId, 'username').lean();

        const activityMessage = new Message({
            projectId,
            userId: requesterId,
            action: 'member-removed',
            message: removedUser ? `Removed ${removedUser.username} from the project` : 'Removed a project member',
        });
        await activityMessage.save();
        await Project.findByIdAndUpdate(projectId, { $push: { activity: activityMessage._id } });

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
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.ownerId.toString() !== requesterId.toString()) {
            return res.status(403).json({ success: false, message: 'Only the current owner can transfer ownership' });
        }

        const isMember = (project.members || []).some((id) => id.toString() === newOwnerId.toString());
        if (!isMember) {
            return res.status(400).json({ success: false, message: 'Ownership can only be transferred to an existing member' });
        }

        await Project.findByIdAndUpdate(projectId, {
            $set: { ownerId: newOwnerId, lastActivity: Date.now() },
            $addToSet: { members: newOwnerId },
        });

        await User.findByIdAndUpdate(newOwnerId, { $addToSet: { projects: projectId } });

        const newOwner = await User.findById(newOwnerId, 'username').lean();
        const activityMessage = new Message({
            projectId,
            userId: requesterId,
            action: 'ownership-transferred',
            message: newOwner ? `Transferred ownership to ${newOwner.username}` : 'Transferred project ownership',
        });
        await activityMessage.save();
        await Project.findByIdAndUpdate(projectId, { $push: { activity: activityMessage._id } });

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
        const project = await Project.findById(projectId).lean();
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
    let results = [];

    try {
        if (type === 'projects') {
            results = await Project.find({
                $or: [
                    { name: regex },
                    { tags: regex },
                    { type: regex }
                ]
            }).populate('ownerId', 'username').lean();
            
        } else if (type === 'users') {
            results = await User.find({
                $or: [
                    { username: regex },
                    { fullName: regex },
                    { email: regex }
                ]
            }).lean();

        } else if (type === 'tags') {
            // Find projects that contain the tag
            results = await Project.find({ tags: regex }).populate('ownerId', 'username').lean();
        }

        // Format and send the results
        const formattedResults = results.map(item => {
            const formatted = {
                id: item._id?.toString(),
                name: item.username || item.name,
                type: type === 'tags' ? 'projects' : type,
                description: item.description || item.bio || item.email || '',
            };

            if (formatted.type === 'projects') {
                formatted.imageUrl = buildPublicUrl(item.image);
            }

            return formatted;
        });

        res.json({ success: true, results: formattedResults });
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
app.post('/api/projects', async (req, res) => {
    const { name, description, type, tags = [], version, ownerId } = req.body;

    if (!name || !description || !type || !version || !ownerId) {
        return res.status(400).json({ success: false, message: 'Missing required project fields' });
    }

    const ownerObjectId = toObjectId(ownerId);
    if (!ownerObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid owner identifier' });
    }

    try {
        const owner = await User.findById(ownerObjectId).lean();
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        const normalisedTags = Array.isArray(tags)
            ? tags
            : String(tags)
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);

        const newProject = new Project({
            name: name.trim(),
            description: description.trim(),
            ownerId: ownerObjectId,
            type,
            tags: normalisedTags,
            version: version.trim(),
            members: [ownerObjectId],
            checkoutStatus: 'checked-in',
            lastActivity: Date.now(),
        });

        await newProject.save();

        await User.findByIdAndUpdate(ownerObjectId, { $addToSet: { projects: newProject._id } });

        const creationMessage = new Message({
            projectId: newProject._id,
            userId: ownerObjectId,
            action: 'created',
            message: 'Project created',
        });
        await creationMessage.save();

        await Project.findByIdAndUpdate(newProject._id, { $push: { activity: creationMessage._id } });

        const projectPayload = await Project.findById(newProject._id)
            .populate('ownerId', 'username profileImage')
            .lean();

        res.status(201).json({
            success: true,
            project: {
                id: projectPayload._id.toString(),
                name: projectPayload.name,
                owner: mapUserPreview(projectPayload.ownerId),
            },
        });
    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
