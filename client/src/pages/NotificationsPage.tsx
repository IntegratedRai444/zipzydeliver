import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  Filter,
  Check,
  Trash2,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

const notificationTypes = [
  { value: 'all', label: 'All Notifications', icon: Bell },
  { value: 'order_placed', label: 'Order Placed', icon: Package },
  { value: 'order_accepted', label: 'Order Accepted', icon: CheckCircle },
  { value: 'order_preparing', label: 'Preparing', icon: Package },
  { value: 'order_out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { value: 'order_delivered', label: 'Delivered', icon: CheckCircle },
  { value: 'order_cancelled', label: 'Cancelled', icon: AlertCircle },
  { value: 'order_rejected', label: 'Rejected', icon: AlertCircle },
  { value: 'location_update', label: 'Location Updates', icon: Truck },
  { value: 'partner_matched', label: 'Partner Matched', icon: MessageCircle },
];

const notificationIcons = {
  order_placed: Package,
  order_accepted: CheckCircle,
  order_preparing: Package,
  order_out_for_delivery: Truck,
  order_delivered: CheckCircle,
  order_cancelled: AlertCircle,
  order_rejected: AlertCircle,
  location_update: Truck,
  partner_matched: MessageCircle,
  default: Bell
};

const notificationColors = {
  order_placed: 'text-blue-600',
  order_accepted: 'text-green-600',
  order_preparing: 'text-orange-600',
  order_out_for_delivery: 'text-purple-600',
  order_delivered: 'text-green-600',
  order_cancelled: 'text-red-600',
  order_rejected: 'text-red-600',
  location_update: 'text-blue-600',
  partner_matched: 'text-green-600',
  default: 'text-gray-600'
};

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [showRead, setShowRead] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      return response.notifications || [];
    },
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('POST', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n: any) => !n.isRead);
      await Promise.all(
        unreadNotifications.map((n: any) => 
          apiRequest('POST', `/api/notifications/${n.id}/read`)
        )
      );
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Filter notifications based on selected type and read status
  const filteredNotifications = notifications.filter((notification: any) => {
    const typeMatch = selectedType === 'all' || notification.type === selectedType;
    const readMatch = showRead || !notification.isRead;
    return typeMatch && readMatch;
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const filteredUnreadCount = filteredNotifications.filter((n: any) => !n.isRead).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.data?.orderId) {
      // Navigate to order tracking
      window.location.href = `/orders/${notification.data.orderId}/tracking`;
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getNotificationIcon = (type: string) => {
    const IconComponent = notificationIcons[type as keyof typeof notificationIcons] || notificationIcons.default;
    return <IconComponent className="w-5 h-5" />;
  };

  const getNotificationColor = (type: string) => {
    return notificationColors[type as keyof typeof notificationColors] || notificationColors.default;
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'order_delivered':
      case 'order_accepted':
      case 'partner_matched':
        return 'default';
      case 'order_cancelled':
      case 'order_rejected':
        return 'destructive';
      case 'order_out_for_delivery':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups: any, notification: any) => {
    const date = formatDate(notification.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Bell className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stay updated with your order status and delivery updates
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{unreadCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length - unreadCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show/Hide Read Toggle */}
                <Button
                  variant={showRead ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRead(!showRead)}
                >
                  {showRead ? "Hide Read" : "Show Read"}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {filteredUnreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {markAllAsReadMutation.isPending ? "Marking..." : `Mark ${filteredUnreadCount} Read`}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {Object.keys(groupedNotifications).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">
                  {date}
                </h2>
                <div className="space-y-3">
                  {(dateNotifications as any[]).map((notification: any) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        notification.isRead 
                          ? 'bg-white dark:bg-gray-800' 
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium ${
                                  notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
                                }`}>
                                  {notification.title}
                                </h3>
                                <Badge variant={getNotificationBadgeVariant(notification.type)}>
                                  {notification.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                                <span className="text-xs text-gray-500">
                                  {formatTime(notification.createdAt)}
                                </span>
                              </div>
                            </div>
                            <p className={`text-sm ${
                              notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.message}
                            </p>
                            {notification.data?.orderId && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  Order #{notification.data.orderId.slice(0, 8)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notifications found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedType === 'all' 
                  ? "You don't have any notifications yet" 
                  : `No ${selectedType.replace('_', ' ')} notifications found`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
