import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, X, Minimize2, Maximize2, Bot, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, logError } from '@/lib/errorHandling';
import type { Conversation, Message } from '@/types/schema';

interface ChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AIChatbot({ isOpen, onToggle }: ChatbotProps) {
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get or create conversation
  const { data: conversations, error: conversationError } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    enabled: isOpen,
  });

  // Get messages for current conversation
  const { data: messages, error: messagesError } = useQuery<Message[]>({
    queryKey: ['/api/conversations', currentConversationId, 'messages'],
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/conversations', {
        type: 'support',
        title: 'Zipzy Support Chat',
        status: 'active'
      });
    },
    onSuccess: (data: any) => {
      setCurrentConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/ai/chat', {
        message: content,
        conversationId: currentConversationId
      });
    },
    onSuccess: (data: any) => {
      setInput('');
      // Add AI response to messages
      if (data.response) {
        const aiMessage = {
          id: `ai-${Date.now()}`,
          conversationId: currentConversationId || 'default',
          senderId: 'ai',
          senderType: 'ai' as any,
          content: data.response,
          messageType: 'text' as any,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        queryClient.setQueryData(
          ['/api/conversations', currentConversationId, 'messages'],
          (old: any) => [...(old || []), aiMessage]
        );
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize conversation when chatbot opens
  useEffect(() => {
    if (isOpen && conversations && conversations.length === 0) {
      createConversation.mutate();
    } else if (isOpen && conversations && conversations.length > 0) {
      const supportConversation = conversations.find(c => c.type === 'support' && c.status === 'active');
      if (supportConversation) {
        setCurrentConversationId(supportConversation.id);
      } else {
        createConversation.mutate();
      }
    }
  }, [isOpen, conversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !currentConversationId) return;
    sendMessage.mutate(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg z-50"
        data-testid="chatbot-toggle"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`w-[92vw] sm:w-[420px] bg-black/95 text-gray-100 shadow-2xl border border-gray-800 backdrop-blur ${isMinimized ? 'h-16' : 'h-[70vh] sm:h-[600px]'} transition-all duration-300 rounded-2xl`}>
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-800 bg-black/80 text-white rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">Zipzy AI Assistant</CardTitle>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 text-white hover:bg-gray-800"
              data-testid="chatbot-minimize"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 text-white hover:bg-gray-800"
              data-testid="chatbot-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="flex flex-col h-[calc(70vh-73px)] sm:h-[calc(600px-73px)] p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Welcome message */}
                {(!messages || messages.length === 0) && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                      <Bot className="h-4 w-4 text-gray-300" />
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 max-w-[80vw] sm:max-w-xs">
                      <p className="text-sm text-gray-200">
                        👋 Hi! I'm Zipzy AI, your campus delivery assistant. I can help you with:
                        <br />• Product recommendations
                        <br />• Order tracking
                        <br />• Delivery information
                        <br />• General questions
                        <br />
                        How can I help you today?
                      </p>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.senderType === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                      {message.senderType === 'user' ? (
                        <User className="h-4 w-4 text-gray-300" />
                      ) : (
                        <Bot className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    <div
                      className={`rounded-lg p-3 max-w-[80vw] sm:max-w-xs border ${
                        message.senderType === 'user'
                          ? 'bg-gray-100 text-black border-gray-200'
                          : 'bg-gray-900 text-gray-200 border-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {sendMessage.isPending && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                      <Bot className="h-4 w-4 text-gray-300" />
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce animate-delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce animate-delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-gray-800 p-4 bg-black/80">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={sendMessage.isPending}
                  className="w-full bg-gray-900 border-gray-800 text-gray-100 placeholder:text-gray-500"
                  data-testid="chatbot-input"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMessage.isPending}
                  size="sm"
                  className="bg-gray-100 text-black hover:bg-white"
                  data-testid="chatbot-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default AIChatbot;