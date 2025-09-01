import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  History, 
  Plus, 
  Minus,
  ShoppingCart,
  Clock
} from 'lucide-react';

interface ZPointsTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  description: string;
  orderId?: string;
  createdAt: string;
}

interface UserWalletProps {
  userId: string;
  showHistory?: boolean;
}

export const UserWallet: React.FC<UserWalletProps> = ({ userId, showHistory = true }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch ZPoints balance
  const { data: balance = 0, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/users', userId, 'zpoints'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/zpoints`);
      return response.balance || 0;
    },
    enabled: !!userId,
  });

  // Fetch transaction history
  const { data: transactions = [], refetch: refetchHistory } = useQuery({
    queryKey: ['/api/users', userId, 'zpoints', 'history'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/zpoints/history?limit=20`);
      return response.transactions || [];
    },
    enabled: !!userId && showHistory,
  });

  // Pay with ZPoints mutation
  const payWithZPointsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('POST', `/api/orders/${orderId}/pay-with-zpoints`);
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful",
        description: `Order paid with ${data.zpointsUsed} ZPoints. New balance: ${data.newBalance} ZPoints`,
      });
      refetchBalance();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to pay with ZPoints",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <Minus className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* ZPoints Balance Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-purple-600" />
            <span>ZPoints Wallet</span>
            <Badge variant="secondary" className="ml-auto">
              {balance} ZPoints
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="text-2xl font-bold text-purple-600">{balance}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">1 ZPoint = ₹1</span>
              <span className="text-muted-foreground">≈ ₹{balance}</span>
            </div>

            {balance === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  💡 You have no ZPoints. Contact admin to get ZPoints or use other payment methods.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-blue-600" />
                <span>Transaction History</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(isExpanded ? transactions : transactions.slice(0, 5)).map((transaction: ZPointsTransaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'credit' ? '+' : '-'}{transaction.amount} ZPoints
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {transaction.balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => {
                // This would open a modal or navigate to a page to request ZPoints
                toast({
                  title: "Contact Admin",
                  description: "Please contact admin to request ZPoints",
                });
              }}
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Request ZPoints</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => {
                // This would show ZPoints usage guide
                toast({
                  title: "ZPoints Guide",
                  description: "1 ZPoint = ₹1. Use ZPoints to pay for orders when you don't have cash!",
                });
              }}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">How to Use</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserWallet;
