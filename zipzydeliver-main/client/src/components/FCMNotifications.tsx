import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, Package, MapPin, Clock } from 'lucide-react';

interface FCMNotificationsProps {
  partnerId: string;
}

export const FCMNotifications: React.FC<FCMNotificationsProps> = ({ partnerId }) => {
  const [fcmToken, setFcmToken] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Mock FCM token
    setFcmToken('fcm_token_mock_' + Math.random().toString(36).substr(2, 9));
    
    // Mock notifications
    setNotifications([
      {
        id: 'notif_1',
        type: 'new_order',
        title: 'New Order Available',
        body: 'Order #ZP001 is available for pickup',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        data: { orderId: 'order_1', distance: '0.8km' }
      },
      {
        id: 'notif_2',
        type: 'order_update',
        title: 'Order Status Updated',
        body: 'Order #ZP002 has been completed',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        data: { orderId: 'order_2', status: 'completed' }
      }
    ]);
  }, []);

  const handleSubscribeToNotifications = async () => {
    try {
      // Mock FCM subscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubscribed(true);
      console.log('Subscribed to FCM notifications');
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
    }
  };

  const handleUnsubscribeFromNotifications = async () => {
    try {
      // Mock FCM unsubscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubscribed(false);
      console.log('Unsubscribed from FCM notifications');
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      // Mock sending test notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Push Notifications</span>
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FCM Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">FCM Token</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={fcmToken}
              readOnly
              aria-label="FCM Token"
              className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(fcmToken)}
            >
              Copy
            </Button>
          </div>
        </div>

        {/* Subscription Controls */}
        <div className="flex space-x-3">
          {!isSubscribed ? (
            <Button onClick={handleSubscribeToNotifications} className="bg-blue-600 hover:bg-blue-700">
              <Bell className="h-4 w-4 mr-2" />
              Subscribe to Notifications
            </Button>
          ) : (
            <Button onClick={handleUnsubscribeFromNotifications} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50">
              <Bell className="h-4 w-4 mr-2" />
              Unsubscribe
            </Button>
          )}
          
          <Button onClick={sendTestNotification} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
            Send Test Notification
          </Button>
        </div>

        {/* Recent Notifications */}
        <div className="space-y-3">
          <h3 className="font-medium">Recent Notifications</h3>
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                {notification.type === 'new_order' ? (
                  <Package className="h-4 w-4 text-blue-600" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{notification.title}</div>
                <div className="text-sm text-gray-600">{notification.body}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {notification.timestamp.toLocaleString()}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {notification.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
