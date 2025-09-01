import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Package, CheckCircle, XCircle, Clock, Truck } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export default function Inbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const responseData = await apiRequest('GET', '/api/notifications');
      if (responseData.success) {
        setNotifications(responseData.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiRequest('POST', `/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'order_accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'order_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'order_delivered':
        return <Truck className="w-5 h-5 text-purple-500" />;
      case 'payment_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return <Badge variant="secondary">New Order</Badge>;
      case 'order_accepted':
        return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
      case 'order_rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'order_delivered':
        return <Badge variant="default" className="bg-purple-500">Delivered</Badge>;
      case 'payment_completed':
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Notifications</h3>
          <p className="text-gray-500">You're all caught up! Check back later for updates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Inbox</h2>
        <Button 
          onClick={fetchNotifications}
          variant="outline"
          size="sm"
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`glass-card transition-all hover:shadow-lg ${
              !notification.isRead ? 'ring-2 ring-purple-500/20' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {notification.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(notification.type)}
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {!notification.isRead && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                        size="sm"
                        variant="ghost"
                        className="text-purple-600 hover:text-purple-700"
                      >
                        Mark as read
                      </Button>
                    )}
                    
                    {notification.data?.orderId && (
                      <Badge variant="outline" className="text-xs">
                        Order #{notification.data.orderId.slice(0, 8)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
