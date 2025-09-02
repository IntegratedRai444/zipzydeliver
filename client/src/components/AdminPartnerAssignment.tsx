import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MapPin, Clock, Package, User, Star, AlertCircle } from 'lucide-react';

interface AdminPartnerAssignmentProps {
  orderId: string;
}

const AdminPartnerAssignment: React.FC<AdminPartnerAssignmentProps> = ({ orderId }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  // Mock data - replace with API calls
  useEffect(() => {
    setAvailablePartners([
      { id: 'partner_1', name: 'Arjun Patel', isStudent: true, rating: 4.8, distance: 0.8, isOnline: true },
      { id: 'partner_2', name: 'Priya Singh', isStudent: true, rating: 4.6, distance: 1.2, isOnline: true },
      { id: 'partner_3', name: 'Rahul Kumar', isStudent: false, rating: 4.5, distance: 1.5, isOnline: true }
    ]);
  }, []);

  const handleAssignPartner = async () => {
    if (!selectedPartner) return;
    
    setLoading(true);
    try {
      // API call to assign partner
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      console.log(`Partner ${selectedPartner} assigned to order ${orderId}`);
    } catch (error) {
      console.error('Failed to assign partner:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Manual Partner Assignment</span>
          <Badge variant="outline" className="font-mono">
            {orderId}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={selectedPartner} onValueChange={setSelectedPartner}>
            <SelectTrigger>
              <SelectValue placeholder="Select a delivery partner" />
            </SelectTrigger>
            <SelectContent>
              {availablePartners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  <div className="flex items-center space-x-2">
                    <span>{partner.name}</span>
                    {partner.isStudent && <Star className="h-3 w-3 text-green-600" />}
                    <span className="text-sm text-gray-500">({partner.distance}km)</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleAssignPartner}
            disabled={!selectedPartner || loading}
            className="w-full"
          >
            {loading ? 'Assigning...' : 'Assign Partner'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPartnerAssignment;
