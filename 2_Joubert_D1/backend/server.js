const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB, User, Project, Message } = require('./database');
const mongoose = require('mongoose');

require('dotenv').config();

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

// Utility function to format project data
const formatProject = (project) => {
    return {
        ...project,
        owner: project.ownerId ? project.ownerId.username : null,
        ownerId: project.ownerId ? project.ownerId._id : null,
        members: project.members ? project.members.map(member => member.username) : [],
        lastActivity: project.lastActivity.toLocaleDateString()
    };
};

// Authentication endpoints
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
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
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
            res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        } else {
            const newUser = new User({ username, email, password });
            await newUser.save();
            
            res.json({
                success: true,
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email
                },
                token: 'dummy_jwt_token_' + newUser._id,
                message: 'User created successfully'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    // In a real app, you would invalidate the token.
    // For this stub, we just confirm a successful logout.
    res.json({ success: true, message: 'Logout successful' });
});


// Profile Endpoints
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('friends').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const projects = await Project.find({ ownerId: req.params.id }).populate('ownerId').lean();

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
                role: 'owner', // Assuming for now that projects on profile are owned by the user
                lastActivity: p.lastActivity
            })),
        };

        res.json({ success: true, profile: profileData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

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

        res.json({ success: true, profile: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Projects Endpoints
app.get('/api/projects/feed', async (req, res) => {
    const { feedType, sortBy, userId } = req.query;
    try {
        let projects;
        let sortQuery = {};
        if (sortBy === 'popularity') {
            sortQuery = { downloads: -1 };
        } else {
            sortQuery = { lastActivity: -1 };
        }

        if (feedType === 'local') {
            const user = await User.findById(userId).lean();
            if (!user) {
                 return res.status(404).json({ success: false, message: 'User not found' });
            }
            const friends = user.friends || [];
            const friendIds = friends.map(f => new mongoose.Types.ObjectId(f._id));

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
            members: p.members ? p.members.length : 0,
            lastActivity: p.lastActivity.toLocaleDateString(),
            activity: []
        }));

        res.json({ success: true, projects: formattedProjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('ownerId')
            .populate('members')
            .populate('activity')
            .lean();
        
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const formattedProject = {
            ...project,
            id: project._id,
            owner: project.ownerId ? project.ownerId.username : 'unknown',
            members: project.members ? project.members.map(m => m.username) : [],
            lastActivity: project.lastActivity.toLocaleDateString(),
            createdDate: project.createdDate.toLocaleDateString(),
            activity: project.activity.map(a => ({
                user: a.userId ? a.userId.username : 'unknown',
                action: a.action,
                message: a.message,
                time: a.time.toLocaleString()
            })),
            checkedOutBy: project.checkedOutBy ? (await User.findById(project.checkedOutBy)).username : null
        };

        res.json({ success: true, project: formattedProject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/projects', async (req, res) => {
    const { name, description, type, tags, version, ownerId } = req.body;
    try {
        const tagsArray = tags.split(',').map(tag => tag.trim());
        const newProject = new Project({
            name,
            description,
            ownerId,
            type,
            tags: tagsArray,
            version,
            members: [ownerId],
            checkoutStatus: 'checked-in',
        });
        await newProject.save();

        // Update user's projects array
        await User.findByIdAndUpdate(ownerId, { $push: { projects: newProject._id } });

        res.status(201).json({ success: true, project: newProject });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

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


// Catch-all handler for React routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(PORT, () => {
    console.log(`> Terminal server running on port ${PORT}`);
    console.log(`> Access at: http://localhost:${PORT}`);
});