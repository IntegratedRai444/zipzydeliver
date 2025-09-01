import fetch from 'node-fetch';

async function testPaymentSystem() {
  console.log('🧪 Testing Zipzy Payment System...\n');
  
  const baseUrl = 'http://localhost:5000/api';
  const testOrderId = 'TEST_ORDER_' + Date.now();
  const testAmount = 299.99;
  
  try {
    // Test 1: Generate QR Code
    console.log('1️⃣ Testing QR Code Generation...');
    const qrResponse = await fetch(`${baseUrl}/payment/generate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: testOrderId,
        amount: testAmount
      })
    });
    
    if (!qrResponse.ok) {
      throw new Error(`QR generation failed: ${qrResponse.status}`);
    }
    
    const qrData = await qrResponse.json();
    console.log('✅ QR Code generated successfully!');
    console.log(`   Order ID: ${qrData.paymentDetails.orderId}`);
    console.log(`   Amount: ₹${qrData.paymentDetails.amount}`);
    console.log(`   UPI ID: ${qrData.paymentDetails.upiId}`);
    console.log(`   UPI URL: ${qrData.upiUrl}`);
    console.log(`   QR Code: ${qrData.qrCode.substring(0, 50)}...`);
    console.log(`   Instructions: ${qrData.instructions.length} steps`);
    
    // Test 2: Confirm Payment
    console.log('\n2️⃣ Testing Payment Confirmation...');
    const confirmResponse = await fetch(`${baseUrl}/payment/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: testOrderId,
        amount: testAmount
      })
    });
    
    if (!confirmResponse.ok) {
      throw new Error(`Payment confirmation failed: ${confirmResponse.status}`);
    }
    
    const confirmData = await confirmResponse.json();
    console.log('✅ Payment confirmed successfully!');
    console.log(`   Transaction ID: ${confirmData.paymentStatus.transactionId}`);
    console.log(`   Status: ${confirmData.paymentStatus.status}`);
    console.log(`   Payment Method: ${confirmData.paymentStatus.paymentMethod}`);
    
    // Test 3: Check Payment Status
    console.log('\n3️⃣ Testing Payment Status Check...');
    const statusResponse = await fetch(`${baseUrl}/payment/status/${testOrderId}`);
    
    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('✅ Payment status retrieved successfully!');
    console.log(`   Payment Status: ${statusData.paymentStatus}`);
    console.log(`   Order Status: ${statusData.orderStatus}`);
    
    console.log('\n🎉 All payment tests passed!');
    console.log('\n📱 To test with real UPI:');
    console.log(`   1. Scan the QR code with any UPI app`);
    console.log(`   2. Pay ₹${testAmount} to rishabhkap30@okicici`);
    console.log(`   3. Click "I have paid" in the app`);
    console.log(`   4. Order will be processed automatically`);
    
  } catch (error) {
    console.error('❌ Payment test failed:', error.message);
    console.error('Make sure the server is running on port 5000');
  }
}

// Run the test
testPaymentSystem();
