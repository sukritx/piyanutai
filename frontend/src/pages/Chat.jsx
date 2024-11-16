import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from "@/components/ui/textarea";

const Chat = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();
    const { toast } = useToast();

    const [isProcessing, setIsProcessing] = useState(false);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [chatId, setChatId] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/signin');
        } else if (isAuthenticated) {
            const fetchChats = async () => {
                try {
                    const response = await api.get('/api/v1/chat');
                    setChats(response.data);
                    
                    if (response.data.length === 0) {
                        const newChatResponse = await api.post('/api/v1/chat');
                        const newChat = newChatResponse.data;
                        setChats([newChat]);
                        setCurrentChatId(newChat._id);
                        setChatId(newChat._id);
                    } else {
                        setCurrentChatId(response.data[0]._id);
                        setChatId(response.data[0]._id);
                    }
                } catch (err) {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to initialize chat"
                    });
                }
            };

            fetchChats();
        }
    }, [isAuthenticated, loading, navigate, toast]);

    const sendMessage = async () => {
        if (!chatId || !message.trim()) {
            return;
        }

        try {
            setIsProcessing(true);
            const response = await api.post('/api/v1/chat/message', {
                chatId,
                message: message.trim()
            });

            setChats(prevChats => prevChats.map(chat => 
                chat._id === chatId 
                ? { 
                    ...chat, 
                    messages: [
                        ...chat.messages, 
                        { role: 'user', content: message.trim() },
                        { role: 'assistant', content: response.data.message }
                    ]
                }
                : chat
            ));

            setMessage('');
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send message"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const createNewChat = async () => {
        try {
            const response = await api.post('/api/v1/chat');
            const newChat = response.data;
            setChats(prevChats => [newChat, ...prevChats]);
            setCurrentChatId(newChat._id);
            setChatId(newChat._id);
            setMessage('');
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create new chat"
            });
        }
    };

    const selectChat = (selectedChatId) => {
        setCurrentChatId(selectedChatId);
        setChatId(selectedChatId);
        setMessage('');
    };

    const deleteChat = async (chatIdToDelete, e) => {
        e.stopPropagation();

        try {
            await api.delete(`/api/v1/chat/${chatIdToDelete}`);
            
            setChats(prevChats => prevChats.filter(chat => chat._id !== chatIdToDelete));
            
            if (currentChatId === chatIdToDelete) {
                const remainingChats = chats.filter(chat => chat._id !== chatIdToDelete);
                if (remainingChats.length > 0) {
                    setCurrentChatId(remainingChats[0]._id);
                    setChatId(remainingChats[0]._id);
                } else {
                    setCurrentChatId(null);
                    setChatId(null);
                }
            }

            toast({
                title: "Success",
                description: "Chat deleted successfully"
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete chat"
            });
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col lg:flex-row items-stretch w-full max-w-6xl mx-auto">
            {/* Sidebar */}
            <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
                <div className="p-4 border-b border-gray-200">
                    <Button
                        onClick={createNewChat}
                        className="w-full flex items-center gap-2 bg-[#171717] hover:bg-[#2d2d2d]"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Chat</span>
                    </Button>
                </div>
                <ScrollArea className="h-48 lg:h-[calc(100vh-8rem)]">
                    <div className="p-2 space-y-2">
                        {chats.map((chat) => {
                            const lastMessage = chat.messages[chat.messages.length - 1];
                            const preview = lastMessage ? lastMessage.content.slice(0, 50) + '...' : 'New Chat';
                            const isSelected = chat._id === currentChatId;

                            return (
                                <div
                                    key={chat._id}
                                    className="group relative"
                                >
                                    <Button
                                        variant={isSelected ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start text-left p-3 space-y-1 h-auto pr-12",
                                            isSelected && "bg-blue-50"
                                        )}
                                        onClick={() => selectChat(chat._id)}
                                    >
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <span className="text-xs text-gray-500">
                                                    {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                                                </span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {chat.messages.length / 2}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {preview}
                                            </p>
                                        </div>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "absolute right-2 top-1/2 -translate-y-1/2",
                                            "opacity-0 group-hover:opacity-100 transition-opacity",
                                            "h-8 w-8 text-gray-500 hover:text-red-500"
                                        )}
                                        onClick={(e) => deleteChat(chat._id, e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white min-h-[50vh] lg:min-h-0">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700 text-center lg:text-left">
                        Chat with PiyanutAI
                    </h2>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4 lg:p-6 bg-gray-50">
                    {currentChatId && chats.find(chat => chat._id === currentChatId)?.messages.map((message, index) => (
                        <div 
                            key={index} 
                            className={cn(
                                "flex flex-col gap-2 mb-4",
                                message.role === 'assistant' ? "items-start" : "items-end"
                            )}
                        >
                            <div className={cn(
                                "max-w-[90%] sm:max-w-[80%] p-3 lg:p-4 rounded-lg",
                                message.role === 'assistant' 
                                    ? "bg-blue-50 border border-blue-100" 
                                    : "bg-white border border-gray-200"
                            )}>
                                <p className="text-gray-700 text-sm lg:text-base whitespace-pre-wrap">
                                    {message.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={isProcessing || !message.trim()}
                            className="bg-[#171717] hover:bg-[#2d2d2d]"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;