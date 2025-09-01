import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  deliveryAddress: string;
  phone: string;
  estimatedDeliveryTime: number;
  createdAt: string;
  orderItems: Array<{
    id: string;
    quantity: number;
    price: string;
    product: {
      id: string;
      name: string;
    };
  }>;
}

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const statusSteps = [
  { key: "placed", label: "Order Placed", icon: "📝" },
  { key: "accepted", label: "Order Accepted", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
  { key: "delivered", label: "Delivered", icon: "🎉" }
];

const statusColors: Record<string, string> = {
  "placed": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "accepted": "bg-blue-100 text-blue-800 border-blue-200",
  "preparing": "bg-orange-100 text-orange-800 border-orange-200",
  "out_for_delivery": "bg-purple-100 text-purple-800 border-purple-200",
  "delivered": "bg-green-100 text-green-800 border-green-200",
  "cancelled": "bg-red-100 text-red-800 border-red-200"
};

export default function OrderStatusModal({ isOpen, onClose, order }: OrderStatusModalProps) {
  if (!order) return null;

  const currentStatusIndex = statusSteps.findIndex(step => step.key === order.status);
  const statusColor = statusColors[order.status] || statusColors.placed;

  const getEstimatedDeliveryTime = () => {
    const orderTime = new Date(order.createdAt);
    const estimatedTime = new Date(orderTime.getTime() + order.estimatedDeliveryTime * 60000);
    return estimatedTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center" data-testid="text-order-modal-title">
            Order #{order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="text-center">
            <Badge variant="outline" className={`${statusColor} text-sm px-3 py-1`} data-testid="badge-current-status">
              {statusSteps.find(step => step.key === order.status)?.label || order.status}
            </Badge>
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <p className="text-sm text-muted-foreground mt-2">
                Estimated delivery: {getEstimatedDeliveryTime()}
              </p>
            )}
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <div key={step.key} className="flex items-center space-x-3" data-testid={`status-step-${step.key}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isCompleted 
                      ? isCurrent 
                        ? "bg-purple-600 text-white" 
                        : "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? (isCurrent ? step.icon : "✓") : step.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {isCurrent && order.status !== "delivered" && (
                      <p className="text-sm text-purple-600">In progress...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Order Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Order Details</h4>
            
            <div className="space-y-2">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm" data-testid={`modal-item-${item.id}`}>
                  <span className="text-muted-foreground">
                    {item.quantity}× {item.product.name}
                  </span>
                  <span className="text-foreground">
                    ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span data-testid="text-modal-total">₹{parseFloat(order.totalAmount).toFixed(0)}</span>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Delivery Information</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-modal-address">
              <strong>Address:</strong> {order.deliveryAddress}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-modal-phone">
              <strong>Phone:</strong> {order.phone}
            </p>
          </div>

          {/* Help Information */}
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground mb-2">
                If you have any questions about your order, please contact our support team.
              </p>
              <p className="text-sm font-medium text-purple-600">
                📞 Support: +91 98765 43210
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
