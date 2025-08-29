import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Route, 
  TrendingUp, 
  Mic, 
  Calculator, 
  Brain, 
  Zap, 
  Target,
  Clock,
  MapPin,
  Package,
  Users,
  BarChart3
} from 'lucide-react';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'beta' | 'coming_soon';
  icon: React.ReactNode;
  category: 'customer' | 'delivery' | 'store' | 'system';
}

const aiFeatures: AIFeature[] = [
  {
    id: 'semantic-search',
    name: 'Semantic Search',
    description: 'Find products using natural language queries',
    status: 'active',
    icon: <Search className="h-6 w-6" />,
    category: 'customer'
  },
  {
    id: 'recommendations',
    name: 'AI Recommendations',
    description: 'Personalized product suggestions based on your preferences',
    status: 'active',
    icon: <Brain className="h-6 w-6" />,
    category: 'customer'
  },
  {
    id: 'budget-planner',
    name: 'Budget Planner',
    description: 'Smart budget planning with nutritional insights',
    status: 'active',
    icon: <Calculator className="h-6 w-6" />,
    category: 'customer'
  },
  {
    id: 'route-optimization',
    name: 'Route Optimization',
    description: 'AI-powered delivery route planning',
    status: 'active',
    icon: <Route className="h-6 w-6" />,
    category: 'delivery'
  },
  {
    id: 'demand-prediction',
    name: 'Demand Prediction',
    description: 'Predict order volumes and peak times',
    status: 'active',
    icon: <TrendingUp className="h-6 w-6" />,
    category: 'delivery'
  },
  {
    id: 'voice-ai',
    name: 'Voice AI Assistant',
    description: 'Hands-free delivery updates and commands',
    status: 'active',
    icon: <Mic className="h-6 w-6" />,
    category: 'delivery'
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: '24/7 customer support and order assistance',
    status: 'active',
    icon: <Zap className="h-6 w-6" />,
    category: 'system'
  }
];

export default function AIDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [budgetAmount, setBudgetAmount] = useState(200);
  const [budgetConstraints, setBudgetConstraints] = useState({
    maxAmount: 200,
    preferredCategories: [] as string[],
    excludeCategories: [] as string[],
    mealType: 'snack' as 'breakfast' | 'lunch' | 'dinner' | 'snack'
  });

  // Semantic Search
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['/api/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
      const data = await response.json();
      return data.results || [];
    },
    enabled: searchQuery.trim().length > 2
  });

  // Budget Plan
  const { data: budgetPlan, isLoading: budgetLoading } = useQuery({
    queryKey: ['/api/budget/plan', budgetConstraints],
    queryFn: async () => {
      const response = await fetch('/api/budget/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: budgetConstraints })
      });
      return response.json();
    },
    enabled: budgetConstraints.maxAmount > 0
  });

  // Demand Prediction
  const { data: demandData, isLoading: demandLoading } = useQuery({
    queryKey: ['/api/demand/current'],
    queryFn: async () => {
      const response = await fetch('/api/demand/current');
      return response.json();
    }
  });

  const filteredFeatures = aiFeatures.filter(feature => {
    if (selectedCategory !== 'all' && feature.category !== selectedCategory) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'beta': return 'bg-yellow-500';
      case 'coming_soon': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'beta': return 'Beta';
      case 'coming_soon': return 'Coming Soon';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🚀 Zipzy AI Dashboard
          </h1>
          <p className="text-xl text-purple-200">
            Experience the future of campus delivery with AI-powered features
          </p>
        </div>

        {/* AI Features Overview */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Brain className="h-8 w-8 text-purple-400" />
              AI Features Overview
            </CardTitle>
            <CardDescription className="text-purple-200">
              Explore all available AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="customer">Customer Features</SelectItem>
                  <SelectItem value="delivery">Delivery Features</SelectItem>
                  <SelectItem value="store">Store Features</SelectItem>
                  <SelectItem value="system">System Features</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeatures.map((feature) => (
                <Card key={feature.id} className="glass-card hover:scale-105 transition-transform">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-purple-400">
                          {feature.icon}
                        </div>
                        <CardTitle className="text-lg text-white">{feature.name}</CardTitle>
                      </div>
                      <Badge className={getStatusColor(feature.status)}>
                        {getStatusText(feature.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-purple-200 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interactive AI Features */}
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-card">
            <TabsTrigger value="search" className="text-white">🔍 Search</TabsTrigger>
            <TabsTrigger value="budget" className="text-white">💰 Budget</TabsTrigger>
            <TabsTrigger value="demand" className="text-white">📊 Demand</TabsTrigger>
            <TabsTrigger value="voice" className="text-white">🎤 Voice</TabsTrigger>
          </TabsList>

          {/* Semantic Search Tab */}
          <TabsContent value="search" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Search className="h-6 w-6 text-purple-400" />
                  Semantic Product Search
                </CardTitle>
                <CardDescription className="text-purple-200">
                  Find products using natural language - try "healthy snacks" or "quick lunch"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="search" className="text-white">Search Query</Label>
                    <Input
                      id="search"
                      placeholder="e.g., healthy snacks under 100 rupees"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                {searchLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="text-purple-200 mt-4">Searching...</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Search Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((product: any) => (
                        <Card key={product.id} className="glass-card">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{product.name}</h4>
                                <p className="text-sm text-purple-200">₹{product.price}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && !searchLoading && searchResults.length === 0 && (
                  <div className="text-center py-8 text-purple-200">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try different keywords or check spelling</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Planner Tab */}
          <TabsContent value="budget" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-purple-400" />
                  AI Budget Planner
                </CardTitle>
                <CardDescription className="text-purple-200">
                  Get personalized meal plans within your budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label htmlFor="budget" className="text-white">Budget Amount (₹)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => {
                        const amount = parseInt(e.target.value) || 0;
                        setBudgetAmount(amount);
                        setBudgetConstraints(prev => ({ ...prev, maxAmount: amount }));
                      }}
                      className="mt-2"
                      min="50"
                      max="1000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mealType" className="text-white">Meal Type</Label>
                    <Select 
                      value={budgetConstraints.mealType} 
                      onValueChange={(value: any) => setBudgetConstraints(prev => ({ ...prev, mealType: value }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {budgetLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="text-purple-200 mt-4">Planning your budget...</p>
                  </div>
                )}

                {budgetPlan && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="glass-card text-center">
                        <CardContent className="p-4">
                          <p className="text-2xl font-bold text-green-400">₹{budgetPlan.totalCost}</p>
                          <p className="text-sm text-purple-200">Total Cost</p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card text-center">
                        <CardContent className="p-4">
                          <p className="text-2xl font-bold text-blue-400">₹{budgetPlan.savings}</p>
                          <p className="text-sm text-purple-200">You Save</p>
                        </CardContent>
                      </Card>
                      <Card className="glass-card text-center">
                        <CardContent className="p-4">
                          <p className="text-2xl font-bold text-purple-400">{budgetPlan.estimatedCalories}</p>
                          <p className="text-sm text-purple-200">Calories</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Suggested Items</h3>
                      <div className="space-y-3">
                        {budgetPlan.suggestedItems.map((item: any, index: number) => (
                          <Card key={index} className="glass-card">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-white">{item.product.name}</h4>
                                  <p className="text-sm text-purple-200">{item.reason}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white">Qty: {item.quantity}</p>
                                  <p className="text-green-400">₹{item.totalCost}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demand Prediction Tab */}
          <TabsContent value="demand" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                  Demand Prediction
                </CardTitle>
                <CardDescription className="text-purple-200">
                  AI-powered insights into order patterns and peak times
                </CardDescription>
              </CardHeader>
              <CardContent>
                {demandLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="text-purple-200 mt-4">Analyzing demand patterns...</p>
                  </div>
                )}

                {demandData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Current Hour</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-green-400">
                              {demandData.prediction?.predictedOrders || 0}
                            </p>
                            <p className="text-purple-200">Predicted Orders</p>
                            <div className="mt-2">
                              <Progress 
                                value={Math.min((demandData.prediction?.predictedOrders || 0) / 100 * 100, 100)} 
                                className="h-2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Next Hour</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-blue-400">
                              {demandData.nextHour?.predictedOrders || 0}
                            </p>
                            <p className="text-purple-200">Predicted Orders</p>
                            <div className="mt-2">
                              <Progress 
                                value={Math.min((demandData.nextHour?.predictedOrders || 0) / 100 * 100, 100)} 
                                className="h-2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {demandData.prediction?.factors && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Factors Affecting Demand</h3>
                        <div className="flex flex-wrap gap-2">
                          {demandData.prediction.factors.map((factor: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-purple-600 text-white">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {demandData.prediction?.recommendations && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">AI Recommendations</h3>
                        <div className="space-y-2">
                          {demandData.prediction.recommendations.map((rec: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-purple-200">
                              <Target className="h-4 w-4 text-purple-400" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voice AI Tab */}
          <TabsContent value="voice" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Mic className="h-6 w-6 text-purple-400" />
                  Voice AI Assistant
                </CardTitle>
                <CardDescription className="text-purple-200">
                  Hands-free delivery updates and commands for delivery partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mic className="h-12 w-12 text-white" />
                    </div>
                    <p className="text-purple-200 mb-4">
                      Click the microphone to start voice commands
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Mic className="h-5 w-5 mr-2" />
                      Start Voice Command
                    </Button>
                  </div>

                  <Separator className="bg-purple-700" />

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Available Voice Commands</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-purple-300">Delivery Updates</h4>
                        <div className="space-y-2 text-sm text-purple-200">
                          <p>• "Order ABC123 delivered"</p>
                          <p>• "Picked up package XYZ789"</p>
                          <p>• "Status delivered for order DEF456"</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-purple-300">Location & Status</h4>
                        <div className="space-y-2 text-sm text-purple-200">
                          <p>• "At Hostel 3"</p>
                          <p>• "Change status to in transit"</p>
                          <p>• "Location Main Gate"</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-800/30 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Voice AI Benefits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-200">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <span>Hands-free operation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-400" />
                        <span>Faster updates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        <span>Real-time tracking</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Insights Summary */}
        <Card className="glass-card mt-8">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-400" />
              AI Insights Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-green-400">7</p>
                <p className="text-purple-200">Active AI Features</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-blue-400">95%</p>
                <p className="text-purple-200">Accuracy Rate</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-purple-400">24/7</p>
                <p className="text-purple-200">AI Availability</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-yellow-400">3x</p>
                <p className="text-purple-200">Faster Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
