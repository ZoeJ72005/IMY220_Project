const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
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
    files: project.files || [],
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
            checkoutStatus: project.checkoutStatus,
            checkedOutBy: project.checkedOutBy ? mapUserPreview(project.checkedOutBy) : null,
            members: project.members ? project.members.length : 0,
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
        const project = await Project.findById(projectId)
            .populate('ownerId', 'username profileImage')
            .populate('checkedOutBy', 'username profileImage')
            .populate({ path: 'members', select: 'username profileImage' })
            .populate({
                path: 'activity',
                options: { sort: { time: -1 } },
                populate: { path: 'userId', select: 'username profileImage' },
            })
            .lean();

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

// PUT Project (Edit Project Details)
app.put('/api/projects/:id', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Invalid project identifier' });
    }

    const allowedFields = ['name', 'description', 'type', 'version', 'tags', 'files', 'image'];
    const updateData = {};

    allowedFields.forEach((field) => {
        if (field in req.body) {
            updateData[field] = req.body[field];
        }
    });

    if ('tags' in updateData) {
        updateData.tags = Array.isArray(updateData.tags)
            ? updateData.tags
            : String(updateData.tags)
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No project fields provided for update' });
    }

    updateData.lastActivity = Date.now();

    try {
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            updateData,
            { new: true, runValidators: true },
        )
            .populate('ownerId', 'username profileImage')
            .populate('checkedOutBy', 'username profileImage')
            .populate({ path: 'members', select: 'username profileImage' })
            .populate({
                path: 'activity',
                options: { sort: { time: -1 } },
                populate: { path: 'userId', select: 'username profileImage' },
            })
            .lean();

        if (!updatedProject) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

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

        const memberIds = project.members || [];
        if (memberIds.length > 0) {
            await User.updateMany(
                { _id: { $in: memberIds } },
                { $pull: { projects: projectId } },
            );
        }

        await Project.findByIdAndDelete(projectId);

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

        const populatedProject = await Project.findById(projectId)
            .populate('ownerId', 'username profileImage')
            .populate('checkedOutBy', 'username profileImage')
            .populate({ path: 'members', select: 'username profileImage' })
            .populate({
                path: 'activity',
                options: { sort: { time: -1 } },
                populate: { path: 'userId', select: 'username profileImage' },
            })
            .lean();

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
app.post('/api/projects/:id/checkin', async (req, res) => {
    const { userId, message } = req.body;
    const projectId = toObjectId(req.params.id);
    const userObjectId = toObjectId(userId);

    if (!projectId || !userObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid identifiers for check-in' });
    }

    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'A check-in message describing your changes is required' });
    }

    try {
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.checkoutStatus !== 'checked-out') {
            return res.status(400).json({ success: false, message: 'Project is not currently checked out' });
        }

        if (!project.checkedOutBy || project.checkedOutBy.toString() !== userObjectId.toString()) {
            return res.status(403).json({ success: false, message: 'Only the user who checked out the project can check it back in' });
        }

        const activityMessage = new Message({
            projectId,
            userId: userObjectId,
            action: 'checked-in',
            message: message.trim(),
        });
        await activityMessage.save();

        await Project.findByIdAndUpdate(
            projectId,
            {
                checkoutStatus: 'checked-in',
                checkedOutBy: null,
                lastActivity: Date.now(),
                $push: { activity: activityMessage._id },
            },
        );

        const populatedProject = await Project.findById(projectId)
            .populate('ownerId', 'username profileImage')
            .populate('checkedOutBy', 'username profileImage')
            .populate({ path: 'members', select: 'username profileImage' })
            .populate({
                path: 'activity',
                options: { sort: { time: -1 } },
                populate: { path: 'userId', select: 'username profileImage' },
            })
            .lean();

        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: 'Project checked in successfully',
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, message: 'Server error during check-in' });
    }
});

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

        const populatedProject = await Project.findById(projectId)
            .populate('ownerId', 'username profileImage')
            .populate('checkedOutBy', 'username profileImage')
            .populate({ path: 'members', select: 'username profileImage' })
            .populate({
                path: 'activity',
                options: { sort: { time: -1 } },
                populate: { path: 'userId', select: 'username profileImage' },
            })
            .lean();

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
        const formattedResults = results.map(item => ({
            id: item._id?.toString(),
            name: item.username || item.name,
            type: type === 'tags' ? 'projects' : type,
            description: item.description || item.bio || item.email || '',
        }));

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
