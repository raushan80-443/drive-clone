const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = 5000;
const SECRET = process.env.JWT_SECRET || 'jwt-secret';

// Connect to MongoDB
mongoose.connect('mongodb://mongo:27017/drive-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  // Create default admin user if it doesn't exist
  try {
    const adminEmail = 'admin@example.com';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      const adminUser = new User({
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('Default admin user created');
      
      // Create admin's upload directory
      ensureUserUploadDir(adminUser._id);
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalname: { type: String, required: true },
  mimetype: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Create user-specific upload directories
const ensureUserUploadDir = (userId) => {
  const userDir = path.join(uploadsDir, userId.toString());
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const { userId } = jwt.verify(token, SECRET);
      const userDir = ensureUserUploadDir(userId);
      cb(null, userDir);
    } catch (error) {
      cb(new Error('Authentication failed'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Add file type restrictions if needed
    cb(null, true);
  }
});

// Validation middleware
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
    .withMessage('Password must contain at least one letter and one number')
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
app.post('/api/auth/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email already registered',
        errors: ['This email address is already in use. Please use a different email or try logging in.']
      });
    }

    // Validate password strength
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(password)) {
      return res.status(400).json({
        message: 'Invalid password format',
        errors: ['Password must be at least 6 characters long and contain both letters and numbers']
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Create user's upload directory
    try {
      ensureUserUploadDir(user._id);
    } catch (dirError) {
      console.error('Error creating user directory:', dirError);
      // Continue even if directory creation fails
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already registered',
        errors: ['This email address is already in use. Please use a different email or try logging in.']
      });
    }

    res.status(500).json({ 
      message: 'Server error during registration',
      errors: [process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred. Please try again.']
    });
  }
});

app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        message: 'Invalid credentials',
        errors: ['Invalid email or password']
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ 
        message: 'Invalid credentials',
        errors: ['Invalid email or password']
      });
    }

    // Generate token with admin status
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        isAdmin: user.isAdmin 
      }, 
      SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      errors: [process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred']
    });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('Uploaded file details:', req.file); // Debug log

    const file = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      path: req.file.path,
      size: req.file.size,
      user: req.user.userId
    });

    await file.save();
    console.log('Saved file to database:', file); // Debug log

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        _id: file._id,
        id: file._id,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        path: file.path
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const files = await File.find({ user: req.user.userId })
      .select('_id filename originalname mimetype size createdAt')
      .sort({ createdAt: -1 });
    console.log('Sending files to client:', files); // Debug log
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    // Get token from either header or query parameter
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) {
      console.log('No token provided for file access'); // Debug log
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, SECRET);
    const userId = decoded.userId;

    console.log('Fetching file with ID:', req.params.id); // Debug log

    const file = await File.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!file) {
      console.log('File not found in database for ID:', req.params.id); // Debug log
      return res.status(404).json({ message: 'File not found' });
    }

    console.log('File found in database:', file); // Debug log

    // Check if file exists
    if (!fs.existsSync(file.path)) {
      console.error('File not found at path:', file.path); // Debug log
      return res.status(404).json({ message: 'File not found on server' });
    }

    console.log('File exists at path:', file.path); // Debug log

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalname}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error serving file' });
    }
  }
});

app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file from filesystem
    fs.unlinkSync(file.path);
    
    // Delete file record from database
    await file.deleteOne();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});