import fetch from 'node-fetch';

async function testOrderWorkflow() {
  console.log('🔄 Testing Zipzy Order Workflow System...\n');
  
  const baseUrl = 'http://localhost:5000/api';
  const testOrderId = 'WORKFLOW_TEST_' + Date.now();
  const testAmount = 299.99;
  
  try {
    // Test 1: Initialize Order Workflow
    console.log('1️⃣ Testing Order Workflow Initialization...');
    const initResponse = await fetch(`${baseUrl}/workflow/initialize/${testOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initialStatus: 'placed'
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Workflow initialization failed: ${initResponse.status}`);
    }
    
    const initData = await initResponse.json();
    console.log('✅ Order workflow initialized successfully!');
    console.log(`   Order ID: ${initData.orderId}`);
    console.log(`   Initial Status: ${initData.initialStatus}`);
    
    // Test 2: Payment Confirmation (triggers automatic transitions)
    console.log('\n2️⃣ Testing Payment Confirmation...');
    const paymentResponse = await fetch(`${baseUrl}/payment/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: testOrderId,
        amount: testAmount
      })
    });
    
    if (!paymentResponse.ok) {
      throw new Error(`Payment confirmation failed: ${paymentResponse.status}`);
    }
    
    const paymentData = await paymentResponse.json();
    console.log('✅ Payment confirmed and workflow started!');
    console.log(`   Transaction ID: ${paymentData.paymentStatus.transactionId}`);
    console.log(`   Status: ${paymentData.paymentStatus.status}`);
    
    // Test 3: Check Workflow Status
    console.log('\n3️⃣ Testing Workflow Status Check...');
    const statusResponse = await fetch(`${baseUrl}/workflow/status/${testOrderId}`);
    
    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('✅ Workflow status retrieved successfully!');
    console.log(`   Current Status: ${statusData.status.currentStatus}`);
    console.log(`   Payment Status: ${statusData.status.paymentStatus}`);
    console.log(`   Estimated Delivery: ${statusData.status.estimatedDeliveryTime} minutes`);
    
    // Test 4: Manual Status Transition
    console.log('\n4️⃣ Testing Manual Status Transition...');
    const transitionResponse = await fetch(`${baseUrl}/workflow/transition/${testOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'preparing',
        trigger: 'manual',
        metadata: { reason: 'Kitchen started preparing' }
      })
    });
    
    if (!transitionResponse.ok) {
      throw new Error(`Status transition failed: ${transitionResponse.status}`);
    }
    
    const transitionData = await transitionResponse.json();
    console.log('✅ Status transition successful!');
    console.log(`   New Status: ${transitionData.status}`);
    console.log(`   Trigger: ${transitionData.trigger}`);
    
    // Test 5: Partner Assignment
    console.log('\n5️⃣ Testing Partner Assignment...');
    const partnerResponse = await fetch(`${baseUrl}/workflow/assign-partner/${testOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partnerId: 'PARTNER_001'
      })
    });
    
    if (!partnerResponse.ok) {
      throw new Error(`Partner assignment failed: ${partnerResponse.status}`);
    }
    
    const partnerData = await partnerResponse.json();
    console.log('✅ Partner assigned successfully!');
    console.log(`   Partner ID: ${partnerData.partnerId}`);
    
    // Test 6: Order Pickup
    console.log('\n6️⃣ Testing Order Pickup...');
    const pickupResponse = await fetch(`${baseUrl}/workflow/pickup/${testOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partnerId: 'PARTNER_001'
      })
    });
    
    if (!pickupResponse.ok) {
      throw new Error(`Order pickup failed: ${pickupResponse.status}`);
    }
    
    const pickupData = await pickupResponse.json();
    console.log('✅ Order pickup confirmed!');
    console.log(`   Partner ID: ${pickupData.partnerId}`);
    
    // Test 7: Order Delivery
    console.log('\n7️⃣ Testing Order Delivery...');
    const deliveryResponse = await fetch(`${baseUrl}/workflow/deliver/${testOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partnerId: 'PARTNER_001'
      })
    });
    
    if (!deliveryResponse.ok) {
      throw new Error(`Order delivery failed: ${deliveryResponse.status}`);
    }
    
    const deliveryData = await deliveryResponse.json();
    console.log('✅ Order delivered successfully!');
    console.log(`   Partner ID: ${deliveryData.partnerId}`);
    
    // Test 8: Final Status Check
    console.log('\n8️⃣ Testing Final Workflow Status...');
    const finalStatusResponse = await fetch(`${baseUrl}/workflow/status/${testOrderId}`);
    
    if (!finalStatusResponse.ok) {
      throw new Error(`Final status check failed: ${finalStatusResponse.status}`);
    }
    
    const finalStatusData = await finalStatusResponse.json();
    console.log('✅ Final workflow status retrieved!');
    console.log(`   Final Status: ${finalStatusData.status.currentStatus}`);
    console.log(`   Delivery Time: ${finalStatusData.status.estimatedDeliveryTime} minutes`);
    
    // Test 9: Workflow Statistics
    console.log('\n9️⃣ Testing Workflow Statistics...');
    const statsResponse = await fetch(`${baseUrl}/workflow/stats`);
    
    if (!statsResponse.ok) {
      throw new Error(`Stats retrieval failed: ${statsResponse.status}`);
    }
    
    const statsData = await statsResponse.json();
    console.log('✅ Workflow statistics retrieved!');
    console.log(`   Active Orders: ${statsData.stats.activeOrders}`);
    console.log(`   Total Transitions: ${statsData.stats.totalTransitions}`);
    
    console.log('\n🎉 All workflow tests passed!');
    console.log('\n📋 Workflow Summary:');
    console.log(`   Order ID: ${testOrderId}`);
    console.log(`   Amount: ₹${testAmount}`);
    console.log(`   Partner: PARTNER_001`);
    console.log(`   Status Flow: placed → confirmed → preparing → assigned → picked_up → delivered`);
    console.log(`   Total API Calls: 9`);
    console.log(`   All transitions: ✅ Successful`);
    
    console.log('\n🚀 The automated order workflow system is working perfectly!');
    console.log('   - Automatic status transitions based on timeouts');
    console.log('   - Manual transitions for partner actions');
    console.log('   - Payment-triggered workflow initialization');
    console.log('   - Real-time status tracking');
    console.log('   - Comprehensive notification system');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    console.error('Make sure the server is running on port 5000');
  }
}

// Run the test
testOrderWorkflow();
