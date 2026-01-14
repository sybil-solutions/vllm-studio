'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  FileText,
  Settings,
  MessageSquare,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wrench,
  Compass,
  Plus,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import type { ChatSession } from '@/lib/types';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/recipes', label: 'Recipes', icon: Wrench },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/logs', label: 'Logs', icon: FileText },
  { href: '/usage', label: 'Usage', icon: BarChart3 },
  { href: '/configs', label: 'Configs', icon: Settings },
];

interface AppSidebarProps {
  children: React.ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState<{ online: boolean; inferenceOnline: boolean; model?: string }>({
    online: false,
    inferenceOnline: false,
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(true);
  const loadingSessionsRef = useRef(false);
  const router = useRouter();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load collapsed state from localStorage
  useEffect(() => {
    if (!isMobile) {
      const saved = localStorage.getItem('app-sidebar-collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    }
  }, [isMobile]);

  // Save collapsed state
  const toggleCollapsed = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    if (!isMobile) {
      localStorage.setItem('app-sidebar-collapsed', String(newVal));
    }
  };

  // Check status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await api.getHealth();
        setStatus({
          online: health.status === 'ok',
          inferenceOnline: health.backend_reachable,
          model: health.running_model?.split('/').pop(),
        });
      } catch {
        setStatus({ online: false, inferenceOnline: false });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    // Also check when page becomes visible (mobile PWA support)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Load chat sessions once when on chat page
  useEffect(() => {
    if (pathname === '/chat' && !loadingSessionsRef.current) {
      loadingSessionsRef.current = true;
      api.getChatSessions()
        .then(result => setChatSessions(result.sessions || []))
        .catch(() => setChatSessions([]))
        .finally(() => {
          loadingSessionsRef.current = false;
        });
    }
  }, [pathname]);

  const createNewChat = () => {
    router.push('/chat?new=1');
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? 'fixed left-0 top-0 bottom-0 z-50' : 'relative'}
          ${isMobile && !mobileOpen ? '-translate-x-full' : 'translate-x-0'}
          ${collapsed && !isMobile ? 'w-16' : 'w-56'}
          flex-shrink-0 bg-[#1a1917] border-r border-[#2a2725]
          flex flex-col transition-all duration-200 ease-out
        `}
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        {/* Logo */}
        <div className={`flex items-center h-14 px-3 border-b border-[#2a2725] ${collapsed && !isMobile ? 'justify-center' : 'gap-2'}`}>
          <Layers className="h-6 w-6 text-[var(--link)] flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="font-semibold text-sm truncate">vLLM Studio</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isChat = item.href === '/chat';

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors
                    ${isActive
                      ? 'bg-[var(--accent)] text-[var(--foreground)]'
                      : 'text-[#9a9590] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/50'
                    }
                    ${collapsed && !isMobile ? 'justify-center' : ''}
                  `}
                  title={collapsed && !isMobile ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>

                {/* Chat sessions section */}
                {isChat && pathname === '/chat' && (!collapsed || isMobile) && (
                  <div className="ml-2 mt-2 mb-2">
                    <button
                      onClick={createNewChat}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm font-medium mb-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Chat
                    </button>

                    {chatSessions.length > 0 && (
                      <>
                        <button
                          onClick={() => setChatHistoryOpen(!chatHistoryOpen)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[#9a9590] hover:text-[var(--foreground)] text-sm"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${chatHistoryOpen ? '' : '-rotate-90'}`} />
                          <span>Your chats</span>
                        </button>

                        {chatHistoryOpen && (
                          <div className="space-y-0.5 max-h-96 overflow-y-auto">
                            {chatSessions.map((session) => (
                              <Link
                                key={session.id}
                                href={`/chat?session=${session.id}`}
                                className="block px-3 py-2 text-sm text-[#e0e0e0] hover:text-white truncate"
                              >
                                {session.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </nav>

        {/* Status */}
        <div className={`px-3 py-3 border-t border-[#2a2725] ${collapsed && !isMobile ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-2 ${collapsed && !isMobile ? '' : ''}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              status.inferenceOnline ? 'bg-[var(--success)]' : status.online ? 'bg-yellow-500' : 'bg-[var(--error)]'
            }`} />
            {(!collapsed || isMobile) && (
              <span className="text-xs text-[#9a9590] truncate">
                {status.inferenceOnline
                  ? (status.model || 'Ready')
                  : status.online
                    ? 'No model'
                    : 'Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Collapse toggle - desktop only */}
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            className="absolute -right-3 top-20 w-6 h-6 bg-[#1a1917] border border-[#2a2725] rounded-full flex items-center justify-center hover:bg-[#2a2725] transition-colors shadow-lg"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-[#9a9590]" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 text-[#9a9590]" />
            )}
          </button>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-[var(--background)]">
        {/* Mobile header */}
        {isMobile && (
          <div className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0))' }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1 -ml-1 rounded hover:bg-[var(--accent)]"
            >
              <Layers className="h-5 w-5 text-[var(--link)]" />
            </button>
            <span className="font-medium text-sm">
              {navItems.find(item => item.href === pathname)?.label || 'vLLM Studio'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status.inferenceOnline ? 'bg-[var(--success)]' : status.online ? 'bg-yellow-500' : 'bg-[var(--error)]'
              }`} />
              <span className="text-xs text-[#9a9590]">
                {status.inferenceOnline ? (status.model?.slice(0, 15) || 'Ready') : status.online ? 'No model' : 'Offline'}
              </span>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
