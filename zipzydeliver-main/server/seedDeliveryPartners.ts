import { storage } from "./storage";

export async function seedDeliveryPartners() {
  try {
    const existingPartners = await storage.getDeliveryPartners();
    if (existingPartners.length > 0) {
      console.log('Delivery partners already exist');
      return existingPartners;
    }

    const deliveryPartners = [
      {
        name: "Rahul Kumar",
        email: "rahul.delivery@zipzy.com",
        phone: "+91-9876543210",
        vehicleType: "bike",
        vehicleNumber: "UP 32 AB 1234",
        isActive: true,
        isOnline: true,
        rating: "4.8",
        totalDeliveries: 245,
        profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      {
        name: "Priya Sharma",
        email: "priya.delivery@zipzy.com",
        phone: "+91-9876543211",
        vehicleType: "scooter",
        vehicleNumber: "UP 32 CD 5678",
        isActive: true,
        isOnline: true,
        rating: "4.9",
        totalDeliveries: 189,
        profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616c45c8b24?w=150&h=150&fit=crop&crop=face"
      },
      {
        name: "Amit Singh",
        email: "amit.delivery@zipzy.com",
        phone: "+91-9876543212",
        vehicleType: "bicycle",
        vehicleNumber: "N/A",
        isActive: true,
        isOnline: false,
        rating: "4.7",
        totalDeliveries: 156,
        profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      {
        name: "Sneha Patel",
        email: "sneha.delivery@zipzy.com",
        phone: "+91-9876543213",
        vehicleType: "bike",
        vehicleNumber: "UP 32 EF 9012",
        isActive: true,
        isOnline: true,
        rating: "4.6",
        totalDeliveries: 203,
        profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      }
    ];

    const createdPartners = [];
    for (const partner of deliveryPartners) {
      const created = await storage.createDeliveryPartner(partner);
      createdPartners.push(created);
    }

    console.log(`Created ${createdPartners.length} delivery partners`);
    return createdPartners;
  } catch (error) {
    console.error('Error seeding delivery partners:', error);
    throw error;
  }
}