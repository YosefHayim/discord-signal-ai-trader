import { Menu, Wifi, WifiOff, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  isConnected: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
}

export function Header({ onMenuClick, isConnected, isPaused, onTogglePause }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="lg:hidden" aria-label="Open sidebar">
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold hidden sm:block">Discord Signal AI Trader</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline text-green-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="hidden sm:inline text-red-500">Disconnected</span>
            </>
          )}
        </div>

        <Button
          variant={isPaused ? 'default' : 'destructive'}
          size="sm"
          onClick={onTogglePause}
          className={cn('gap-2')}
          aria-label={isPaused ? 'Resume processing' : 'Pause processing'}
        >
          {isPaused ? (
            <>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Resume</span>
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pause</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
