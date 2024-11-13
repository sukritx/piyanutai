const Chat = require('../models/chat.model');
const OpenAI = require('openai');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const createChat = async (req, res) => {
    try {
        const chat = await Chat.create({
            user: req.user.id,
            messages: []
        });
        res.status(201).json(chat);
    } catch (error) {
        logger.error('Error creating chat:', error);
        res.status(500).json({ message: 'Error creating chat session' });
    }
};

const sendMessage = async (req, res) => {
    const tempFilePath = path.join(__dirname, '..', 'temp', `${Date.now()}.webm`);
    
    try {
        const { chatId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file provided' });
        }

        // Get existing chat and messages
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Log the file details for debugging
        logger.info('Received audio file:', {
            mimetype: req.file.mimetype,
            size: req.file.size,
            originalName: req.file.originalname
        });

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write buffer to temporary file with appropriate extension
        const fileExtension = req.file.mimetype.includes('mp4') ? '.m4a' : '.webm';
        const tempFilePath = path.join(tempDir, `${Date.now()}${fileExtension}`);
        
        fs.writeFileSync(tempFilePath, req.file.buffer);

        // Get transcription with explicit mime type
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
            language: "th",
            response_format: "text"
        });

        const userMessage = transcription;

        // Prepare conversation history
        const conversationHistory = [
            { 
                role: "system", 
                content: "You are a helpful girl assistant who can communicate fluently in Thai language. Please respond in Thai if the user speaks Thai. เริ่มต้นคำตอบด้วย สวัสดี นี่คือ PiyanutAI" 
            }
        ];

        // Add all previous messages to maintain full context
        chat.messages.forEach(msg => {
            conversationHistory.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current user message
        conversationHistory.push({
            role: "user",
            content: userMessage
        });

        // Use default model if fine-tuned model is not set
        const modelToUse = process.env.OPENAI_FINE_TUNED_MODEL || "gpt-3.5-turbo";

        // Get chat completion with conversation history
        const completion = await openai.chat.completions.create({
            model: modelToUse,
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 3000
        });

        // Clean up the assistant message
        const assistantMessage = completion.choices[0].message.content
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\_\_/g, '')
            .replace(/\_/g, '')
            .replace(/\#\#/g, '')
            .replace(/\#/g, '')
            .trim();

        // Convert to speech
        const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: assistantMessage,
            speed: 1.0,
        });

        const audioData = Buffer.from(await speechResponse.arrayBuffer());

        // Save messages to database
        await Chat.findByIdAndUpdate(
            chatId,
            {
                $push: {
                    messages: [
                        { 
                            content: userMessage, 
                            role: 'user' 
                        },
                        { 
                            content: assistantMessage, 
                            role: 'assistant'
                        }
                    ]
                }
            }
        );

        res.json({
            message: assistantMessage,
            audio: audioData.toString('base64'),
            transcription: userMessage
        });
    } catch (error) {
        logger.error('Error in chat:', error);
        res.status(500).json({ 
            message: 'Error processing chat message',
            error: error.message 
        });
    } finally {
        // Clean up temporary files
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.user.id })
            .sort({ updatedAt: -1 })
            .select('messages createdAt updatedAt')
            .lean();

        // Format dates and clean up data
        const formattedChats = chats.map(chat => ({
            ...chat,
            messages: chat.messages.map(message => ({
                ...message,
                createdAt: message.timestamp || chat.createdAt
            }))
        }));

        res.json(formattedChats);
    } catch (error) {
        logger.error('Error fetching chats:', error);
        res.status(500).json({ message: 'Error fetching chats' });
    }
};

const getChatById = async (req, res) => {
    try {
        const chat = await Chat.findOne({
            _id: req.params.id,
            user: req.user.id
        });
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        res.json(chat);
    } catch (error) {
        logger.error('Error fetching chat:', error);
        res.status(500).json({ message: 'Error fetching chat' });
    }
};

const deleteChat = async (req, res) => {
    try {
        const { id } = req.params;
        
        const chat = await Chat.findOne({
            _id: id,
            user: req.user.id
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await Chat.deleteOne({ _id: id });
        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        logger.error('Error deleting chat:', error);
        res.status(500).json({ message: 'Error deleting chat' });
    }
};

module.exports = {
    createChat,
    sendMessage,
    getChats,
    getChatById,
    deleteChat
}; 