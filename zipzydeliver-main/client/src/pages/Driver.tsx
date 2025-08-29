import { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Driver() {
  const { toast } = useToast();
  const [orderId, setOrderId] = useState("");
  const [coords, setCoords] = useState<{lat?: number; lng?: number; address?: string}>({});

  const ensureOrderId = () => {
    if (!orderId) {
      toast({ title: "Order ID required", description: "Enter an Order ID first", variant: "destructive" });
      return false;
    }
    return true;
  };

  const call = async (url: string, body?: any) => {
    try {
      await apiRequest("POST", url, body);
      toast({ title: "Success", description: "Action completed" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Request failed", variant: "destructive" });
    }
  };

  const onAccept = async () => {
    if (!ensureOrderId()) return;
    await call(`/api/deliveries/${orderId}/accept`);
  };
  const onPickup = async () => {
    if (!ensureOrderId()) return;
    await call(`/api/deliveries/${orderId}/pickup`);
  };
  const onComplete = async () => {
    if (!ensureOrderId()) return;
    await call(`/api/deliveries/${orderId}/complete`);
  };
  const onUpdateLocation = async () => {
    if (!ensureOrderId()) return;
    let latitude = coords.lat;
    let longitude = coords.lng;
    if (!latitude || !longitude) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
        );
      });
    }
    await call(`/api/deliveries/${orderId}/location`, { lat: latitude, lng: longitude, address: coords.address });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => {}} />
      <main className="container mx-auto max-w-screen-lg px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Driver Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Order ID</label>
                <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="paste order id" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm">Lat</label>
                  <Input value={coords.lat ?? ""} onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) || undefined })} placeholder="auto" />
                </div>
                <div>
                  <label className="text-sm">Lng</label>
                  <Input value={coords.lng ?? ""} onChange={(e) => setCoords({ ...coords, lng: Number(e.target.value) || undefined })} placeholder="auto" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm">Address (optional)</label>
              <Input value={coords.address ?? ""} onChange={(e) => setCoords({ ...coords, address: e.target.value })} placeholder="e.g., Main Gate" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={onAccept}>Accept</Button>
              <Button onClick={onPickup} variant="secondary">Pickup</Button>
              <Button onClick={onComplete} variant="secondary">Complete</Button>
              <Button onClick={onUpdateLocation} variant="outline">Update Location</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


