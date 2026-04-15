import { useEffect, useRef, useCallback } from 'react';
import { Trade, ExchangeConnection } from '../types';
import { fetchNewTrades } from '../services/exchangeService';

interface UseAutoSyncOptions {
    enabled: boolean;
    exchangeConnections: ExchangeConnection[];
    existingTrades: Trade[];
    onNewTrades: (trades: Trade[]) => void;
    intervalMs?: number;
}

export function useAutoSync({
    enabled,
    exchangeConnections,
    existingTrades,
    onNewTrades,
    intervalMs = 30_000,
}: UseAutoSyncOptions) {
    const isSyncing = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSyncRef = useRef<string | null>(null);
    // Keep a ref to existingTrades so the sync callback always sees latest
    const tradesRef = useRef(existingTrades);
    tradesRef.current = existingTrades;

    const syncOnce = useCallback(async () => {
        if (isSyncing.current || exchangeConnections.length === 0) return;
        isSyncing.current = true;
        console.log('[AutoSync] 开始同步...');

        // sinceDate: use last sync time, or fallback to 7 days ago
        const sinceDate = lastSyncRef.current
            ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        try {
            const allNew: Trade[] = [];

            for (const conn of exchangeConnections) {
                if (!conn.isConnected || !conn.apiKey || !conn.apiSecret) continue;
                try {
                    const trades = await fetchNewTrades(
                        conn.apiKey,
                        conn.apiSecret,
                        sinceDate,
                    );
                    allNew.push(...trades);
                } catch (err) {
                    console.warn(`[AutoSync] ${conn.exchange} 同步失败:`, err);
                }
            }
            if (allNew.length > 0) {
                // Dedup: DB trades have UUID ids, Binance trades have "binance-*" ids
                // Use symbol+entryDate+direction+entryPrice as composite key
                const tradeKey = (t: Trade) =>
                    `${t.symbol}|${t.entryDate}|${t.direction}|${t.entryPrice}`;
                const existingKeys = new Set(tradesRef.current.map(tradeKey));
                const unique = allNew.filter(t => !existingKeys.has(tradeKey(t)));

                if (unique.length > 0) {
                    console.log(`[AutoSync] 发现 ${unique.length} 笔新交易`);
                    onNewTrades(unique);
                }
            }

            lastSyncRef.current = new Date().toISOString();
        } catch (err) {
            console.error('[AutoSync] 同步出错:', err);
        } finally {
            isSyncing.current = false;
        }
    }, [exchangeConnections, onNewTrades]);

    const startPolling = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Sync immediately, then every intervalMs
        syncOnce();
        intervalRef.current = setInterval(syncOnce, intervalMs);
    }, [syncOnce, intervalMs]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            stopPolling();
            return;
        }

        // Start polling when enabled and page is visible
        if (document.visibilityState === 'visible') {
            startPolling();
        }

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                startPolling();
            } else {
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [enabled, startPolling, stopPolling]);
}
