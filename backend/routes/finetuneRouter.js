const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
    uploadTrainingFile, 
    createFineTune, 
    getFineTuneStatus 
} = require('../controllers/finetuneController');

const router = express.Router();

// Configure multer for file upload
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        // Only accept .jsonl files
        if (file.originalname.endsWith('.jsonl')) {
            cb(null, true);
        } else {
            cb(new Error('Only .jsonl files are allowed'));
        }
    }
});

// Protect all routes
router.use(authenticateToken);

// Routes
router.post('/upload', upload.single('file'), uploadTrainingFile);
router.post('/create', createFineTune);
router.get('/status/:jobId', getFineTuneStatus);

module.exports = router; 