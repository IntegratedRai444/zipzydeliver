import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { MapPin, Clock, Package, User, Phone, MessageCircle, CheckCircle, Navigation } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ActiveDelivery {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
    storeName: string;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered';
  acceptedAt: Date;
  pickedUpAt?: Date;
  estimatedDeliveryTime: string;
  currentStep: number;
  totalSteps: number;
}

interface ActiveDeliveryProps {
  delivery: ActiveDelivery;
  onStatusUpdate: (status: string) => void;
  onLocationUpdate: (lat: number, lng: number) => void;
}

export const ActiveDelivery: React.FC<ActiveDeliveryProps> = ({ 
  delivery, 
  onStatusUpdate, 
  onLocationUpdate 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const steps = [
    { id: 'accepted', label: 'Order Accepted', icon: CheckCircle, completed: true },
    { id: 'picked_up', label: 'Picked Up', icon: Package, completed: delivery.status !== 'accepted' },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: Navigation, completed: delivery.status === 'out_for_delivery' || delivery.status === 'delivered' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle, completed: delivery.status === 'delivered' }
  ];

  const getStepColor = (step: any, index: number): string => {
    if (step.completed) return 'bg-green-500 text-white';
    if (index === delivery.currentStep) return 'bg-blue-500 text-white';
    return 'bg-gray-200 text-gray-500';
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      switch (newStatus) {
        case 'picked_up':
          endpoint = `/api/deliveries/${delivery.orderId}/pickup`;
          break;
        case 'out_for_delivery':
          endpoint = `/api/deliveries/${delivery.orderId}/pickup`; // Same endpoint for now
          break;
        case 'delivered':
          endpoint = `/api/deliveries/${delivery.orderId}/complete`;
          break;
        default:
          throw new Error('Invalid status');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        onStatusUpdate(newStatus);
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update status');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(`/api/deliveries/${delivery.orderId}/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ lat: latitude, lng: longitude }),
              credentials: 'include'
            });

            if (response.ok) {
              onLocationUpdate(latitude, longitude);
            } else {
              setError('Failed to update location');
            }
          } catch (error) {
            setError('Failed to update location');
          }
        },
        (error) => {
          setError('Unable to get current location');
        }
      );
    } else {
      setError('Geolocation not supported');
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-yellow-100 text-yellow-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'picked_up': return 'Picked Up';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const canUpdateStatus = (newStatus: string): boolean => {
    switch (delivery.status) {
      case 'accepted':
        return newStatus === 'picked_up';
      case 'picked_up':
        return newStatus === 'out_for_delivery';
      case 'out_for_delivery':
        return newStatus === 'delivered';
      default:
        return false;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Active Delivery</span>
                <Badge variant="outline" className="font-mono">
                  {delivery.orderNumber}
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getStatusBadgeColor(delivery.status)}>
                  {getStatusLabel(delivery.status)}
                </Badge>
                <span className="text-sm text-gray-500">
                  Accepted at {delivery.acceptedAt.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                Est. delivery: {delivery.estimatedDeliveryTime}
              </div>
              <div className="text-xs text-gray-500">
                Step {delivery.currentStep} of {delivery.totalSteps}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={step.id} className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step, index)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.label}</div>
                    {step.completed && (
                      <div className="text-sm text-green-600">Completed</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Progress value={(delivery.currentStep / delivery.totalSteps) * 100} className="mt-4" />
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{delivery.customerName}</span>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{delivery.customerPhone}</span>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Order Items:</div>
                {delivery.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>₹{delivery.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Pickup Location:</div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{delivery.pickupLocation.storeName}</div>
                      <div className="text-sm text-gray-600">{delivery.pickupLocation.address}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Delivery Location:</div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{delivery.customerName}</div>
                      <div className="text-sm text-gray-600">{delivery.deliveryLocation.address}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {canUpdateStatus('picked_up') && (
                <Button
                  onClick={() => handleStatusUpdate('picked_up')}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Mark as Picked Up
                </Button>
              )}

              {canUpdateStatus('out_for_delivery') && (
                <Button
                  onClick={() => handleStatusUpdate('out_for_delivery')}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Delivery
                </Button>
              )}

              {canUpdateStatus('delivered') && (
                <Button
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Delivered
                </Button>
              )}

              <Button
                onClick={handleLocationUpdate}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Update Location
              </Button>

              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat with Customer
              </Button>
            </div>

            {currentLocation && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                Current Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
