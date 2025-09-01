import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, QrCode, Smartphone, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface UPIPaymentProps {
  orderId: string;
  amount: number;
  onPaymentConfirmed: (paymentStatus: any) => void;
  onCancel: () => void;
}

interface PaymentResponse {
  qrCode: string;
  upiUrl: string;
  instructions: string[];
}

export const UPIPayment: React.FC<UPIPaymentProps> = ({
  orderId,
  amount,
  onPaymentConfirmed,
  onCancel
}) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [upiUrl, setUpiUrl] = useState<string>('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payment/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data: PaymentResponse = await response.json();
      setQrCode(data.qrCode);
      setUpiUrl(data.upiUrl);
      setInstructions(data.instructions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate payment QR code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentConfirmation = async () => {
    try {
      setIsConfirming(true);
      const response = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      const paymentStatus = await response.json();
      setPaymentConfirmed(true);
      
      toast({
        title: "Payment Confirmed!",
        description: "Your payment has been confirmed. Order is being processed.",
      });

      onPaymentConfirmed(paymentStatus);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const copyUPIUrl = () => {
    navigator.clipboard.writeText(upiUrl);
    toast({
      title: "UPI URL Copied",
      description: "UPI payment URL copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Generating payment QR code...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentConfirmed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Payment Confirmed!</h3>
          <p className="text-muted-foreground mb-4">
            Your order is being processed. You'll receive updates shortly.
          </p>
          <Badge variant="secondary" className="mb-4">
            Order #{orderId}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5" />
          UPI Payment
        </CardTitle>
        <p className="text-muted-foreground">
          Scan QR code to pay ₹{amount.toFixed(2)}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {qrCode && (
              <img 
                src={qrCode} 
                alt="UPI QR Code" 
                className="w-64 h-64"
              />
            )}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            How to Pay
          </h4>
          <ul className="space-y-2 text-sm">
            {instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary font-bold">{index + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* UPI URL Copy */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Or copy UPI URL:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={upiUrl}
              readOnly
              aria-label="UPI payment URL"
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={copyUPIUrl}
            >
              Copy
            </Button>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Important:</p>
              <p className="text-yellow-700">
                Click "I have paid" only after completing the UPI payment. 
                Your order will be processed once confirmed.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePaymentConfirmation}
            disabled={isConfirming}
            className="flex-1"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Confirming...
              </>
            ) : (
              'I have paid'
            )}
          </Button>
        </div>

        {/* Order Details */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Order #{orderId}</p>
          <p>Amount: ₹{amount.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
};
