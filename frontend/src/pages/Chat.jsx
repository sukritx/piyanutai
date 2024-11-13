import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mic, Square, Plus, Trash2 } from "lucide-react";
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';

const Chat = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();
    const { toast } = useToast();

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [chatId, setChatId] = useState(null);
    const [currentAudioBuffer, setCurrentAudioBuffer] = useState(null);
    const [hasPlayed, setHasPlayed] = useState(false);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messageCount, setMessageCount] = useState(0);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const audioSourceRef = useRef(null);
    const audioContextRef = useRef(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/signin');
        }
    }, [isAuthenticated, loading, navigate]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const response = await api.get('/api/v1/chat');
                setChats(response.data);
                if (response.data.length > 0) {
                    setCurrentChatId(response.data[0]._id);
                    setChatId(response.data[0]._id);
                    setMessageCount(response.data[0].messages.length / 2);
                }
            } catch (err) {
                console.error('Error fetching chats:', err);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load chat history"
                });
            }
        };

        if (isAuthenticated) {
            fetchChats();
        }
    }, [isAuthenticated, toast]);

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    const createNewChat = async () => {
        try {
            const response = await api.post('/api/v1/chat');
            const newChat = response.data;
            setChats(prevChats => [newChat, ...prevChats]);
            setCurrentChatId(newChat._id);
            setChatId(newChat._id);
            setMessageCount(0);
            setTranscript('');
            setResponse('');
        } catch (err) {
            console.error('Error creating new chat:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create new chat"
            });
        }
    };

    const startRecording = async () => {
        try {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            console.log('Device is iOS:', isIOS);

            // Basic audio constraints that work on iOS Safari
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            streamRef.current = stream;
            console.log('Got audio stream');

            // Create a new MediaRecorder instance
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            // Data handler
            recorder.ondataavailable = (e) => {
                console.log('Data available event:', e.data.size);
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            // Stop handler
            recorder.onstop = async () => {
                console.log('Recorder stopped');
                const audioBlob = new Blob(chunksRef.current, { 
                    type: isIOS ? 'audio/mp4' : 'audio/webm' 
                });
                console.log('Audio blob created:', audioBlob.size);

                if (audioBlob.size > 0) {
                    // Create a preview URL for debugging
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    console.log('Preview URL created:', audioUrl);

                    try {
                        await sendAudioToServer(audioBlob);
                    } catch (error) {
                        console.error('Send to server failed:', error);
                    } finally {
                        URL.revokeObjectURL(audioUrl);
                    }
                } else {
                    console.error('No audio data recorded');
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "No audio was recorded. Please try again."
                    });
                }

                // Cleanup
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                setIsRecording(false);
            };

            // Error handler
            recorder.onerror = (event) => {
                console.error('Recorder error:', event.error);
                toast({
                    variant: "destructive",
                    title: "Recording Error",
                    description: `Recording failed: ${event.error.message}`
                });
            };

            // Start recording
            recorder.start(1000); // 1-second chunks
            setIsRecording(true);
            console.log('Recording started');

        } catch (err) {
            console.error('Recording setup failed:', err);
            toast({
                variant: "destructive",
                title: "Recording Error",
                description: "Please ensure microphone access is granted and try again"
            });

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsProcessing(true);
            setIsRecording(false);
        }
    };

    const sendAudioToServer = async (audioBlob) => {
        if (!chatId) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No active chat session"
            });
            return;
        }

        try {
            setIsProcessing(true);
            const formData = new FormData();
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            // Create file with timestamp to prevent caching
            const timestamp = Date.now();
            const fileName = isIOS ? `audio_${timestamp}.m4a` : `audio_${timestamp}.webm`;
            const fileType = isIOS ? 'audio/mp4' : 'audio/webm';
            
            const audioFile = new File([audioBlob], fileName, {
                type: fileType,
                lastModified: timestamp
            });
            
            console.log('Sending file:', {
                name: fileName,
                type: fileType,
                size: audioFile.size
            });
            
            formData.append('audioBlob', audioFile);
            formData.append('chatId', chatId);
            formData.append('isIOS', isIOS);

            const response = await api.post('/api/v1/chat/message', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                transformRequest: [(data) => data],
                timeout: 60000 // Increased timeout
            });

            // Update UI with response
            setChats(prevChats => prevChats.map(chat => 
                chat._id === chatId 
                ? { 
                    ...chat, 
                    messages: [
                        ...chat.messages, 
                        { role: 'user', content: response.data.transcription },
                        { role: 'assistant', content: response.data.message }
                    ]
                }
                : chat
            ));

            // Play response audio
            if (response.data.audio) {
                try {
                    const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
                    await audio.play();
                } catch (error) {
                    console.error('Error playing audio:', error);
                }
            }

        } catch (err) {
            console.error('Audio processing error:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to process audio. Please try again."
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const stopAudio = () => {
        try {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            setIsPlaying(false);
        } catch (err) {
            console.error('Error stopping audio:', err);
        }
    };

    const playAudio = async () => {
        if (!currentAudioBuffer || hasPlayed) return;
        
        try {
            stopAudio();

            const audioContext = new AudioContext();
            const source = audioContext.createBufferSource();
            
            const bufferCopy = currentAudioBuffer.slice(0);
            const decodedData = await audioContext.decodeAudioData(bufferCopy);
            
            source.buffer = decodedData;
            source.connect(audioContext.destination);
            
            audioSourceRef.current = source;
            audioContextRef.current = audioContext;

            source.onended = () => {
                setIsPlaying(false);
                setHasPlayed(true);
                stopAudio();
            };

            source.start(0);
            setIsPlaying(true);
        } catch (err) {
            console.error('Error playing audio:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to play audio response"
            });
            setHasPlayed(true);
        }
    };

    const selectChat = (chat) => {
        setCurrentChatId(chat._id);
        setChatId(chat._id);
        setMessageCount(chat.messages.length / 2);
    };

    const deleteChat = async (chatId, e) => {
        e.stopPropagation();

        try {
            await api.delete(`/api/v1/chat/${chatId}`);
            
            setChats(prevChats => prevChats.filter(chat => chat._id !== chatId));
            
            if (currentChatId === chatId) {
                const remainingChats = chats.filter(chat => chat._id !== chatId);
                if (remainingChats.length > 0) {
                    setCurrentChatId(remainingChats[0]._id);
                    setChatId(remainingChats[0]._id);
                    setMessageCount(remainingChats[0].messages.length / 2);
                } else {
                    setCurrentChatId(null);
                    setChatId(null);
                    setMessageCount(0);
                }
            }

            toast({
                title: "Chat deleted",
                description: "Chat history has been removed",
            });
        } catch (err) {
            console.error('Error deleting chat:', err);
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
                        <span className="hidden sm:inline">New Chat</span>
                        <span className="sm:hidden">New</span>
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
                                        onClick={() => selectChat(chat)}
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
                                            <p className="text-sm text-gray-600 line-clamp-2 hidden sm:block">
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
                    {currentChatId ? (
                        <div className="space-y-6">
                            {chats
                                .find(chat => chat._id === currentChatId)
                                ?.messages.map((message, index) => (
                                    <div 
                                        key={index} 
                                        className={cn(
                                            "flex flex-col gap-2",
                                            message.role === 'assistant' ? "items-start" : "items-end"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {message.role === 'assistant' ? (
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                    <span className="text-blue-600 text-sm">AI</span>
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <span className="text-gray-600 text-sm">You</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "max-w-[90%] sm:max-w-[80%] p-3 lg:p-4 rounded-lg",
                                            message.role === 'assistant' 
                                                ? "bg-blue-50 border border-blue-100" 
                                                : "bg-white border border-gray-200"
                                        )}>
                                            <p className="text-gray-700 text-sm lg:text-base">{message.content}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Select a chat or start a new one</p>
                        </div>
                    )}
                </ScrollArea>

                {/* Controls Section */}
                <div className="p-4 lg:p-6 bg-white border-t border-gray-100">
                    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                        {/* Status Text */}
                        <p className={cn(
                            "text-sm font-medium text-center",
                            isProcessing ? "text-blue-600" : 
                            isRecording ? "text-red-500" : 
                            "text-gray-600"
                        )}>
                            {isProcessing ? "Processing your message..." : 
                             isRecording ? "Recording - Click Stop when finished" : 
                             "Click Record to start"}
                        </p>

                        {/* Control Buttons */}
                        <div className="flex gap-4 w-full justify-center">
                            {/* Record Button */}
                            {!isRecording && (
                                <Button
                                    onClick={(e) => {
                                        e.preventDefault(); // Prevent any default behavior
                                        e.stopPropagation(); // Stop event propagation
                                        startRecording();
                                    }}
                                    onTouchStart={(e) => {
                                        e.preventDefault(); // Prevent default touch behavior
                                        e.stopPropagation();
                                    }}
                                    disabled={isProcessing || isRecording}
                                    size="lg"
                                    className="h-12 sm:h-14 px-4 sm:px-6 bg-[#171717] hover:bg-[#2d2d2d] text-white flex items-center gap-2"
                                >
                                    <Mic className="h-5 w-5" />
                                    <span className="hidden sm:inline">Record</span>
                                </Button>
                            )}

                            {/* Stop Button */}
                            {isRecording && (
                                <Button
                                    onClick={stopRecording}
                                    variant="destructive"
                                    size="lg"
                                    className="h-12 sm:h-14 px-4 sm:px-6 flex items-center gap-2"
                                    disabled={isProcessing}
                                >
                                    <Square className="h-5 w-5" />
                                    <span className="hidden sm:inline">Stop</span>
                                </Button>
                            )}
                        </div>

                        {/* Processing Indicator */}
                        {isProcessing && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-medium">Processing...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;