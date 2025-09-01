import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { ArrowLeft, Send, User, Truck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/types/schema';

export function DeliveryChat() {
  const [, params] = useRoute('/chat/delivery/:orderId');
  const [, setLocation] = useLocation();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orderId = params?.orderId;

  // Get delivery messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/deliveries', orderId, 'messages'],
    enabled: !!orderId,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/deliveries/${orderId}/messages`, {
        content,
        messageType: 'text'
      });
    },
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ 
        queryKey: ['/api/deliveries', orderId, 'messages'] 
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64 mb-8"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/orders/${orderId}`)}
            className="p-2"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Chat</h1>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center space-x-2">
              <span>Chat with your delivery partner</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">No messages yet</h3>
                    <p className="text-sm text-gray-500">Start a conversation with your delivery partner!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 ${
                        message.senderType === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {message.senderType === 'user' ? (
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 max-w-xs ${
                          message.senderType === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.createdAt ? new Date(message.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'now'}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading indicator */}
                {sendMessage.isPending && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="bg-indigo-600 text-white rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message to delivery partner..."
                  disabled={sendMessage.isPending}
                  className="flex-1"
                  data-testid="message-input"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMessage.isPending}
                  size="sm"
                  data-testid="send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DeliveryChat;