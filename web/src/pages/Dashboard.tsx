import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import type { Position, QueueStats } from '@/types';
import { formatPrice, formatPercentage, getPnlColor, cn } from '@/lib/utils';

function ConnectionStatus({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {connected ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p
            className={cn(
              'text-xs',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
              (!trend || trend === 'neutral') && 'text-muted-foreground'
            )}
          >
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 10000,
  });

  const { data: signalStats } = useQuery({
    queryKey: ['signalStats'],
    queryFn: api.getSignalStats,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const unsubPositions = socketManager.on<{ positions: Position[] }>('positions:update', (data) => {
      setPositions(data.positions);
    });

    const unsubQueue = socketManager.on<QueueStats>('queue:update', (data) => {
      setQueueStats(data);
    });

    api.getPositions().then((res) => setPositions(res.data)).catch(console.error);

    return () => {
      unsubPositions();
      unsubQueue();
    };
  }, []);

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of your trading bot</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Positions"
          value={positions.length}
          icon={Wallet}
          description={`${status?.trading.simulationMode ? 'Simulation' : 'Live'} mode`}
        />
        <StatCard
          title="Unrealized P&L"
          value={`$${formatPrice(totalUnrealizedPnl)}`}
          icon={totalUnrealizedPnl >= 0 ? TrendingUp : TrendingDown}
          trend={totalUnrealizedPnl > 0 ? 'up' : totalUnrealizedPnl < 0 ? 'down' : 'neutral'}
          description={positions.length > 0 ? `${positions.length} active positions` : 'No positions'}
        />
        <StatCard
          title="Queue"
          value={queueStats?.waiting || status?.queue.waiting || 0}
          icon={Clock}
          description={`${queueStats?.active || status?.queue.active || 0} processing`}
        />
        <StatCard
          title="Signals Today"
          value={signalStats ? signalStats.executed + signalStats.pending : 0}
          icon={Zap}
          description={`${signalStats?.executed || 0} executed`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConnectionStatus label="Discord" connected={status?.connections.discord ?? false} />
            <ConnectionStatus label="Database" connected={status?.connections.database ?? false} />
            <ConnectionStatus label="Binance" connected={status?.connections.binance ?? false} />
            <ConnectionStatus label="IBKR" connected={status?.connections.ibkr ?? false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trading Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mode</span>
              <Badge variant={status?.trading.simulationMode ? 'warning' : 'success'}>
                {status?.trading.simulationMode ? 'Simulation' : 'Live'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status?.trading.isPaused ? 'destructive' : 'success'}>
                {status?.trading.isPaused ? 'Paused' : 'Active'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence Threshold</span>
              <span className="text-sm font-medium">{status?.trading.confidenceThreshold || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Default Position Size</span>
              <span className="text-sm font-medium">${status?.trading.defaultPositionSize || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Default Leverage</span>
              <span className="text-sm font-medium">{status?.trading.defaultLeverage || 1}x</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{position.symbol}</span>
                        <Badge variant={position.side === 'LONG' ? 'success' : 'destructive'}>
                          {position.side}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Entry: ${formatPrice(position.entryPrice)} · {position.leverage}x
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn('font-semibold', getPnlColor(position.unrealizedPnl || 0))}>
                      ${formatPrice(position.unrealizedPnl || 0)}
                    </div>
                    <div className={cn('text-sm', getPnlColor(position.unrealizedPnlPercentage || 0))}>
                      {formatPercentage(position.unrealizedPnlPercentage || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
