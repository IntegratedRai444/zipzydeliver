import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { apiRequest } from '../lib/apiRequest';
import { useToast } from '../hooks/useToast';

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  timestamp: string;
}

export const AIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('demand');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, AIResponse>>({});
  const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Form states for different services
  const [demandData, setDemandData] = useState({
    location: 'campus_center',
    date: new Date().toISOString().split('T')[0],
    weather: 'sunny'
  });

  const [routeData, setRouteData] = useState({
    orders: [],
    partners: [],
    constraints: {}
  });

  const [feedbackData, setFeedbackData] = useState({
    feedback: ''
  });

  const [fraudData, setFraudData] = useState({
    orderData: {},
    customerHistory: [],
    location: ''
  });

  // Check AI service status on component mount
  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const response = await apiRequest('/api/ai/status');
      setServiceStatus(response.status === 'available');
    } catch (error) {
      setServiceStatus(false);
    }
  };

  const callAIService = async (endpoint: string, data: any, serviceName: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/ai/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      setResults(prev => ({
        ...prev,
        [serviceName]: response
      }));

      toast({
        title: 'AI Service Response',
        description: `Successfully called ${serviceName}`,
        variant: 'default'
      });
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [serviceName]: {
          success: false,
          error: 'Service call failed',
          timestamp: new Date().toISOString()
        }
      }));

      toast({
        title: 'AI Service Error',
        description: `Failed to call ${serviceName}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderResult = (serviceName: string) => {
    const result = results[serviceName];
    if (!result) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {serviceName} Results
            <Badge variant={result.success ? 'default' : 'destructive'}>
              {result.success ? 'Success' : 'Error'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.success ? (
            <div className="space-y-2">
              {result.confidence && (
                <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</p>
              )}
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Timestamp: {new Date(result.timestamp).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Services Dashboard</h1>
          <p className="text-gray-600">Advanced AI/ML services for delivery optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={serviceStatus ? 'default' : 'destructive'}>
            {serviceStatus ? 'AI Services Online' : 'AI Services Offline'}
          </Badge>
          <Button onClick={checkServiceStatus} variant="outline" size="sm">
            Refresh Status
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="demand">Demand</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          <TabsTrigger value="nlp">NLP</TabsTrigger>
          <TabsTrigger value="fraud">Fraud</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
        </TabsList>

        {/* Demand Prediction Tab */}
        <TabsContent value="demand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demand Prediction</CardTitle>
              <CardDescription>Predict order demand using AI models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={demandData.location} onValueChange={(value) => setDemandData(prev => ({ ...prev, location: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campus_center">Campus Center</SelectItem>
                      <SelectItem value="north_campus">North Campus</SelectItem>
                      <SelectItem value="south_campus">South Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    type="date"
                    value={demandData.date}
                    onChange={(e) => setDemandData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="weather">Weather</Label>
                  <Select value={demandData.weather} onValueChange={(value) => setDemandData(prev => ({ ...prev, weather: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunny">Sunny</SelectItem>
                      <SelectItem value="rainy">Rainy</SelectItem>
                      <SelectItem value="cloudy">Cloudy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('demand/daily', demandData, 'Daily Demand Prediction')}
                  disabled={loading}
                >
                  Predict Daily Demand
                </Button>
                <Button 
                  onClick={() => callAIService('demand/hourly', demandData, 'Hourly Demand Prediction')}
                  disabled={loading}
                  variant="outline"
                >
                  Predict Hourly Demand
                </Button>
                <Button 
                  onClick={() => callAIService('demand/weather-impact', demandData, 'Weather Impact Analysis')}
                  disabled={loading}
                  variant="outline"
                >
                  Analyze Weather Impact
                </Button>
              </div>
              {renderResult('Daily Demand Prediction')}
              {renderResult('Hourly Demand Prediction')}
              {renderResult('Weather Impact Analysis')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Route Optimization Tab */}
        <TabsContent value="route" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Route Optimization</CardTitle>
              <CardDescription>Optimize delivery routes and partner assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Route Data (JSON)</Label>
                <Textarea
                  placeholder="Enter route optimization data..."
                  value={JSON.stringify(routeData, null, 2)}
                  onChange={(e) => {
                    try {
                      setRouteData(JSON.parse(e.target.value));
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('route/optimize', routeData, 'Route Optimization')}
                  disabled={loading}
                >
                  Optimize Route
                </Button>
                <Button 
                  onClick={() => callAIService('route/partner-assignment', routeData, 'Partner Assignment')}
                  disabled={loading}
                  variant="outline"
                >
                  Optimize Partner Assignment
                </Button>
              </div>
              {renderResult('Route Optimization')}
              {renderResult('Partner Assignment')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NLP Service Tab */}
        <TabsContent value="nlp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Natural Language Processing</CardTitle>
              <CardDescription>Analyze customer feedback and generate smart responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Customer Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Enter customer feedback to analyze..."
                  value={feedbackData.feedback}
                  onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('nlp/analyze-feedback', feedbackData, 'Feedback Analysis')}
                  disabled={loading || !feedbackData.feedback}
                >
                  Analyze Feedback
                </Button>
                <Button 
                  onClick={() => callAIService('nlp/generate-response', { query: feedbackData.feedback, context: {} }, 'Smart Response')}
                  disabled={loading || !feedbackData.feedback}
                  variant="outline"
                >
                  Generate Response
                </Button>
              </div>
              {renderResult('Feedback Analysis')}
              {renderResult('Smart Response')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Detection Tab */}
        <TabsContent value="fraud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Detection</CardTitle>
              <CardDescription>Detect fraudulent orders and payments using AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fraud Detection Data (JSON)</Label>
                <Textarea
                  placeholder="Enter fraud detection data..."
                  value={JSON.stringify(fraudData, null, 2)}
                  onChange={(e) => {
                    try {
                      setFraudData(JSON.parse(e.target.value));
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('fraud/detect-orders', fraudData, 'Order Fraud Detection')}
                  disabled={loading}
                >
                  Detect Order Fraud
                </Button>
                <Button 
                  onClick={() => callAIService('fraud/detect-payment', fraudData, 'Payment Fraud Detection')}
                  disabled={loading}
                  variant="outline"
                >
                  Detect Payment Fraud
                </Button>
              </div>
              {renderResult('Order Fraud Detection')}
              {renderResult('Payment Fraud Detection')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Analytics</CardTitle>
              <CardDescription>Generate AI-powered business insights and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('analytics/daily-report', {}, 'Daily Analytics Report')}
                  disabled={loading}
                >
                  Generate Daily Report
                </Button>
                <Button 
                  onClick={() => callAIService('analytics/customer-segments', {}, 'Customer Segmentation')}
                  disabled={loading}
                  variant="outline"
                >
                  Analyze Customer Segments
                </Button>
              </div>
              {renderResult('Daily Analytics Report')}
              {renderResult('Customer Segmentation')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Get personalized product and delivery recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('recommend/products', { userId: 'test-user' }, 'Product Recommendations')}
                  disabled={loading}
                >
                  Get Product Recommendations
                </Button>
                <Button 
                  onClick={() => callAIService('recommend/delivery-times', { location: 'campus_center' }, 'Delivery Time Recommendations')}
                  disabled={loading}
                  variant="outline"
                >
                  Get Delivery Time Recommendations
                </Button>
              </div>
              {renderResult('Product Recommendations')}
              {renderResult('Delivery Time Recommendations')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operational Intelligence</CardTitle>
              <CardDescription>Optimize operations with AI-powered insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => callAIService('operational/staff-scheduling', {}, 'Staff Scheduling Optimization')}
                  disabled={loading}
                >
                  Optimize Staff Scheduling
                </Button>
                <Button 
                  onClick={() => callAIService('operational/maintenance', {}, 'Maintenance Prediction')}
                  disabled={loading}
                  variant="outline"
                >
                  Predict Maintenance Needs
                </Button>
                <Button 
                  onClick={() => callAIService('financial/revenue-forecast', {}, 'Revenue Forecast')}
                  disabled={loading}
                  variant="outline"
                >
                  Revenue Forecast
                </Button>
              </div>
              {renderResult('Staff Scheduling Optimization')}
              {renderResult('Maintenance Prediction')}
              {renderResult('Revenue Forecast')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Service Health</CardTitle>
          <CardDescription>Monitor the status of all AI services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Python AI Services</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={serviceStatus ? 'default' : 'destructive'}>
                  {serviceStatus ? 'Online' : 'Offline'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {serviceStatus ? 'All services available' : 'Services unavailable'}
                </span>
              </div>
            </div>
            <div>
              <Label>Last Check</Label>
              <p className="text-sm text-gray-600 mt-1">
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
