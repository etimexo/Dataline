
import React, { useState, useRef, useEffect } from 'react';
import type { Dataset, MLModel, ChatMessage, ChartConfig } from '../types';
import { getAIResponse, generateChartConfigFromAI } from '../services/geminiService';
import Button from './ui/Button';
import { SendIcon, BrainIcon, BoltIcon, ThumbUpIcon, ThumbDownIcon } from './ui/Icons';
import Markdown from 'react-markdown';

interface ChatInterfaceProps {
    dataset: Dataset;
    model: MLModel | null;
    messages: ChatMessage[];
    setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    onNewChart: (chart: ChartConfig) => void;
}

const ChatMessageBubble: React.FC<{ 
    message: ChatMessage; 
    onFeedback: (id: string, type: 'up' | 'down') => void;
}> = ({ message, onFeedback }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white flex-shrink-0 text-xs shadow-sm">
                    AI
                </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[85%]`}>
                <div className={`p-3.5 rounded-2xl text-sm shadow-sm ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'}`}>
                     {message.isTyping ? 
                        (<div className="flex items-center space-x-1 h-5">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        </div>) :
                        (<div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                            <Markdown>{message.text}</Markdown>
                        </div>)
                    }
                </div>
                {!isUser && !message.isTyping && (
                    <div className="flex gap-2 ml-1">
                        <button 
                            onClick={() => onFeedback(message.id, 'up')} 
                            className={`transition-colors ${message.feedback === 'up' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Helpful"
                        >
                            <ThumbUpIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => onFeedback(message.id, 'down')} 
                            className={`transition-colors ${message.feedback === 'down' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Not Helpful"
                        >
                            <ThumbDownIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ dataset, model, messages, setMessages, onNewChart }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    // Initial Greeting logic handled in App.tsx now to prevent duplicates during persistence loading

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    };

    const handleFeedback = (messageId: string, type: 'up' | 'down') => {
        // Log feedback (in a real app, this would send to an analytics service)
        const message = messages.find(m => m.id === messageId);
        console.log(`[Feedback] User rated message "${messageId}" as ${type}. Content: "${message?.text.substring(0, 50)}..."`);
        
        // Update local state to show selection
        setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, feedback: type } : msg
        ));
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
        
        // Optimistic update
        setMessages(prev => [...prev, userMessage, { id: 'typing', sender: 'ai', text: '', isTyping: true }]);
        
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsLoading(true);

        try {
            const chartIntentRegex = /chart|plot|graph|visualize|histogram|scatter/i;
            if (chartIntentRegex.test(input) && !isThinkingMode) {
                const chartConfig = await generateChartConfigFromAI(input, dataset);
                if (chartConfig) {
                    onNewChart(chartConfig);
                    const aiResponse: ChatMessage = {
                        id: Date.now().toString() + '-ai',
                        sender: 'ai',
                        text: `I've created a "**${chartConfig.title}**" (${chartConfig.type} chart) and added it to your dashboard.`
                    };
                    setMessages(prev => [...prev.filter(m => !m.isTyping), aiResponse]);
                } else {
                     const aiText = await getAIResponse(input, messages, dataset, model, isThinkingMode);
                     const aiResponse: ChatMessage = {
                        id: Date.now().toString() + '-ai',
                        sender: 'ai',
                        text: aiText
                    };
                    setMessages(prev => [...prev.filter(m => !m.isTyping), aiResponse]);
                }
            } else {
                 const aiText = await getAIResponse(input, messages, dataset, model, isThinkingMode);
                 const aiResponse: ChatMessage = {
                    id: Date.now().toString() + '-ai',
                    sender: 'ai',
                    text: aiText
                };
                setMessages(prev => [...prev.filter(m => !m.isTyping), aiResponse]);
            }
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = {
                id: Date.now().toString() + '-error',
                sender: 'ai',
                text: "Sorry, I encountered an error. Please try again."
            };
            setMessages(prev => [...prev.filter(m => !m.isTyping), errorMessage]);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 bg-gray-900 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
                {messages.length === 0 && (
                    <div className="text-gray-500 text-center mt-10 text-sm">
                        Start the conversation...
                    </div>
                )}
                {messages.map((msg) => (
                    <ChatMessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onFeedback={handleFeedback}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t border-gray-700 bg-gray-800">
                <div className="flex items-end gap-2 bg-gray-900 rounded-xl p-2 border border-gray-700 shadow-inner focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                    <button
                        onClick={() => setIsThinkingMode(!isThinkingMode)}
                        className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 min-w-[50px] ${
                            isThinkingMode 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                        }`}
                        title={isThinkingMode ? "Thinking Mode: On (Slower, deeper reasoning)" : "Fast Mode: On (Quick responses)"}
                    >
                        {isThinkingMode ? <BrainIcon className="w-4 h-4" /> : <BoltIcon className="w-4 h-4" />}
                        <span className="text-[10px] font-medium leading-none">
                            {isThinkingMode ? "Deep" : "Fast"}
                        </span>
                    </button>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            model 
                            ? `Ask about "${model.target}"...` 
                            : "Ask a question about your data..."
                        }
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-white text-sm placeholder-gray-500 py-2.5 max-h-32 leading-relaxed"
                        rows={1}
                        disabled={isLoading}
                    />
                    <Button 
                        onClick={handleSubmit} 
                        isLoading={isLoading} 
                        disabled={!input.trim()} 
                        className={`!p-2 rounded-full self-center mb-0.5 transition-all ${input.trim() ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-700 text-gray-500'}`}
                    >
                        <SendIcon className="w-5 h-5" />
                    </Button>
                </div>
                <div className="text-[10px] text-gray-500 mt-2 text-center">
                    AI can make mistakes. Review generated insights.
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
