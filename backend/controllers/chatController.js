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
    try {
        const { chatId, message } = req.body;
        
        if (!message) {
            return res.status(400).json({ message: 'No message provided' });
        }

        // Get existing chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Prepare conversation history
        const conversationHistory = [
            { 
                role: "system", 
                content: "You are a helpful expert methodology and nursing educator women assistant created by Piyanut Xuto (ดร. ปิยะนุช ชูโต) who got a PhD in nursing who can communicate fluently in Thai language. Please respond in Thai if the user speaks Thai. เริ่มต้นคำตอบด้วย สวัสดี นี่คือ PiyanutAI" 
            }
        ];

        // Add previous messages
        chat.messages.forEach(msg => {
            conversationHistory.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current message
        conversationHistory.push({
            role: "user",
            content: message
        });

        // Get chat completion
        const modelToUse = process.env.OPENAI_FINE_TUNED_MODEL || "gpt-3.5-turbo";
        const completion = await openai.chat.completions.create({
            model: modelToUse,
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 3000
        });

        const assistantMessage = completion.choices[0].message.content.trim();

        // Save messages to database
        await Chat.findByIdAndUpdate(
            chatId,
            {
                $push: {
                    messages: [
                        { 
                            content: message, 
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
            message: assistantMessage
        });
    } catch (error) {
        logger.error('Error in chat:', error);
        res.status(500).json({ 
            message: 'Error processing message',
            error: error.message 
        });
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