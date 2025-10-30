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
const PROFILE_UPLOADS_ROOT = path.join(UPLOADS_ROOT, 'profiles');
ensureDirSync(PROJECT_UPLOADS_ROOT);
ensureDirSync(PROFILE_UPLOADS_ROOT);

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

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            ensureDirSync(PROFILE_UPLOADS_ROOT);
            cb(null, PROFILE_UPLOADS_ROOT);
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
        const uniqueSuffix = crypto.randomBytes(6).toString('hex');
        cb(null, `${baseName || 'profile'}-${uniqueSuffix}${ext}`);
    },
});

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: IMAGE_MAX_SIZE_BYTES },
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

const normalizeLanguages = (languagesInput) => {
    if (!languagesInput) {
        return [];
    }
    if (Array.isArray(languagesInput)) {
        return languagesInput
            .flatMap((item) => String(item).split(/[,;#/]/))
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (typeof languagesInput === 'string') {
        return languagesInput
            .split(/[,;#/]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLooseRegex = (term = '') => {
    if (!term) {
        return null;
    }
    const safe = term
        .split('')
        .map((char) => escapeRegex(char))
        .join('.*');
    return new RegExp(safe, 'i');
};

const tokenizeForSearch = (value = '') =>
    value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter(Boolean);

const levenshteinDistance = (a = '', b = '') => {
    if (a === b) {
        return 0;
    }
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) {
        return lenB;
    }
    if (lenB === 0) {
        return lenA;
    }

    const prev = new Array(lenB + 1);
    const current = new Array(lenB + 1);

    for (let j = 0; j <= lenB; j += 1) {
        prev[j] = j;
    }

    for (let i = 1; i <= lenA; i += 1) {
        current[0] = i;
        const charA = a.charCodeAt(i - 1);
        for (let j = 1; j <= lenB; j += 1) {
            const cost = charA === b.charCodeAt(j - 1) ? 0 : 1;
            current[j] = Math.min(
                prev[j] + 1,
                current[j - 1] + 1,
                prev[j - 1] + cost
            );
        }
        for (let j = 0; j <= lenB; j += 1) {
            prev[j] = current[j];
        }
    }

    return current[lenB];
};

const computeMatchScore = (term, text) => {
    if (!term || !text) {
        return 0;
    }

    const search = term.toLowerCase().trim();
    const candidate = text.toString().toLowerCase().trim();

    if (!candidate) {
        return 0;
    }

    if (candidate === search) {
        return 1;
    }

    if (candidate.startsWith(search)) {
        return 0.95;
    }

    if (candidate.includes(search)) {
        const index = candidate.indexOf(search);
        const closeness = 1 - index / Math.max(candidate.length, 1);
        return 0.75 + closeness * 0.2;
    }

    const searchTokens = tokenizeForSearch(search);
    const candidateTokens = tokenizeForSearch(candidate);

    if (searchTokens.length > 1) {
        const matches = searchTokens.filter((token) => candidate.includes(token));
        if (matches.length) {
            return 0.6 + 0.4 * (matches.length / searchTokens.length);
        }
    }

    let best = 0;
    for (const token of candidateTokens) {
        if (!token) {
            // eslint-disable-next-line no-continue
            continue;
        }
        if (token === search) {
            best = Math.max(best, 0.9);
            continue;
        }
        const distance = levenshteinDistance(search, token);
        const fuzzy = 1 - distance / Math.max(search.length, token.length, 1);
        if (fuzzy > best) {
            best = fuzzy * 0.85;
        }
    }

    if (best < 0.8) {
        const trimmedCandidate = candidate.slice(
            0,
            Math.max(search.length + 4, Math.min(candidate.length, 120))
        );
        const distance = levenshteinDistance(search, trimmedCandidate);
        const fuzzy = 1 - distance / Math.max(search.length, trimmedCandidate.length || 1);
        best = Math.max(best, fuzzy * 0.8);
    }

    return best;
};

const aggregateMatchScore = (term, texts = []) => {
    if (!term || !Array.isArray(texts) || texts.length === 0) {
        return 0;
    }

    let best = 0;
    texts.forEach((text) => {
        const score = computeMatchScore(term, text);
        if (score > best) {
            best = score;
        }
    });
    return best;
};

const DEFAULT_SEARCH_LIMIT = 25;
const DEFAULT_SEARCH_THRESHOLD = 0.35;
const DEFAULT_SUGGESTION_THRESHOLD = 0.25;

const PROJECT_SEARCH_PROJECTION = {
    name: 1,
    description: 1,
    tags: 1,
    type: 1,
    ownerId: 1,
    image: 1,
    version: 1,
};

const USER_SEARCH_PROJECTION = {
    username: 1,
    fullName: 1,
    email: 1,
    bio: 1,
    profileImage: 1,
    verified: 1,
};

const searchProjects = async (term, options = {}) => {
    if (!Projects || !term) {
        return [];
    }

    const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
    const threshold = options.threshold ?? DEFAULT_SEARCH_THRESHOLD;
    const regexLimit = options.regexLimit || 120;
    const sampleLimit = options.sampleLimit || 240;
    const focus = options.focus || 'projects';

    const regex = buildLooseRegex(term);
    let docs = [];

    if (regex) {
        docs = await Projects.find(
            {
                $or: [
                    { name: regex },
                    { tags: regex },
                    { type: regex },
                    { description: regex },
                ],
            },
            { projection: PROJECT_SEARCH_PROJECTION }
        )
            .limit(regexLimit)
            .toArray();
    }

    if (!docs.length || docs.length < limit) {
        const additional = await Projects.find(
            {},
            { projection: PROJECT_SEARCH_PROJECTION }
        )
            .limit(sampleLimit)
            .toArray();
        docs = dedupeDocsById([...docs, ...additional]);
    }

    const ownerIds = normalizeObjectIdArray(docs.map((doc) => doc.ownerId));
    const ownerDocs = await fetchUsersByIds(ownerIds, 'username');
    const ownerMap = docsToMapById(ownerDocs);

    const matches = docs
        .map((doc) => {
            const baseScore = aggregateMatchScore(term, [
                doc.name,
                doc.description,
                doc.type,
                doc.version,
            ]);
            const tagScore = aggregateMatchScore(term, doc.tags || []);
            const score =
                focus === 'tags'
                    ? Math.max(tagScore * 1.1, baseScore * 0.8)
                    : Math.max(baseScore, tagScore * 0.9);
            return { doc, score };
        })
        .filter(({ score }) => score >= threshold);

    const ranked = rankAndTrimMatches(matches, limit);

    return ranked.map(({ doc, score }) => ({
        id: doc._id.toString(),
        name: doc.name,
        type: 'projects',
        description: doc.description || '',
        imageUrl: buildPublicUrl(doc.image),
        owner: ownerMap.get(doc.ownerId?.toString())?.username || 'unknown',
        version: doc.version || '',
        score,
    }));
};

const searchUsers = async (term, options = {}) => {
    if (!Users || !term) {
        return [];
    }

    const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
    const threshold = options.threshold ?? DEFAULT_SEARCH_THRESHOLD;
    const regexLimit = options.regexLimit || 120;
    const sampleLimit = options.sampleLimit || 240;

    const regex = buildLooseRegex(term);
    let docs = [];

    if (regex) {
        docs = await Users.find(
            {
                $or: [
                    { username: regex },
                    { fullName: regex },
                    { email: regex },
                ],
            },
            { projection: USER_SEARCH_PROJECTION }
        )
            .limit(regexLimit)
            .toArray();
    }

    if (!docs.length || docs.length < limit) {
        const additional = await Users.find({}, { projection: USER_SEARCH_PROJECTION })
            .limit(sampleLimit)
            .toArray();
        docs = dedupeDocsById([...docs, ...additional]);
    }

    const matches = docs
        .map((doc) => {
            const score = aggregateMatchScore(term, [
                doc.username,
                doc.fullName,
                doc.email,
                doc.bio,
            ]);
            return { doc, score };
        })
        .filter(({ score }) => score >= threshold);

    const ranked = rankAndTrimMatches(matches, limit);

    return ranked.map(({ doc, score }) => ({
        id: doc._id.toString(),
        name: doc.username,
        type: 'users',
        description: doc.bio || doc.email || '',
        profileImage: resolveProfileImageUrl(doc.profileImage || ''),
        verified: !!doc.verified,
        score,
    }));
};

const searchTags = async (term, options = {}) =>
    searchProjects(term, { ...options, focus: 'tags' });

const searchActivity = async (term, options = {}) => {
    if (!Messages || !Projects || !term) {
        return [];
    }

    const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
    const threshold = options.threshold ?? DEFAULT_SEARCH_THRESHOLD;
    const regexLimit = options.regexLimit || 200;
    const sampleLimit = options.sampleLimit || 320;

    const regex = buildLooseRegex(term);
    let docs = [];

    if (regex) {
        docs = await Messages.find({
            $or: [
                { message: regex },
                { action: regex },
            ],
        })
            .sort({ time: -1 })
            .limit(regexLimit)
            .toArray();
    }

    if (!docs.length || docs.length < limit) {
        const additional = await Messages.find({})
            .sort({ time: -1 })
            .limit(sampleLimit)
            .toArray();
        docs = dedupeDocsById([...docs, ...additional]);
    }

    const projectIds = normalizeObjectIdArray(docs.map((doc) => doc.projectId));
    const userIds = normalizeObjectIdArray(docs.map((doc) => doc.userId));

    const [projectDocs, userDocs] = await Promise.all([
        projectIds.length
            ? Projects.find(
                  { _id: { $in: projectIds } },
                  { projection: { name: 1, image: 1 } }
              ).toArray()
            : [],
        userIds.length ? fetchUsersByIds(userIds, 'username profileImage') : [],
    ]);

    const projectMap = docsToMapById(projectDocs);
    const userMap = docsToMapById(userDocs);

    const matches = docs
        .map((doc) => {
            const project = doc.projectId ? projectMap.get(doc.projectId.toString()) : null;
            const user = doc.userId ? userMap.get(doc.userId.toString()) : null;
            const score = aggregateMatchScore(term, [
                doc.message,
                doc.action,
                project?.name || '',
                user?.username || '',
            ]);
            return { doc, project, user, score };
        })
        .filter(({ score }) => score >= threshold);

    const ranked = rankAndTrimMatches(matches, limit);

    return ranked.map(({ doc, project, user, score }) => ({
        id: doc._id.toString(),
        name: project?.name || 'Unknown project',
        type: 'activity',
        description: doc.message || '',
        projectId: project?._id?.toString(),
        projectImage: buildPublicUrl(project?.image || ''),
        user: mapUserPreview(user || doc.userId),
        time: doc.time ? new Date(doc.time).toLocaleString() : '',
        score,
    }));
};

const SEARCH_HANDLERS = {
    projects: searchProjects,
    users: searchUsers,
    tags: searchTags,
    activity: searchActivity,
};

const executeSearch = async (term, type, options = {}) => {
    const handler = SEARCH_HANDLERS[type];
    if (!handler) {
        throw new Error('Unsupported search type');
    }
    return handler(term, options);
};

const executeSuggestions = async (term, types, options = {}) => {
    if (!term) {
        return [];
    }

    const uniqueTypes = Array.isArray(types) && types.length
        ? types
        : Object.keys(SEARCH_HANDLERS);

    const limitPerType = options.limitPerType || 5;
    const threshold = options.threshold ?? DEFAULT_SUGGESTION_THRESHOLD;

    const results = await Promise.all(
        uniqueTypes.map((type) =>
            executeSearch(term, type, {
                ...options,
                limit: limitPerType,
                threshold,
            }).catch(() => [])
        )
    );

    const combined = results.flat();
    const seen = new Set();
    const ordered = [];

    combined
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .forEach((entry) => {
            const key = `${entry.type}-${entry.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                ordered.push(entry);
            }
        });

    const overallLimit = options.limit ?? DEFAULT_SEARCH_LIMIT;
    return ordered.slice(0, overallLimit);
};

const dedupeDocsById = (docs = []) => {
    const map = new Map();
    docs.forEach((doc) => {
        if (doc?._id) {
            map.set(doc._id.toString(), doc);
        }
    });
    return Array.from(map.values());
};

const rankAndTrimMatches = (matches = [], limit = DEFAULT_SEARCH_LIMIT) =>
    matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

const getRelativePath = (absolutePath) => {
    if (!absolutePath) {
        return '';
    }
    const relative = path.relative(UPLOADS_ROOT, absolutePath);
    return relative.replace(/\\/g, '/');
};

const stripUploadsPrefix = (value = '') =>
    value.replace(/^\/?uploads\//i, '').replace(/\\/g, '/');

const isExternalUrl = (value = '') => /^https?:\/\//i.test(value);

const buildPublicUrl = (relativePath) => {
    if (!relativePath) {
        return '';
    }

    if (isExternalUrl(relativePath) || relativePath.startsWith('/uploads/')) {
        return relativePath;
    }

    const cleaned = stripUploadsPrefix(relativePath);
    if (!cleaned) {
        return '';
    }

    return `/uploads/${cleaned}`;
};

const resolveProfileImageUrl = (value) => {
    if (!value) {
        return '';
    }

    if (isExternalUrl(value) || value.startsWith('/uploads/')) {
        return value;
    }

    const cleaned = stripUploadsPrefix(value);
    if (!cleaned) {
        return '';
    }

    return `/uploads/${cleaned}`;
};

const removeFileIfExists = (relativePath) => {
    if (!relativePath || isExternalUrl(relativePath)) {
        return;
    }
    const storedPath = stripUploadsPrefix(relativePath);
    if (!storedPath) {
        return;
    }
    const absolutePath = path.join(UPLOADS_ROOT, storedPath);
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
        profileImage: resolveProfileImageUrl(user.profileImage || ''),
    };
};

const ADMIN_USER_SUMMARY_FIELDS = {
    username: 1,
    email: 1,
    role: 1,
    friends: 1,
    projects: 1,
    verified: 1,
    profileImage: 1,
};

const mapAdminUserSummary = (userDoc) => ({
    id: userDoc._id.toString(),
    username: userDoc.username,
    email: userDoc.email,
    role: userDoc.role || 'user',
    verified: !!userDoc.verified,
    profileImage: resolveProfileImageUrl(userDoc.profileImage || ''),
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
    if (result?.value) {
        return result.value;
    }

    // Fallback: if the document matched but the driver did not return it,
    // attempt to load the latest version explicitly before reporting failure.
    return Users.findOne({ _id: objectId });
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
        profileImage: resolveProfileImageUrl(userDoc.profileImage || ''),
        bio: userDoc.bio || '',
        location: userDoc.location || '',
        company: userDoc.company || '',
        website: userDoc.website || '',
        languages: userDoc.languages || [],
        joinDate: userDoc.joinDate ? new Date(userDoc.joinDate).toISOString() : null,
        role: userDoc.role || 'user',
        verified: !!userDoc.verified,
        friends: buildPreviewList(friendIds, friendMap),
        pendingFriendRequests: buildPreviewList(pendingIds, pendingMap),
        outgoingFriendRequests: buildPreviewList(outgoingIds, outgoingMap),
    };
};

const buildProfilePayload = async (profileId, viewerId = null) => {
    if (!Projects) {
        return null;
    }

    const profileObjectId = toObjectId(profileId);
    if (!profileObjectId) {
        return null;
    }

    const basePayload = await buildAuthUserPayload(profileObjectId);
    if (!basePayload) {
        return null;
    }

    const viewerObjectId = toObjectId(viewerId);
    const viewerIdString = viewerObjectId ? viewerObjectId.toString() : null;
    const isOwnProfile = viewerIdString && viewerIdString === basePayload.id;
    const isFriend = basePayload.friends?.some((friend) => friend.id === viewerIdString) || false;
    const relation = isOwnProfile ? 'self' : isFriend ? 'friend' : 'restricted';

    const projects = await Projects.find({
        $or: [{ ownerId: profileObjectId }, { members: profileObjectId }],
    }).toArray();

    const projectSummaries = projects.map((projectDoc) => {
        const projectOwnerId = projectDoc.ownerId ? projectDoc.ownerId.toString() : null;
        const isOwner = projectOwnerId === profileObjectId.toString();

        return {
            id: projectDoc._id.toString(),
            name: projectDoc.name,
            description: projectDoc.description,
            role: isOwner ? 'owner' : 'member',
            lastActivity: projectDoc.lastActivity ? new Date(projectDoc.lastActivity).toLocaleDateString() : '',
            imageUrl: buildPublicUrl(projectDoc.image),
        };
    });

    const friendCount = basePayload.friends?.length || 0;
    const projectCount = projectSummaries.length;

    const profilePayload = {
        id: basePayload.id,
        username: basePayload.username,
        fullName: basePayload.fullName,
        profileImage: basePayload.profileImage,
        bio: basePayload.bio || '',
        joinDate: basePayload.joinDate,
        relation,
        isFriend,
        verified: !!basePayload.verified,
        friendCount,
        projectCount,
        projects: relation === 'restricted' ? [] : projectSummaries,
        role: basePayload.role,
    };

    if (relation === 'friend' || relation === 'self') {
        profilePayload.email = basePayload.email;
        profilePayload.location = basePayload.location;
        profilePayload.company = basePayload.company;
        profilePayload.website = basePayload.website;
        profilePayload.languages = basePayload.languages;
        profilePayload.friends = basePayload.friends;
    } else {
        profilePayload.email = '';
        profilePayload.location = '';
        profilePayload.company = '';
        profilePayload.website = '';
        profilePayload.languages = [];
        profilePayload.friends = [];
    }

    if (relation === 'self') {
        profilePayload.pendingFriendRequests = basePayload.pendingFriendRequests;
        profilePayload.outgoingFriendRequests = basePayload.outgoingFriendRequests;
    } else {
        profilePayload.pendingFriendRequests = [];
        profilePayload.outgoingFriendRequests = [];
    }

    return profilePayload;
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

    const versionHistoryEntries = Array.isArray(projects.versionHistory) ? projects.versionHistory : [];
    const historyUserIds = normalizeObjectIdArray(versionHistoryEntries.map((entry) => entry.userId));
    const historyUserDocs = await fetchUsersByIds(historyUserIds);
    const historyUserMap = docsToMapById(historyUserDocs);

    const enrichedHistory = versionHistoryEntries
        .map((entry) => {
            const userId = entry.userId ? entry.userId.toString() : null;
            return {
                ...entry,
                userId: userId ? historyUserMap.get(userId) || { _id: entry.userId } : null,
                files: (entry.files || []).map((file) => ({ ...file })),
            };
        })
        .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });

    return {
        ...projects,
        ownerId: ownerDoc,
        checkedOutBy: checkedOutDoc,
        members: memberIds.map((id) => memberMap.get(id.toString()) || { _id: id }),
        files: enrichedFiles,
        activity: enrichedActivity,
        versionHistory: enrichedHistory,
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


const formatVersionHistoryEntry = (projectId, entry) => ({
    id: entry._id?.toString() || entry.id?.toString() || null,
    version: entry.version,
    message: entry.message || '',
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : null,
    user: mapUserPreview(entry.userId),
    files: (entry.files || []).map((fileDoc) => buildFilePayload(projectId, fileDoc)),
});

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
    versionHistory: (projects.versionHistory || []).map((entry) =>
        formatVersionHistoryEntry(projects._id, entry)
    ),
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
            verified: false,
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
    const userObjectId = toObjectId(req.params.id);
    if (!userObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid user identifier' });
    }

    try {
        const viewerId = req.query.viewerId ? toObjectId(req.query.viewerId) : null;
        const profile = await buildProfilePayload(userObjectId, viewerId);
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
        if (!(field in req.body)) {
            return;
        }

        const value = req.body[field];

        if (field === 'languages') {
            updateData.languages = normalizeLanguages(value);
            return;
        }

        if (field === 'profileImage') {
            if (typeof value === 'string' && value.trim()) {
                const trimmed = value.trim();
                updateData.profileImage = isExternalUrl(trimmed)
                    ? trimmed
                    : stripUploadsPrefix(trimmed);
            } else if (!value) {
                updateData.profileImage = '';
            }
            return;
        }

        updateData[field] = typeof value === 'string' ? value.trim() : value;
    });

    try {
        const updatedUser = await updateUserById(userId, { $set: updateData }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const profile = await buildProfilePayload(userId, userId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put(
    '/api/users/:id/profile',
    profileUpload.single('profileImage'),
    async (req, res) => {
        const userId = toObjectId(req.params.id);
        if (!userId) {
            if (req.file?.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (error) {
                    console.warn('Unable to remove uploaded profile image:', req.file.path, error.message);
                }
            }
            return res.status(400).json({ success: false, message: 'Invalid user identifier' });
        }

        const updateSet = {};
        const allowedTextFields = ['fullName', 'bio', 'location', 'company', 'website', 'languages'];

        allowedTextFields.forEach((field) => {
            if (!(field in req.body)) {
                return;
            }

            const value = req.body[field];
            if (field === 'languages') {
                updateSet.languages = normalizeLanguages(value);
                return;
            }

            updateSet[field] = typeof value === 'string' ? value.trim() : value;
        });

        let previousUser = null;
        if (req.file) {
            updateSet.profileImage = getRelativePath(req.file.path);
            previousUser = await findUserById(userId, 'profileImage');
        }

        try {
            if (Object.keys(updateSet).length === 0) {
                const profile = await buildProfilePayload(userId, userId);
                return res.json({ success: true, profile });
            }

            const updatedUser = await updateUserById(userId, { $set: updateSet }, { new: true });

            if (!updatedUser) {
                if (req.file?.path) {
                    try {
                        fs.unlinkSync(req.file.path);
                    } catch (error) {
                        console.warn(
                            'Unable to remove uploaded profile image after missing user:',
                            req.file.path,
                            error.message
                        );
                    }
                }
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (req.file && previousUser?.profileImage && previousUser.profileImage !== updatedUser.profileImage) {
                removeFileIfExists(previousUser.profileImage);
            }

            const profile = await buildProfilePayload(userId, userId);
            res.json({ success: true, profile });
        } catch (error) {
            if (req.file?.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.warn('Unable to remove uploaded profile image after failure:', unlinkError.message);
                }
            }
            console.error('Profile image update error:', error);
            res.status(500).json({ success: false, message: 'Server error updating profile' });
        }
    }
);

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
            buildProfilePayload(targetUserId, requesterId),
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
            buildProfilePayload(requesterId, currentUserId),
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
            buildProfilePayload(requesterId, currentUserId),
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
            buildProfilePayload(profileObjectId, currentUserObjectId),
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

        const resolvedUserDoc = updatedUser.value
            || (await Users.findOne({ _id: targetUserId }, { projection: ADMIN_USER_SUMMARY_FIELDS }));

        if (!resolvedUserDoc) {
            return res.status(404).json({ success: false, message: 'Target user not found' });
        }

        res.json({ success: true, user: mapAdminUserSummary(resolvedUserDoc) });
    } catch (error) {
        console.error('Admin update user role error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error updating user role' });
    }
});

app.patch('/api/admin/users/:id', async (req, res) => {
    const targetUserId = toObjectId(req.params.id);
    const adminId = toObjectId(req.body?.adminId);

    if (!targetUserId || !adminId) {
        return res.status(400).json({ success: false, message: 'Admin and user identifiers are required' });
    }

    try {
        await requireAdmin(adminId);

        const updateSet = {};
        if (typeof req.body.username === 'string') {
            updateSet.username = req.body.username.trim();
        }
        if (typeof req.body.email === 'string') {
            updateSet.email = req.body.email.trim().toLowerCase();
        }
        if (typeof req.body.fullName === 'string') updateSet.fullName = req.body.fullName.trim();
        if (typeof req.body.bio === 'string') updateSet.bio = req.body.bio.trim();
        if (typeof req.body.location === 'string') updateSet.location = req.body.location.trim();
        if (typeof req.body.company === 'string') updateSet.company = req.body.company.trim();
        if (typeof req.body.website === 'string') updateSet.website = req.body.website.trim();
        if (req.body.languages !== undefined) updateSet.languages = normalizeLanguages(req.body.languages);

        if (Object.keys(updateSet).length === 0) {
            return res.status(400).json({ success: false, message: 'No user fields provided for update' });
        }

        if (updateSet.username) {
            const existingUsername = await Users.findOne({
                _id: { $ne: targetUserId },
                username: updateSet.username,
            });
            if (existingUsername) {
                return res.status(409).json({ success: false, message: 'Username already in use' });
            }
        }

        if (updateSet.email) {
            const existingEmail = await Users.findOne({
                _id: { $ne: targetUserId },
                email: updateSet.email,
            });
            if (existingEmail) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
        }

        const updatedUser = await Users.findOneAndUpdate(
            { _id: targetUserId },
            { $set: updateSet },
            { returnDocument: 'after', projection: ADMIN_USER_SUMMARY_FIELDS }
        );

        if (!updatedUser.value) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: mapAdminUserSummary(updatedUser.value) });
    } catch (error) {
        console.error('Admin update user error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error updating user' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    const targetUserId = toObjectId(req.params.id);
    const adminId = toObjectId(req.body?.adminId);

    if (!targetUserId || !adminId) {
        return res.status(400).json({ success: false, message: 'Admin and user identifiers are required' });
    }

    try {
        await requireAdmin(adminId);

        const userDoc = await Users.findOne({ _id: targetUserId });
        if (!userDoc) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if ((userDoc.role || 'user') === 'admin') {
            const adminCount = await Users.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one administrator must remain in the system',
                });
            }
        }

        await cascadeDeleteUser(userDoc);

        res.json({ success: true, message: 'User account deleted successfully' });
    } catch (error) {
        console.error('Admin delete user error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error deleting user' });
    }
});

app.post('/api/admin/users/:id/verify', async (req, res) => {
    const targetUserId = toObjectId(req.params.id);
    const adminId = toObjectId(req.body?.adminId);

    if (!targetUserId || !adminId) {
        return res.status(400).json({ success: false, message: 'Admin and user identifiers are required' });
    }

    try {
        await requireAdmin(adminId);
        const updated = await Users.findOneAndUpdate(
            { _id: targetUserId },
            { $set: { verified: true } },
            { returnDocument: 'after', projection: ADMIN_USER_SUMMARY_FIELDS }
        );

        if (!updated.value) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: mapAdminUserSummary(updated.value) });
    } catch (error) {
        console.error('Admin verify user error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error verifying user' });
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

app.put('/api/admin/projects/:id', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const adminId = toObjectId(req.body?.adminId);

    if (!projectId || !adminId) {
        return res.status(400).json({ success: false, message: 'Admin and project identifiers are required' });
    }

    try {
        await requireAdmin(adminId);

        const updateSet = {};
        const maybeName = req.body.name ? sanitizeProjectName(req.body.name) : '';
        const maybeDescription = req.body.description ? sanitizeProjectDescription(req.body.description) : '';
        const maybeType = typeof req.body.type === 'string' ? req.body.type.trim().toLowerCase() : '';
        const maybeVersion = typeof req.body.version === 'string' ? req.body.version.trim() : '';

        if (maybeName) updateSet.name = maybeName;
        if (maybeDescription) updateSet.description = maybeDescription;
        if (maybeVersion) updateSet.version = maybeVersion;
        if (req.body.tags !== undefined) {
            updateSet.tags = normalizeTags(req.body.tags);
        }
        if (maybeType) {
            const availableTypes = await getProjectTypes();
            if (!availableTypes.includes(maybeType)) {
                return res.status(400).json({ success: false, message: 'Project type is invalid' });
            }
            updateSet.type = maybeType;
        }

        if (Object.keys(updateSet).length === 0) {
            return res.status(400).json({ success: false, message: 'No project fields provided for update' });
        }

        const updated = await updateProjectById(projectId, { $set: updateSet }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const populatedProject = await populateProjectDetail(projectId);
        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
        });
    } catch (error) {
        console.error('Admin update project error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error updating project' });
    }
});

app.delete('/api/admin/projects/:id', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const adminId = toObjectId(req.body?.adminId);

    if (!projectId || !adminId) {
        return res.status(400).json({ success: false, message: 'Admin and project identifiers are required' });
    }

    try {
        await requireAdmin(adminId);
        const project = await Projects.findOne({ _id: projectId });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        await cascadeDeleteProject(project);
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Admin delete project error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error deleting project' });
    }
});

app.patch('/api/admin/projects/:projectId/discussion/:messageId', async (req, res) => {
    const adminId = toObjectId(req.body?.adminId);
    const projectId = toObjectId(req.params.projectId);
    const messageId = toObjectId(req.params.messageId);
    const message = (req.body?.message || '').trim();

    if (!adminId || !projectId || !messageId) {
        return res.status(400).json({ success: false, message: 'Admin, project, and message identifiers are required' });
    }

    if (!message) {
        return res.status(400).json({ success: false, message: 'Updated message content cannot be empty' });
    }

    try {
        await requireAdmin(adminId);
        const result = await DiscussionMessages.updateOne(
            { _id: messageId, projectId },
            { $set: { message, updatedAt: new Date() } }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ success: false, message: 'Discussion message not found' });
        }

        res.json({ success: true, message: 'Discussion message updated' });
    } catch (error) {
        console.error('Admin update discussion error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error updating discussion message' });
    }
});

app.delete('/api/admin/projects/:projectId/discussion/:messageId', async (req, res) => {
    const adminId = toObjectId(req.body?.adminId);
    const projectId = toObjectId(req.params.projectId);
    const messageId = toObjectId(req.params.messageId);

    if (!adminId || !projectId || !messageId) {
        return res.status(400).json({ success: false, message: 'Admin, project, and message identifiers are required' });
    }

    try {
        await requireAdmin(adminId);
        const result = await DiscussionMessages.deleteOne({ _id: messageId, projectId });
        if (!result.deletedCount) {
            return res.status(404).json({ success: false, message: 'Discussion message not found' });
        }
        res.json({ success: true, message: 'Discussion message deleted' });
    } catch (error) {
        console.error('Admin delete discussion error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error deleting discussion message' });
    }
});

app.delete('/api/admin/projects/:projectId/messages/:messageId', async (req, res) => {
    const adminId = toObjectId(req.body?.adminId);
    const projectId = toObjectId(req.params.projectId);
    const messageId = toObjectId(req.params.messageId);

    if (!adminId || !projectId || !messageId) {
        return res.status(400).json({ success: false, message: 'Admin, project, and message identifiers are required' });
    }

    try {
        await requireAdmin(adminId);
        const result = await Messages.deleteOne({ _id: messageId, projectId });
        if (!result.deletedCount) {
            return res.status(404).json({ success: false, message: 'Project message not found' });
        }

        await Projects.updateOne(
            { _id: projectId },
            { $pull: { activity: messageId } }
        );

        res.json({ success: true, message: 'Project activity entry removed' });
    } catch (error) {
        console.error('Admin delete activity message error:', error);
        const status = error.statusCode || 500;
        res.status(status).json({ success: false, message: error.message || 'Server error deleting activity message' });
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

    const initialHistoryEntry = {
        _id: new ObjectId(),
        version,
        message: 'Initial version',
        createdAt: new Date(),
        userId: ownerObjectId,
        files: fileRecords.map((file) => ({ ...file })),
    };

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
        versionHistory: [initialHistoryEntry],
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

const cascadeDeleteProject = async (projectDoc) => {
    if (!projectDoc || !projectDoc._id) {
        return;
    }

    const projectId = projectDoc._id instanceof ObjectId ? projectDoc._id : toObjectId(projectDoc._id);
    if (!projectId) {
        return;
    }

    await Promise.all([
        Messages.deleteMany({ projectId }),
        DiscussionMessages.deleteMany({ projectId }),
    ]);

    const memberIdSet = new Set((projectDoc.members || []).map((id) => id.toString()));
    if (projectDoc.ownerId) {
        memberIdSet.add(projectDoc.ownerId.toString());
    }

    const memberIds = Array.from(memberIdSet)
        .map((value) => toObjectId(value))
        .filter(Boolean);

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
};

const cascadeDeleteUser = async (userDoc) => {
    if (!userDoc || !userDoc._id) {
        return;
    }

    const userId = userDoc._id instanceof ObjectId ? userDoc._id : toObjectId(userDoc._id);
    if (!userId) {
        return;
    }

    const ownedProjects = await Projects.find({ ownerId: userId }).toArray();
    for (const project of ownedProjects) {
        await cascadeDeleteProject(project);
    }

    await Projects.updateMany(
        { members: userId },
        { $pull: { members: userId } }
    );

    await Projects.updateMany(
        { checkedOutBy: userId },
        { $set: { checkedOutBy: null, checkoutStatus: 'checked-in' } }
    );

    const userMessageDocs = await Messages.find({ userId }).toArray();
    const messageIds = userMessageDocs.map((doc) => doc._id);
    if (messageIds.length) {
        await Projects.updateMany(
            { activity: { $in: messageIds } },
            { $pull: { activity: { $in: messageIds } } }
        );
        await Messages.deleteMany({ _id: { $in: messageIds } });
    }

    await DiscussionMessages.deleteMany({ userId });

    await Users.updateMany(
        {},
        {
            $pull: {
                friends: userId,
                pendingFriendRequests: userId,
                outgoingFriendRequests: userId,
            },
        }
    );

    await Users.deleteOne({ _id: userId });
};

// DELETE Project (Delete Project)
app.delete('/api/projects/:id', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    if (!projectId) return res.status(400).json({ success: false, message: 'Invalid project identifier' });

    try {
        const project = await Projects.findOne({ _id: projectId });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        await cascadeDeleteProject(project);

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

    const updatedFilesSnapshot = [
        ...((project.files || []).map((file) => ({ ...file }))),
        ...newFileRecords.map((file) => ({ ...file })),
    ];

    const historyEntry = {
        _id: new ObjectId(),
        version,
        message,
        createdAt: new Date(),
        userId: userObjectId,
        files: updatedFilesSnapshot,
    };

    const updateOps = {
        $set: { checkoutStatus: 'checked-in', checkedOutBy: null, lastActivity: Date.now(), version },
        $push: {
            activity: actId,
            versionHistory: historyEntry,
        },
    };
    if (newFileRecords.length) {
        updateOps.$push.files = { $each: newFileRecords };
    }

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

app.post('/api/projects/:id/versions/:versionId/rollback', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    const versionId = toObjectId(req.params.versionId);
    const userObjectId = toObjectId(req.body.userId);

    if (!projectId || !versionId || !userObjectId) {
        return res.status(400).json({
            success: false,
            message: 'Project, version, and user identifiers are required for rollback',
        });
    }

    try {
        const [project, user] = await Promise.all([
            Projects.findOne({ _id: projectId }),
            findUserById(userObjectId, 'role'),
        ]);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const isOwner = project.ownerId && project.ownerId.toString() === userObjectId.toString();
        const isAdmin = (user?.role || '').toLowerCase() === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only the project owner or an administrator can perform a rollback',
            });
        }

        const historyEntry = (project.versionHistory || []).find(
            (entry) => entry?._id && entry._id.toString() === versionId.toString()
        );

        if (!historyEntry) {
            return res.status(404).json({ success: false, message: 'Version history entry not found' });
        }

        const restoredFiles = (historyEntry.files || []).map((file) => {
            const clone = { ...file };
            if (!clone._id || !(clone._id instanceof ObjectId)) {
                clone._id = toObjectId(clone._id) || new ObjectId();
            }
            if (clone.uploadedBy && !(clone.uploadedBy instanceof ObjectId)) {
                clone.uploadedBy = toObjectId(clone.uploadedBy) || clone.uploadedBy;
            }
            return clone;
        });

        const rollbackMessage = `Rolled back to ${historyEntry.version}`;
        const rollbackActivity = {
            projectId,
            userId: userObjectId,
            action: 'rolled-back',
            message: rollbackMessage,
            time: new Date(),
        };
        const { insertedId: activityId } = await Messages.insertOne(rollbackActivity);

        const rollbackHistoryEntry = {
            _id: new ObjectId(),
            version: historyEntry.version,
            message: rollbackMessage,
            createdAt: new Date(),
            userId: userObjectId,
            files: restoredFiles.map((file) => ({ ...file })),
        };

        await Projects.updateOne(
            { _id: projectId },
            {
                $set: {
                    files: restoredFiles,
                    version: historyEntry.version,
                    checkoutStatus: 'checked-in',
                    checkedOutBy: null,
                    lastActivity: Date.now(),
                },
                $push: {
                    activity: activityId,
                    versionHistory: rollbackHistoryEntry,
                },
            }
        );

        const populatedProject = await populateProjectDetail(projectId);
        res.json({
            success: true,
            project: formatProjectDetail(populatedProject),
            message: `Project rolled back to ${historyEntry.version}`,
        });
    } catch (error) {
        console.error('Project rollback error:', error);
        res.status(500).json({ success: false, message: 'Server error while rolling back project' });
    }
});

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

app.get('/api/projects/:id/discussion', async (req, res) => {
    const projectId = toObjectId(req.params.id);
    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Invalid project identifier for discussion' });
    }

    try {
        const discussion = await getDiscussionMessages(projectId);
        res.json({ success: true, discussion });
    } catch (error) {
        console.error('Discussion fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error loading discussion messages' });
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
    const { term, type, limit } = req.query;

    if (!term || !type) {
        return res.status(400).json({ success: false, message: 'Search term and type are required' });
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 100)
        : DEFAULT_SEARCH_LIMIT;

    try {
        const results = await executeSearch(term, type, { limit: safeLimit });
        res.json({ success: true, results });
    } catch (error) {
        if (error.message === 'Unsupported search type') {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Server error during search' });
    }
});

app.get('/api/search/suggest', async (req, res) => {
    const { term, types, limit } = req.query;

    if (!term) {
        return res.json({ success: true, suggestions: [] });
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 30)
        : 10;

    const typeList = typeof types === 'string'
        ? types
              .split(',')
              .map((entry) => entry.trim())
              .filter((entry) => entry)
        : undefined;

    try {
        const suggestions = await executeSuggestions(term, typeList, {
            limit: safeLimit,
            limitPerType: Math.max(2, Math.ceil(safeLimit / ((typeList && typeList.length) || 4))),
            threshold: DEFAULT_SUGGESTION_THRESHOLD,
        });
        res.json({ success: true, suggestions });
    } catch (error) {
        console.error('Search suggestion error:', error);
        res.status(500).json({ success: false, message: 'Server error generating suggestions' });
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
