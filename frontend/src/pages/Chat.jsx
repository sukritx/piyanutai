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

            // Request microphone permission first
            const permissionResult = await navigator.permissions.query({ name: 'microphone' });
            console.log('Microphone permission status:', permissionResult.state);

            // Basic audio constraints that work well with iOS Safari
            const constraints = {
                audio: true,
                video: false
            };

            console.log('Requesting media with constraints:', constraints);

            // Get audio stream
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            console.log('Got media stream:', stream.getTracks());

            let recorder;
            if (isIOS) {
                // For iOS, let the browser choose the format
                recorder = new MediaRecorder(stream);
                console.log('Created iOS recorder with default settings');
            } else {
                // For other browsers, specify webm
                recorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                console.log('Created non-iOS recorder with webm format');
            }

            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                console.log('Data available:', e.data.size, 'bytes');
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onerror = (e) => {
                console.error('Recorder error:', e.error);
                toast({
                    variant: "destructive",
                    title: "Recording Error",
                    description: `Recording failed: ${e.error.message}`
                });
                stopRecording();
            };

            recorder.onstop = async () => {
                console.log('Recorder stopped');
                try {
                    const audioBlob = new Blob(chunksRef.current, {
                        type: isIOS ? 'audio/mp4' : 'audio/webm'
                    });

                    console.log('Created blob:', {
                        size: audioBlob.size,
                        type: audioBlob.type
                    });

                    if (audioBlob.size > 0) {
                        await sendAudioToServer(audioBlob);
                    } else {
                        throw new Error('No audio data recorded');
                    }
                } catch (error) {
                    console.error('Error processing recording:', error);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to process recording. Please try again."
                    });
                } finally {
                    stream.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                    setIsRecording(false);
                }
            };

            // Start recording with a very small timeslice for iOS
            recorder.start(10);
            setIsRecording(true);
            console.log('Recording started');

        } catch (err) {
            console.error('Recording setup failed:', err);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            let errorMessage = "Failed to start recording. ";
            if (err.name === 'NotAllowedError') {
                errorMessage += "Please grant microphone permission in your browser settings.";
            } else if (err.name === 'NotFoundError') {
                errorMessage += "No microphone found.";
            } else {
                errorMessage += isIOS 
                    ? "Please ensure Safari is being used and microphone access is granted in Settings."
                    : "Please check microphone permissions.";
            }

            toast({
                variant: "destructive",
                title: "Recording Error",
                description: errorMessage
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
                description: "No active chat session. Please start a new chat."
            });
            return;
        }

        try {
            const formData = new FormData();
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            // For iOS, try to create an audio file with a more compatible format
            const fileName = isIOS ? `audio_${Date.now()}.m4a` : `audio_${Date.now()}.webm`;
            const fileType = isIOS ? 'audio/mp4' : 'audio/webm';
            
            // Create a new blob with the correct type if needed
            const processedBlob = isIOS ? new Blob([audioBlob], { type: 'audio/mp4' }) : audioBlob;
            
            const audioFile = new File([processedBlob], fileName, {
                type: fileType,
                lastModified: Date.now()
            });
            
            console.log('Sending audio file:', {
                name: audioFile.name,
                type: audioFile.type,
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
            });

            setTranscript(response.data.transcription);
            setResponse(response.data.message);

            // Update the chat messages in real-time
            setChats(prevChats => prevChats.map(chat => 
                chat._id === chatId 
                ? { ...chat, messages: [...chat.messages, { role: 'user', content: response.data.transcription }, { role: 'assistant', content: response.data.message }] }
                : chat
            ));

            const binaryString = window.atob(response.data.audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBuffer = bytes.buffer;
            setCurrentAudioBuffer(audioBuffer);
            setHasPlayed(false);

            const audioContext = new AudioContext();
            const source = audioContext.createBufferSource();
            
            const decodedData = await audioContext.decodeAudioData(audioBuffer.slice(0));
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

            setMessageCount(prev => prev + 1);
        } catch (err) {
            console.error('Audio processing error:', err);
            if (err.response) {
                console.error('Server response:', err.response.data);
            }
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