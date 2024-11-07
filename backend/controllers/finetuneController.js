const OpenAI = require('openai');
const fs = require('fs');
const logger = require('../utils/logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const uploadTrainingFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload the file to OpenAI
        const response = await openai.files.create({
            file: fs.createReadStream(req.file.path),
            purpose: 'fine-tune'
        });

        // Delete the temporary file
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            message: 'File uploaded successfully',
            fileId: response.id
        });
    } catch (error) {
        logger.error('Error uploading training file:', error);
        res.status(500).json({ message: error.message });
    }
};

const createFineTune = async (req, res) => {
    try {
        const { fileId, model = "gpt-4o-mini-2024-07-18" } = req.body;

        const fineTune = await openai.fineTuning.jobs.create({
            training_file: fileId,
            model: model
        });

        res.status(200).json({
            message: 'Fine-tuning job created',
            jobId: fineTune.id
        });
    } catch (error) {
        logger.error('Error creating fine-tune:', error);
        res.status(500).json({ message: error.message });
    }
};

const getFineTuneStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const fineTune = await openai.fineTuning.jobs.retrieve(jobId);

        res.status(200).json(fineTune);
    } catch (error) {
        logger.error('Error getting fine-tune status:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    uploadTrainingFile,
    createFineTune,
    getFineTuneStatus
}; 