import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Wallet, 
  Coins, 
  Star, 
  TrendingUp, 
  Gift, 
  History, 
  Target, 
  Award,
  Zap,
  GiftIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface WalletBalance {
  availableBalance: number;
  lockedBalance: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

interface ZPointsBalance {
  currentPoints: number;
  totalEarned: number;
  totalRedeemed: number;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  nextLevelPoints: number;
  progressToNextLevel: number;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  discount: string;
  storeName: string;
  validUntil: Date;
  isRedeemed: boolean;
  redeemedAt?: Date;
}

interface Transaction {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'withdrawal';
  amount: number;
  description: string;
  timestamp: Date;
  orderId?: string;
  status: 'completed' | 'pending' | 'failed';
}

interface PartnerWalletProps {
  partnerId: string;
}

const PartnerWallet: React.FC<PartnerWalletProps> = ({ partnerId }) => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [zpointsBalance, setZpointsBalance] = useState<ZPointsBalance | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration - replace with actual API calls
  useEffect(() => {
    const mockWalletBalance: WalletBalance = {
      availableBalance: 1250.75,
      lockedBalance: 180.00,
      totalEarnings: 3420.50,
      thisMonthEarnings: 1250.75,
      lastMonthEarnings: 980.25
    };

    const mockZPointsBalance: ZPointsBalance = {
      currentPoints: 1250,
      totalEarned: 2800,
      totalRedeemed: 1550,
      level: 'Silver',
      nextLevelPoints: 2000,
      progressToNextLevel: 62.5
    };

    const mockRewards: Reward[] = [
      {
        id: 'reward_1',
        title: 'Coffee Shop Discount',
        description: 'Get 20% off on your next coffee purchase',
        pointsCost: 200,
        discount: '20% off',
        storeName: 'Campus Coffee Co.',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isRedeemed: false
      },
      {
        id: 'reward_2',
        title: 'Restaurant Voucher',
        description: '₹100 off on orders above ₹500',
        pointsCost: 300,
        discount: '₹100 off',
        storeName: 'Food Court Express',
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        isRedeemed: false
      },
      {
        id: 'reward_3',
        title: 'Stationery Store Credit',
        description: '₹50 credit for books and stationery',
        pointsCost: 150,
        discount: '₹50 credit',
        storeName: 'Academic Supplies',
        validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
        isRedeemed: true,
        redeemedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    ];

    const mockTransactions: Transaction[] = [
      {
        id: 'txn_1',
        type: 'earned',
        amount: 120.00,
        description: 'Delivery fee for order #ZP001',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        orderId: 'ZP001',
        status: 'completed'
      },
      {
        id: 'txn_2',
        type: 'bonus',
        amount: 50.00,
        description: 'First order bonus',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'completed'
      },
      {
        id: 'txn_3',
        type: 'earned',
        amount: 95.00,
        description: 'Delivery fee for order #ZP002',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        orderId: 'ZP002',
        status: 'completed'
      },
      {
        id: 'txn_4',
        type: 'withdrawal',
        amount: -500.00,
        description: 'Bank transfer to HDFC Bank',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        status: 'completed'
      }
    ];

    setWalletBalance(mockWalletBalance);
    setZpointsBalance(mockZPointsBalance);
    setRewards(mockRewards);
    setTransactions(mockTransactions);
  }, []);

  const handleRedeemReward = async (rewardId: string) => {
    try {
      setLoading(true);
      // Call API to redeem reward
      const response = await fetch(`/api/partners/${partnerId}/rewards/${rewardId}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        // Update local state
        setRewards(prev => prev.map(reward => 
          reward.id === rewardId 
            ? { ...reward, isRedeemed: true, redeemedAt: new Date() }
            : reward
        ));
        
        // Update ZPoints balance
        const reward = rewards.find(r => r.id === rewardId);
        if (reward && zpointsBalance) {
          setZpointsBalance(prev => prev ? {
            ...prev,
            currentPoints: prev.currentPoints - reward.pointsCost
          } : null);
        }
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to redeem reward');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawFunds = async (amount: number) => {
    try {
      setLoading(true);
      // Call API to withdraw funds
      const response = await fetch(`/api/partners/${partnerId}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
        credentials: 'include'
      });

      if (response.ok) {
        // Update local state
        if (walletBalance) {
          setWalletBalance(prev => prev ? {
            ...prev,
            availableBalance: prev.availableBalance - amount
          } : null);
        }
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to withdraw funds');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'Bronze': return 'text-amber-600';
      case 'Silver': return 'text-gray-600';
      case 'Gold': return 'text-yellow-600';
      case 'Platinum': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'redeemed': return <Gift className="h-4 w-4 text-blue-600" />;
      case 'bonus': return <Star className="h-4 w-4 text-yellow-600" />;
      case 'withdrawal': return <Wallet className="h-4 w-4 text-red-600" />;
      default: return <Coins className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!walletBalance || !zpointsBalance) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading wallet information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Partner Wallet</h1>
        <div className="flex space-x-3">
          <Button variant="outline" className="border-green-500 text-green-600">
            <History className="h-4 w-4 mr-2" />
            Transaction History
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Wallet className="h-4 w-4 mr-2" />
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{walletBalance.availableBalance.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ZPoints Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{zpointsBalance.currentPoints}</div>
            <p className="text-xs text-gray-500 mt-1">Available points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹{walletBalance.thisMonthEarnings.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Total earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wallet Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Wallet Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Earnings</span>
                  <span className="font-semibold">₹{walletBalance.totalEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Locked Funds</span>
                  <span className="font-semibold text-orange-600">₹{walletBalance.lockedBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Month</span>
                  <span className="font-semibold">₹{walletBalance.lastMonthEarnings.toFixed(2)}</span>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={() => handleWithdrawFunds(walletBalance.availableBalance)}
                    disabled={loading || walletBalance.availableBalance <= 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Withdraw ₹{walletBalance.availableBalance.toFixed(2)}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ZPoints Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>ZPoints Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Level</span>
                  <Badge className={`${getLevelColor(zpointsBalance.level)} bg-gray-100`}>
                    {zpointsBalance.level}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Earned</span>
                  <span className="font-semibold">{zpointsBalance.totalEarned}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Redeemed</span>
                  <span className="font-semibold">{zpointsBalance.totalRedeemed}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to {zpointsBalance.level === 'Platinum' ? 'Max' : 'Next Level'}</span>
                    <span>{zpointsBalance.progressToNextLevel}%</span>
                  </div>
                  <Progress value={zpointsBalance.progressToNextLevel} className="h-2" />
                  {zpointsBalance.level !== 'Platinum' && (
                    <p className="text-xs text-gray-500">
                      {zpointsBalance.nextLevelPoints - zpointsBalance.currentPoints} more points needed
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GiftIcon className="h-5 w-5" />
                <span>Available Rewards</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <Card key={reward.id} className={`${reward.isRedeemed ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-xs">
                          {reward.storeName}
                        </Badge>
                        {reward.isRedeemed && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Redeemed
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{reward.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-500">Cost:</span>
                        <span className="font-medium text-blue-600">{reward.pointsCost} ZPoints</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-500">Valid until:</span>
                        <span className="text-xs text-gray-500">
                          {reward.validUntil.toLocaleDateString()}
                        </span>
                      </div>
                      {!reward.isRedeemed && (
                        <Button
                          onClick={() => handleRedeemReward(reward.id)}
                          disabled={loading || zpointsBalance.currentPoints < reward.pointsCost}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Redeem Reward
                        </Button>
                      )}
                      {reward.isRedeemed && reward.redeemedAt && (
                        <p className="text-xs text-green-600 text-center">
                          Redeemed on {reward.redeemedAt.toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Recent Transactions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.timestamp.toLocaleString()}
                          {transaction.orderId && ` • Order ${transaction.orderId}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount >= 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <Badge 
                        variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Earnings Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">This Month</span>
                    <span className="font-semibold text-green-600">₹{walletBalance.thisMonthEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Month</span>
                    <span className="font-semibold">₹{walletBalance.lastMonthEarnings.toFixed(2)}</span>
                  </div>
                  <div className="pt-2">
                    <div className="text-sm text-gray-500">
                      {walletBalance.thisMonthEarnings > walletBalance.lastMonthEarnings ? (
                        <span className="text-green-600">
                          ↗ +{((walletBalance.thisMonthEarnings - walletBalance.lastMonthEarnings) / walletBalance.lastMonthEarnings * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-red-600">
                          ↘ {((walletBalance.lastMonthEarnings - walletBalance.thisMonthEarnings) / walletBalance.lastMonthEarnings * 100).toFixed(1)}%
                        </span>
                      )} vs last month
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Goals & Targets</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{zpointsBalance.currentPoints}</div>
                    <p className="text-sm text-gray-600">Current ZPoints</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Next Level: {zpointsBalance.level === 'Platinum' ? 'Max Level' : 'Gold'}</span>
                      <span>{zpointsBalance.progressToNextLevel}%</span>
                    </div>
                    <Progress value={zpointsBalance.progressToNextLevel} className="h-2" />
                  </div>
                  <div className="text-center">
                    <Button variant="outline" className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      View All Achievements
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <Button 
            onClick={() => setError(null)} 
            variant="ghost" 
            size="sm" 
            className="ml-2 text-red-700 hover:bg-red-200"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
};

export default PartnerWallet;
