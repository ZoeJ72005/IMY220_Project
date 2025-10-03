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
const formatActivity = (activity) => {
    if (!activity) return [];
    return activity.map(a => ({
        id: a._id,
        user: a.userId?.username || 'unknown',
        action: a.action,
        message: a.message,
        time: a.time.toLocaleString()
    }));
};

// ==============================
// AUTHENTICATION & PROFILE ROUTES
// ==============================

// Authentication endpoints (SIGNIN/SIGNUP/LOGOUT remain the same)
app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && user.password === password) {
            res.json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                },
                token: 'dummy_jwt_token_' + user._id,
                message: 'Authentication successful'
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
        } else {
            const newUser = new User({ username, email, password });
            await newUser.save();
            res.json({
                success: true,
                user: { id: newUser._id, username: newUser.username, email: newUser.email },
                token: 'dummy_jwt_token_' + newUser._id,
                message: 'User created successfully'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logout successful' });
});

// GET Profile (View Own/Other users)
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.params.id);
        const user = await User.findById(userId).populate('friends').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const projects = await Project.find({ ownerId: userId }).populate('ownerId').lean();
        // NOTE: We do not fetch full activity data here, as it's large. Simplified project list below.

        const profileData = {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            bio: user.bio,
            location: user.location,
            company: user.company,
            website: user.website,
            languages: user.languages,
            joinDate: user.joinDate,
            friends: user.friends.map(friend => ({
                id: friend._id,
                username: friend.username,
                profileImage: friend.profileImage
            })),
            projects: projects.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                role: 'owner',
                lastActivity: p.lastActivity.toLocaleDateString()
            })),
        };

        res.json({ success: true, profile: profileData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT Profile (Edit Own Profile)
app.put('/api/users/:id', async (req, res) => {
    const { fullName, bio, location, company, website } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { fullName, bio, location, company, website },
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // In a real app, you'd return the formatted profile data
        res.json({ success: true, profile: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST Add Friend
app.post('/api/users/:id/friends', async (req, res) => {
    const { currentUserId } = req.body;
    const profileId = req.params.id;

    try {
        await User.findByIdAndUpdate(
            currentUserId,
            { $addToSet: { friends: profileId } } // Add profileId to current user's friends list
        );
        await User.findByIdAndUpdate(
            profileId,
            { $addToSet: { friends: currentUserId } } // Add currentUserId to the other user's friends list
        );
        res.json({ success: true, message: 'Friend added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error adding friend' });
    }
});

// DELETE Unfriend
app.delete('/api/users/:id/friends', async (req, res) => {
    const { currentUserId } = req.body;
    const profileId = req.params.id;

    try {
        await User.findByIdAndUpdate(
            currentUserId,
            { $pull: { friends: profileId } } // Remove profileId from current user's friends list
        );
        await User.findByIdAndUpdate(
            profileId,
            { $pull: { friends: currentUserId } } // Remove currentUserId from the other user's friends list
        );
        res.json({ success: true, message: 'Friend removed successfully' });
    } catch (error) {
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
    const { feedType, sortBy, userId } = req.query;
    try {
        let projects;
        let sortQuery = { lastActivity: -1 }; 

        if (sortBy === 'popularity') {
            sortQuery = { downloads: -1 };
        } 

        if (feedType === 'local') {
            const user = await User.findById(userId).lean();
            if (!user) {
                 return res.status(404).json({ success: false, message: 'User not found' });
            }
            // Security enhancement: Ensure the userId from query matches an authenticated user.
            // In a real app, you would get the userId from a decoded JWT token or session, not the query.
            // For this project, we'll assume a check happens here.
            // const authenticatedUserId = req.user.id; // Example with auth middleware
            // if (userId !== authenticatedUserId) return res.status(403).json({ success: false, message: 'Forbidden' });
            const friendIds = user.friends || [];
            
            projects = await Project.find({
                $or: [
                    { ownerId: new mongoose.Types.ObjectId(userId) },
                    { ownerId: { $in: friendIds } }
                ]
            }).populate('ownerId').sort(sortQuery).lean();
        } else {
            projects = await Project.find({}).populate('ownerId').sort(sortQuery).lean();
        }
        
        const formattedProjects = projects.map(p => ({
             ...p,
            id: p._id,
            owner: p.ownerId ? p.ownerId.username : 'unknown',
            // Pass members count for efficiency in list view
            members: p.members ? p.members.length : 0, 
            lastActivity: p.lastActivity.toLocaleDateString(),
            activity: []
        }));

        res.json({ success: true, projects: formattedProjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET Project by ID (View Project)
app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('ownerId', 'username')
            .populate('members', 'username')
            .populate({
                path: 'activity',
                populate: { path: 'userId', select: 'username' }
            })
            .lean();
        
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        
        let checkedOutByUsername = null;
        if (project.checkedOutBy) {
            const checkedOutUser = await User.findById(project.checkedOutBy, 'username');
            checkedOutByUsername = checkedOutUser ? checkedOutUser.username : null;
        }

        const formattedProject = {
            ...project,
            id: project._id,
            owner: project.ownerId?.username || 'unknown',
            members: project.members?.map(m => m.username) || [],
            lastActivity: project.lastActivity?.toLocaleDateString(),
            createdDate: project.createdDate?.toLocaleDateString(),
            activity: formatActivity(project.activity),
            checkedOutBy: checkedOutByUsername
        };

        res.json({ success: true, project: formattedProject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST Project (Create Project)
app.post('/api/projects', async (req, res) => {
    const { name, description, type, tags, version, ownerId } = req.body;
    try {
        const tagsArray = tags.split(',').map(tag => tag.trim());
        const newProject = new Project({
            name, description, ownerId, type, tags: tagsArray, version,
            members: [ownerId], checkoutStatus: 'checked-in',
        });
        await newProject.save();

        // Update user's projects array (for fast lookup on profile)
        await User.findByIdAndUpdate(ownerId, { $push: { projects: newProject._id } });

        res.status(201).json({ success: true, project: newProject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT Project (Edit Project Details)
app.put('/api/projects/:id', async (req, res) => {
    const { name, description, type } = req.body;
    try {
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { name, description, type },
            { new: true, runValidators: true }
        );
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE Project (Delete Project)
app.delete('/api/projects/:id', async (req, res) => {
    const projectId = req.params.id;
    try {
        // Find project to get owner ID
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        
        // 1. Delete project messages/activity
        await Message.deleteMany({ projectId });

        // 2. Remove project reference from owner/members (Assuming owner is the only member for D2 scope)
        await User.findByIdAndUpdate(project.ownerId, { $pull: { projects: projectId } });

        // 3. Delete the project document
        await Project.findByIdAndDelete(projectId);

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during deletion' });
    }
});

// ==============================
// PROJECT COLLABORATION ROUTES
// ==============================

// POST Check-out Project
app.post('/api/projects/:id/checkout', async (req, res) => {
    const { userId } = req.body;
    const projectId = req.params.id;

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (project.checkoutStatus === 'checked-out') {
            return res.status(400).json({ success: false, message: 'Project already checked out' });
        }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { checkoutStatus: 'checked-out', checkedOutBy: userId, lastActivity: Date.now() },
            { new: true }
        );

        // Record activity (no message needed for checkout)
        const newMessage = new Message({
            projectId: updatedProject._id,
            userId: new mongoose.Types.ObjectId(userId),
            action: 'checked-out',
            message: 'Checked out project for changes',
        });
        await newMessage.save();
        await Project.findByIdAndUpdate(updatedProject._id, { $push: { activity: newMessage._id } });


        res.json({ success: true, project: updatedProject, message: 'Project checked out successfully' });

    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, message: 'Server error during check-out' });
    }
});

// POST Check-in Project
app.post('/api/projects/:id/checkin', async (req, res) => {
    const { userId, message } = req.body;
    const projectId = req.params.id;

    try {
        // 1. Create a new message/activity record
        const newMessage = new Message({
            projectId: new mongoose.Types.ObjectId(projectId),
            userId: new mongoose.Types.ObjectId(userId),
            action: 'checked-in',
            message: message,
        });
        await newMessage.save();

        // 2. Update the Project status and activity list
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { 
                checkoutStatus: 'checked-in', 
                checkedOutBy: null, 
                lastActivity: Date.now(),
                $push: { activity: newMessage._id } 
            },
            { new: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, project: updatedProject, message: 'Project checked in successfully' });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, message: 'Server error during check-in' });
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
            id: item._id,
            name: item.username || item.name,
            type: type,
            description: item.description || item.bio || item.email,
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