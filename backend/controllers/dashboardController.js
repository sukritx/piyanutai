const User = require('../models/user.model');
const Chat = require('../models/chat.model');

// Get message history for the last N days
exports.getMessageHistory = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get all chats within the date range
        const chats = await Chat.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // Create a map to store messages per day
        const messagesByDay = new Map();
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            messagesByDay.set(d.toISOString().split('T')[0], 0);
        }

        // Count messages for each day
        chats.forEach(chat => {
            chat.messages.forEach(message => {
                const day = message.timestamp.toISOString().split('T')[0];
                if (messagesByDay.has(day)) {
                    messagesByDay.set(day, messagesByDay.get(day) + 1);
                }
            });
        });

        // Convert map to array of objects
        const data = Array.from(messagesByDay.entries()).map(([date, count]) => ({
            date,
            count
        }));

        res.json(data);
    } catch (error) {
        console.error('Message history error:', error);
        res.status(500).json({ message: 'Error fetching message history' });
    }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        // Get total number of users
        const totalUsers = await User.countDocuments();

        // Get today's date (start and end)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get number of chat requests today
        const chatRequestsToday = await Chat.countDocuments({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Get total number of chats
        const totalChats = await Chat.countDocuments();

        // Get number of messages today
        const chatsToday = await Chat.find({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        });
        const messagesToday = chatsToday.reduce((acc, chat) => acc + chat.messages.length, 0);

        // Get average messages per chat
        const allChats = await Chat.find();
        const totalMessages = allChats.reduce((acc, chat) => acc + chat.messages.length, 0);
        const averageMessagesPerChat = totalChats > 0 ? (totalMessages / totalChats).toFixed(2) : 0;

        // Get active users today (users who created chats today)
        const activeUsersToday = await Chat.distinct('user', {
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        }).countDocuments();

        res.json({
            totalUsers,
            chatRequestsToday,
            totalChats,
            messagesToday,
            averageMessagesPerChat,
            activeUsersToday,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
};
