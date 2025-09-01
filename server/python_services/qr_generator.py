#!/usr/bin/env python3
"""
QR Code Generator for Zipzy Delivery App
Generates UPI QR codes for payment processing
"""

import qrcode
import json
import sys
import os
from typing import Dict, Any

class UPIQRGenerator:
    def __init__(self, upi_id: str = "rishabhkap30@okicici"):
        self.upi_id = upi_id
        self.merchant_name = "Zipzy Delivery"
    
    def generate_upi_url(self, amount: float, order_id: str, currency: str = "INR") -> str:
        """
        Generate UPI payment URL
        Format: upi://pay?pa=UPI_ID&pn=MERCHANT_NAME&am=AMOUNT&cu=CURRENCY&tn=ORDER_ID
        """
        return f"upi://pay?pa={self.upi_id}&pn={self.merchant_name}&am={amount}&cu={currency}&tn=Order-{order_id}"
    
    def generate_qr_code(self, upi_url: str, output_path: str = None) -> str:
        """
        Generate QR code from UPI URL
        Returns base64 encoded image if no output_path provided
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(upi_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        if output_path:
            img.save(output_path)
            return output_path
        else:
            # Convert to base64 for API response
            import base64
            from io import BytesIO
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_str}"
    
    def create_payment_qr(self, order_id: str, amount: float, currency: str = "INR") -> Dict[str, Any]:
        """
        Create complete payment QR code with metadata
        """
        upi_url = self.generate_upi_url(amount, order_id, currency)
        qr_code = self.generate_qr_code(upi_url)
        
        return {
            "orderId": order_id,
            "amount": amount,
            "currency": currency,
            "upiUrl": upi_url,
            "qrCode": qr_code,
            "upiId": self.upi_id,
            "merchantName": self.merchant_name,
            "instructions": [
                f"Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM)",
                f"Pay ₹{amount:.2f} to complete your order",
                f"After payment, click 'I have paid' to confirm",
                f"Your order will be processed once payment is confirmed"
            ]
        }

def main():
    """
    Command line interface for QR generation
    Usage: python qr_generator.py <order_id> <amount> [output_path]
    """
    if len(sys.argv) < 3:
        print("Usage: python qr_generator.py <order_id> <amount> [output_path]")
        print("Example: python qr_generator.py ORDER123 299.99 qr_code.png")
        sys.exit(1)
    
    order_id = sys.argv[1]
    amount = float(sys.argv[2])
    output_path = sys.argv[3] if len(sys.argv) > 3 else None
    
    generator = UPIQRGenerator()
    result = generator.create_payment_qr(order_id, amount)
    
    if output_path:
        # Save QR code to file
        upi_url = result["upiUrl"]
        generator.generate_qr_code(upi_url, output_path)
        print(f"QR code saved to: {output_path}")
        print(f"UPI URL: {upi_url}")
    else:
        # Print JSON response for API
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
