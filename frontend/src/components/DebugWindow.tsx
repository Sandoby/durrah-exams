import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
  data?: any;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: DebugLog[] = [];
  private maxLogs = 100;
  private listeners: Set<(logs: DebugLog[]) => void> = new Set();

  private constructor() {
    // Intercept console methods
    this.setupConsoleInterception();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private setupConsoleInterception() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      this.addLog('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      this.addLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      this.addLog('warning', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), args);
    };
  }

  addLog(level: DebugLog['level'], message: string, data?: any) {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data,
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notifyListeners();
  }

  subscribe(listener: (logs: DebugLog[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.logs);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  copy() {
    const text = this.logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }
}

export function DebugWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const debugLogger = DebugLogger.getInstance();

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLevelBgColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'success':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b border-gray-300 rounded-t-lg">
        <h3 className="font-bold text-sm">Debug Console ({logs.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => debugLogger.copy()}
            className="p-1 hover:bg-gray-200 rounded transition"
            title="Copy logs"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => debugLogger.clear()}
            className="p-1 hover:bg-gray-200 rounded transition"
            title="Clear logs"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-200 rounded transition"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="h-80 overflow-y-auto p-2 space-y-1 bg-white text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400 p-2">Waiting for logs...</div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border-l-4 ${getLevelBgColor(log.level)}`}
              >
                <div className={`${getLevelColor(log.level)} font-bold`}>
                  [{log.timestamp}] {log.level.toUpperCase()}
                </div>
                <div className="text-gray-800 break-words">{log.message}</div>
                {log.data && (
                  <details className="text-gray-600 mt-1 cursor-pointer">
                    <summary>View data</summary>
                    <pre className="bg-gray-100 p-1 mt-1 overflow-auto text-xs">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
