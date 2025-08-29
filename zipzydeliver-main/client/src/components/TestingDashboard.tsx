import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, 
  Clock, Play, Pause, RotateCcw, Download, Filter,
  Calendar, Activity, Target, Zap, Shield, Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import IconGallery from './IconGallery';

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
  successRate: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
}

interface TestTrend {
  date: string;
  passed: number;
  failed: number;
  total: number;
}

interface PerformanceMetrics {
  userFlow: number;
  partnerFlow: number;
  tracking: number;
  chatbot: number;
  adminFlow: number;
}

export const TestingDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showIconGallery, setShowIconGallery] = useState(false);

  // Mock data - replace with real data from your testing framework
  const [testMetrics, setTestMetrics] = useState<TestMetrics>({
    totalTests: 156,
    passedTests: 142,
    failedTests: 8,
    runningTests: 6,
    successRate: 91.0,
    averageExecutionTime: 125000, // 2 minutes 5 seconds
    totalExecutionTime: 19500000 // 5 hours 25 minutes
  });

  const [testTrends, setTestTrends] = useState<TestTrend[]>([
    { date: '2024-01-01', passed: 12, failed: 1, total: 13 },
    { date: '2024-01-02', passed: 15, failed: 0, total: 15 },
    { date: '2024-01-03', passed: 18, failed: 2, total: 20 },
    { date: '2024-01-04', passed: 14, failed: 1, total: 15 },
    { date: '2024-01-05', passed: 16, failed: 0, total: 16 },
    { date: '2024-01-06', passed: 13, failed: 1, total: 14 },
    { date: '2024-01-07', passed: 14, failed: 0, total: 14 }
  ]);

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    userFlow: 95,
    partnerFlow: 88,
    tracking: 92,
    chatbot: 96,
    adminFlow: 90
  });

  const [recentTestResults, setRecentTestResults] = useState([
    {
      id: 'test-1',
      name: 'User Order Flow',
      status: 'passed',
      duration: 180000,
      timestamp: new Date(Date.now() - 300000),
      category: 'user-flow'
    },
    {
      id: 'test-2',
      name: 'Partner Delivery Flow',
      status: 'passed',
      duration: 240000,
      timestamp: new Date(Date.now() - 600000),
      category: 'partner-flow'
    },
    {
      id: 'test-3',
      name: 'Real-time Tracking',
      status: 'failed',
      duration: 120000,
      timestamp: new Date(Date.now() - 900000),
      category: 'integration'
    },
    {
      id: 'test-4',
      name: 'AI Chatbot Flow',
      status: 'passed',
      duration: 90000,
      timestamp: new Date(Date.now() - 1200000),
      category: 'integration'
    }
  ]);

  // Refresh test data
  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  // Export test results
  const exportResults = () => {
    const data = {
      metrics: testMetrics,
      trends: testTrends,
      performance: performanceMetrics,
      recentResults: recentTestResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'running': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">🧪 Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of Zipzy application testing results
          </p>
        </div>
        <div className="flex items-center gap-3">
                  <Button
          onClick={() => setShowIconGallery(!showIconGallery)}
          variant="outline"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          🎨 {showIconGallery ? 'Hide' : 'Show'} 3D Icons
        </Button>
        
        <Button
          onClick={() => window.location.href = '/ai-dashboard'}
          variant="outline"
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
        >
          🚀 AI Dashboard
        </Button>
          <Button
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportResults}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testMetrics.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              +12 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testMetrics.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(testMetrics.averageExecutionTime)}</div>
            <p className="text-xs text-muted-foreground">
              -15s from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Tests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testMetrics.runningTests}</div>
            <p className="text-xs text-muted-foreground">
              Active test executions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Success Rate Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Test Success Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {testTrends.map((trend, index) => {
                const successRate = (trend.passed / trend.total) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-200 rounded-t-sm" style={{ height: `${successRate}%` }}>
                      <div className="bg-green-500 h-full rounded-t-sm"></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs font-medium mt-1">{Math.round(successRate)}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(performanceMetrics).map(([category, score]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-bold">{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Test Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Test Results</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
                aria-label="Select timeframe"
                title="Select timeframe"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border rounded px-2 py-1"
                aria-label="Select category"
                title="Select category"
              >
                <option value="all">All Categories</option>
                <option value="user-flow">User Flow</option>
                <option value="partner-flow">Partner Flow</option>
                <option value="integration">Integration</option>
                <option value="admin-flow">Admin Flow</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTestResults
              .filter(result => selectedCategory === 'all' || result.category === selectedCategory)
              .map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)}
                    </div>
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimestamp(result.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-muted-foreground">
                      Duration: {formatDuration(result.duration)}
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Backend Services</span>
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">WebSocket</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">AI Services</span>
              <Badge className="bg-green-100 text-green-800">Operational</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Run All Tests
            </Button>
            <Button className="w-full" variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Partner Flow Test
            </Button>
            <Button className="w-full" variant="outline" size="sm">
              <Target className="h-4 w-4 mr-2" />
              User Flow Test
            </Button>
            <Button className="w-full" variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Performance Test
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {testMetrics.passedTests}
              </div>
              <div className="text-sm text-muted-foreground">Passed Tests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {testMetrics.failedTests}
              </div>
              <div className="text-sm text-muted-foreground">Failed Tests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatDuration(testMetrics.totalExecutionTime)}
              </div>
              <div className="text-sm text-muted-foreground">Total Execution Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3D Icon Gallery */}
      {showIconGallery && (
        <div className="mt-8">
          <IconGallery />
        </div>
      )}
    </div>
  );
};

export default TestingDashboard;
