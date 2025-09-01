import QRCode from 'qrcode';

export interface PaymentDetails {
  orderId: string;
  amount: number;
  upiId: string;
  merchantName: string;
  currency: string;
}

export interface PaymentStatus {
  orderId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paidAt?: Date;
  paymentMethod: 'upi_qr';
  transactionId?: string;
}

export class PaymentService {
  private upiId: string;
  private merchantName: string;

  constructor() {
    // Your UPI ID - replace with your actual UPI ID
    this.upiId = process.env.UPI_ID || 'rishabhkap30@okicici';
    this.merchantName = 'Zipzy Delivery';
  }

  /**
   * Generate UPI QR code for payment
   */
  async generateUPIQR(paymentDetails: PaymentDetails): Promise<{ qrCode: string; upiUrl: string }> {
    const { amount, orderId } = paymentDetails;
    
    // Create UPI payment URL
    const upiUrl = `upi://pay?pa=${this.upiId}&pn=${this.merchantName}&am=${amount}&cu=INR&tn=Order-${orderId}`;
    
    try {
      // Generate QR code as data URL
      const qrCode = await QRCode.toDataURL(upiUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        qrCode,
        upiUrl
      };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Confirm payment manually (MVP approach)
   */
  async confirmPayment(orderId: string, userId: string): Promise<PaymentStatus> {
    const paymentStatus: PaymentStatus = {
      orderId,
      status: 'paid',
      paidAt: new Date(),
      paymentMethod: 'upi_qr',
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // In a real implementation, you would:
    // 1. Verify payment with your bank
    // 2. Check if amount matches
    // 3. Validate transaction details
    
    return paymentStatus;
  }

  /**
   * Get payment instructions for user
   */
  getPaymentInstructions(amount: number): string[] {
    return [
      `Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM)`,
      `Pay ₹${amount.toFixed(2)} to complete your order`,
      `After payment, click "I have paid" to confirm`,
      `Your order will be processed once payment is confirmed`
    ];
  }

  /**
   * Validate UPI ID format
   */
  validateUPIId(upiId: string): boolean {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    return upiRegex.test(upiId);
  }

  /**
   * Generate settlement details for delivery partner
   */
  generateSettlementDetails(orderId: string, deliveryFee: number, partnerId: string) {
    return {
      orderId,
      partnerId,
      deliveryFee,
      settlementTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'pending',
      instructions: [
        'Payment will be settled after delivery completion',
        'Settlement time: 1-2 hours after delivery',
        'Transfer method: UPI to partner account'
      ]
    };
  }
}

export const paymentService = new PaymentService();
