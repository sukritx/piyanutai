const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
    createChat, 
    sendMessage, 
    getChats, 
    getChatById, 
    deleteChat 
} = require('../controllers/chatController');

// Configure multer for audio uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept both webm and mp4 audio
        if (file.mimetype === 'audio/webm' || 
            file.mimetype === 'audio/mp4' || 
            file.mimetype === 'audio/m4a' ||
            file.mimetype === 'audio/x-m4a') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
}).single('audioBlob');

const router = express.Router();

router.use(authenticateToken);

router.post('/', createChat);

// Handle file upload and errors
router.post('/message', (req, res, next) => {
    console.log('Received request body:', req.body);
    console.log('Received headers:', req.headers);
    
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Unknown upload error:', err);
            return res.status(500).json({ message: `Upload error: ${err.message}` });
        }
        
        console.log('File received:', req.file);
        console.log('Body after upload:', req.body);
        
        next();
    });
}, sendMessage);

router.get('/', getChats);
router.get('/:id', getChatById);
router.delete('/:id', authenticateToken, deleteChat);

module.exports = router; 