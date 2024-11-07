const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
    createChat, 
    sendMessage, 
    getChats, 
    getChatById 
} = require('../controllers/chatController');

// Configure multer for audio uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
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

module.exports = router; 