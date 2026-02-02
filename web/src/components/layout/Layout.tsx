import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { socketManager } from '@/lib/socket';
import { api } from '@/lib/api';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    socketManager.connect();
    setIsConnected(socketManager.isConnected());

    const interval = setInterval(() => {
      setIsConnected(socketManager.isConnected());
    }, 1000);

    const unsubscribe = socketManager.on<{ isPaused: boolean }>('processing:status', (data) => {
      setIsPaused(data.isPaused);
    });

    api.getStatus().then((status) => {
      setIsPaused(status.trading.isPaused);
    }).catch(console.error);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await api.resume();
        setIsPaused(false);
      } else {
        await api.pause();
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          isConnected={isConnected}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
