import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { api } from '@/lib/api';
import { TradeStatus, Exchange } from '@/types';
import { formatDate, formatPrice, formatPercentage, getPnlColor, cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function Trades() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const { data: trades, isLoading } = useQuery({
    queryKey: ['trades', statusFilter, exchangeFilter, page],
    queryFn: () =>
      api.getTrades({
        status: statusFilter || undefined,
        exchange: exchangeFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ['tradeStats'],
    queryFn: api.getTradeStats,
    refetchInterval: 30000,
  });

  const totalPages = trades ? Math.ceil(trades.pagination.total / PAGE_SIZE) : 0;

  const getStatusBadge = (status: TradeStatus) => {
    const variants: Record<
      TradeStatus,
      'default' | 'secondary' | 'success' | 'warning' | 'destructive'
    > = {
      [TradeStatus.PENDING]: 'warning',
      [TradeStatus.OPEN]: 'default',
      [TradeStatus.PARTIALLY_FILLED]: 'secondary',
      [TradeStatus.FILLED]: 'success',
      [TradeStatus.CANCELLED]: 'secondary',
      [TradeStatus.FAILED]: 'destructive',
      [TradeStatus.CLOSED]: 'secondary',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trades</h1>
          <p className="text-muted-foreground">Historical trade execution records</p>
        </div>
        {stats && (
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div className={cn('text-lg font-bold', getPnlColor(stats.totalPnl))}>
                ${formatPrice(stats.totalPnl)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-lg font-bold">{stats.winRate.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Trade History
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="w-36"
              >
                <option value="">All Status</option>
                {Object.values(TradeStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Select
                value={exchangeFilter}
                onChange={(e) => {
                  setExchangeFilter(e.target.value);
                  setPage(0);
                }}
                className="w-32"
              >
                <option value="">All Exchanges</option>
                {Object.values(Exchange).map((exchange) => (
                  <option key={exchange} value={exchange}>
                    {exchange}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : trades?.data.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No trades found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades?.data.map((trade) => (
                    <TableRow key={trade._id || trade.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(trade.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trade.exchange}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'BUY' ? 'success' : 'destructive'}>
                          {trade.side}
                        </Badge>
                      </TableCell>
                      <TableCell>${formatPrice(trade.entryPrice)}</TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell>
                        {trade.pnl !== undefined ? (
                          <div className={cn('font-medium', getPnlColor(trade.pnl))}>
                            ${formatPrice(trade.pnl)}
                            {trade.pnlPercentage !== undefined && (
                              <span className="ml-1 text-xs">
                                ({formatPercentage(trade.pnlPercentage)})
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(trade.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}-
                    {Math.min((page + 1) * PAGE_SIZE, trades?.pagination.total || 0)} of{' '}
                    {trades?.pagination.total || 0}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
