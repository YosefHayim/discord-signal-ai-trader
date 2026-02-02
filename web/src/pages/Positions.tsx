import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, X, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import type { Position, PositionSide } from '@/types';
import { formatPrice, formatPercentage, formatDate, getPnlColor, cn } from '@/lib/utils';

export function Positions() {
  const queryClient = useQueryClient();
  const [positions, setPositions] = useState<Position[]>([]);
  const [closingPosition, setClosingPosition] = useState<string | null>(null);

  const { data: positionsData, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: api.getPositions,
  });

  const { data: historyData } = useQuery({
    queryKey: ['positionHistory'],
    queryFn: () => api.getPositionHistory({ limit: 10 }),
  });

  useEffect(() => {
    if (positionsData) {
      setPositions(positionsData.data);
    }
  }, [positionsData]);

  useEffect(() => {
    const unsub = socketManager.on<{ positions: Position[] }>('positions:update', (data) => {
      setPositions(data.positions);
    });
    return () => unsub();
  }, []);

  const closePositionMutation = useMutation({
    mutationFn: ({ symbol, side }: { symbol: string; side: PositionSide }) =>
      api.closePosition(symbol, side),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['positionHistory'] });
      setClosingPosition(null);
    },
    onError: (error) => {
      console.error('Failed to close position:', error);
      setClosingPosition(null);
    },
  });

  const handleClosePosition = (symbol: string, side: PositionSide) => {
    setClosingPosition(`${symbol}-${side}`);
    closePositionMutation.mutate({ symbol, side });
  };

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Positions</h1>
          <p className="text-muted-foreground">Manage your open trading positions</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Unrealized P&L</div>
            <div className={cn('text-lg font-bold', getPnlColor(totalUnrealizedPnl))}>
              ${formatPrice(totalUnrealizedPnl)}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Open Positions ({positions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : positions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No open positions</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Leverage</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{position.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {position.exchange}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.side === 'LONG' ? 'success' : 'destructive'}>
                        {position.side === 'LONG' ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {position.side}
                      </Badge>
                    </TableCell>
                    <TableCell>${formatPrice(position.entryPrice)}</TableCell>
                    <TableCell>
                      ${formatPrice(position.currentPrice || position.entryPrice)}
                    </TableCell>
                    <TableCell>{position.quantity}</TableCell>
                    <TableCell>{position.leverage}x</TableCell>
                    <TableCell>
                      <div className={cn('font-medium', getPnlColor(position.unrealizedPnl || 0))}>
                        ${formatPrice(position.unrealizedPnl || 0)}
                        <span className="ml-1 text-xs">
                          ({formatPercentage(position.unrealizedPnlPercentage || 0)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleClosePosition(position.symbol, position.side)}
                        disabled={closingPosition === `${position.symbol}-${position.side}`}
                      >
                        {closingPosition === `${position.symbol}-${position.side}` ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <X className="mr-1 h-3 w-3" />
                            Close
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {historyData && historyData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Closed Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Closed</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.data
                  .filter((p) => p.status === 'closed')
                  .slice(0, 5)
                  .map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="whitespace-nowrap">
                        {position.closedAt ? formatDate(position.closedAt) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={position.side === 'LONG' ? 'success' : 'destructive'}>
                          {position.side}
                        </Badge>
                      </TableCell>
                      <TableCell>${formatPrice(position.entryPrice)}</TableCell>
                      <TableCell>
                        ${formatPrice(position.currentPrice || position.entryPrice)}
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-medium', getPnlColor(position.unrealizedPnl || 0))}>
                          ${formatPrice(position.unrealizedPnl || 0)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
