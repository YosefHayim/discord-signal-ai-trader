import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Signal as SignalIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
import { SignalStatus } from '@/types';
import { formatDate, formatPrice, cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function Signals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const fromUrl = searchParams.get('status');
    return fromUrl && Object.values(SignalStatus).includes(fromUrl as SignalStatus)
      ? fromUrl
      : '';
  });
  const [page, setPage] = useState(() => {
    const fromUrl = Number(searchParams.get('page') ?? '0');
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : 0;
  });

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const nextStatus =
      urlStatus && Object.values(SignalStatus).includes(urlStatus as SignalStatus)
        ? urlStatus
        : '';
    const urlPageRaw = Number(searchParams.get('page') ?? '0');
    const nextPage = Number.isFinite(urlPageRaw) && urlPageRaw > 0 ? urlPageRaw : 0;

    if (nextStatus !== statusFilter) setStatusFilter(nextStatus);
    if (nextPage !== page) setPage(nextPage);
  }, [searchParams, statusFilter, page]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const currentStatus = searchParams.get('status') ?? '';
    const currentPage = searchParams.get('page') ?? '';
    const desiredPage = page > 0 ? String(page) : '';
    let changed = false;

    if (statusFilter !== currentStatus) {
      if (statusFilter) {
        next.set('status', statusFilter);
      } else {
        next.delete('status');
      }
      changed = true;
    }

    if (desiredPage !== currentPage) {
      if (page > 0) {
        next.set('page', String(page));
      } else {
        next.delete('page');
      }
      changed = true;
    }

    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [statusFilter, page, searchParams, setSearchParams]);

  const { data: signals, isLoading } = useQuery({
    queryKey: ['signals', statusFilter, page],
    queryFn: () =>
      api.getSignals({
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ['signalStats'],
    queryFn: api.getSignalStats,
    refetchInterval: 30000,
  });

  const totalPages = signals ? Math.ceil(signals.pagination.total / PAGE_SIZE) : 0;

  const getStatusBadge = (status: SignalStatus) => {
    const variants: Record<SignalStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      [SignalStatus.PENDING]: 'warning',
      [SignalStatus.PROCESSING]: 'secondary',
      [SignalStatus.PARSED]: 'default',
      [SignalStatus.EXECUTED]: 'success',
      [SignalStatus.SKIPPED]: 'secondary',
      [SignalStatus.FAILED]: 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Signals</h1>
          <p className="text-muted-foreground">Trading signals received from Discord</p>
        </div>
        {stats && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="success">{stats.executed} Executed</Badge>
            <Badge variant="warning">{stats.pending} Pending</Badge>
            <Badge variant="destructive">{stats.failed} Failed</Badge>
            <Badge variant="secondary">{stats.skipped} Skipped</Badge>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <SignalIcon className="h-5 w-5" />
              Signal History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="w-40"
                aria-label="Filter by status"
              >
                <option value="">All Status</option>
                {Object.values(SignalStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
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
          ) : signals?.data.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No signals found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals?.data.map((signal) => (
                    <TableRow key={signal._id || signal.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(signal.receivedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{signal.source.replace('discord_', '')}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {signal.parsed?.symbol || '-'}
                      </TableCell>
                      <TableCell>
                        {signal.parsed?.action ? (
                          <Badge
                            variant={signal.parsed.action === 'LONG' ? 'success' : 'destructive'}
                          >
                            {signal.parsed.action}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {signal.parsed?.entry ? `$${formatPrice(signal.parsed.entry)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {signal.parsed?.confidence ? (
                          <span
                            className={cn(
                              signal.parsed.confidence >= 80
                                ? 'text-green-500'
                                : signal.parsed.confidence >= 60
                                ? 'text-yellow-500'
                                : 'text-red-500'
                            )}
                          >
                            {signal.parsed.confidence}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(signal.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}-
                    {Math.min((page + 1) * PAGE_SIZE, signals?.pagination.total || 0)} of{' '}
                    {signals?.pagination.total || 0}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Next page"
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
