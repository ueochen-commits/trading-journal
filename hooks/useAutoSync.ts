import { useEffect, useRef, useCallback } from 'react';
import { Trade, ExchangeConnection, TradingAccount } from '../types';
import { fetchNewTrades } from '../services/exchangeService';

interface UseAutoSyncOptions {
    enabled: boolean;
    exchangeConnections: ExchangeConnection[];
    tradingAccounts: TradingAccount[];
    existingTrades: Trade[];
    onNewTrades: (trades: Trade[]) => void;
    intervalMs?: number;
}

export function useAutoSync({
    enabled,
    exchangeConnections,
    tradingAccounts,
    existingTrades,
    onNewTrades,
    intervalMs = 30_000,
}: UseAutoSyncOptions) {
    const isSyncing = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSyncRef = useRef<string | null>(null);
    const tradesRef = useRef(existingTrades);
    tradesRef.current = existingTrades;
    const accountsRef = useRef(tradingAccounts);
    accountsRef.current = tradingAccounts;

    const syncOnce = useCallback(async () => {
        if (isSyncing.current) {
            console.log('[AutoSync] 跳过：正在同步中');
            return;
        }
        if (exchangeConnections.length === 0) {
            console.log('[AutoSync] 跳过：没有 exchangeConnections');
            return;
        }
        isSyncing.current = true;

        const sinceDate = lastSyncRef.current
            ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        console.log('[AutoSync] 开始同步...', {
            connections: exchangeConnections.length,
            sinceDate,
            existingTrades: tradesRef.current.length,
        });

        try {
            const allNew: Trade[] = [];

            for (const conn of exchangeConnections) {
                const hasKey = conn.apiKey && conn.apiKey.length > 10 && !conn.apiKey.includes('...');
                const hasSecret = conn.apiSecret && conn.apiSecret !== '***' && conn.apiSecret.length > 10;

                if (!conn.isConnected || !hasKey || !hasSecret) {
                    console.log(`[AutoSync] 跳过 ${conn.exchange}：凭证无效或未连接`);
                    continue;
                }

                // 通过 exchangeConnectionId 找到对应的 trading account
                const account = accountsRef.current.find(a => a.exchangeConnectionId === conn.id);
                const accountId = account?.id;
                console.log(`[AutoSync] 连接 ${conn.exchange}: accountId=${accountId || '未找到'}`);

                try {
                    const trades = await fetchNewTrades(
                        conn.apiKey,
                        conn.apiSecret,
                        sinceDate,
                        accountId,
                    );
                    console.log(`[AutoSync] ${conn.exchange} 返回 ${trades.length} 笔交易`);
                    allNew.push(...trades);
                } catch (err) {
                    console.warn(`[AutoSync] ${conn.exchange} 同步失败:`, err);
                }
            }

            if (allNew.length > 0) {
                const tradeKey = (t: Trade) =>
                    `${t.symbol}|${t.entryDate}|${t.direction}|${t.entryPrice}`;
                const existingKeys = new Set(tradesRef.current.map(tradeKey));
                const unique = allNew.filter(t => !existingKeys.has(tradeKey(t)));

                console.log(`[AutoSync] 去重结果: ${allNew.length} 总计, ${unique.length} 新交易`);

                if (unique.length > 0) {
                    console.log('[AutoSync] 导入新交易:', unique.map(t => `${t.symbol} ${t.direction} ${t.entryDate}`));
                    onNewTrades(unique);
                }
            } else {
                console.log('[AutoSync] 没有获取到任何交易');
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
        console.log('[AutoSync] Effect 触发:', { enabled, connectionsCount: exchangeConnections.length });
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
