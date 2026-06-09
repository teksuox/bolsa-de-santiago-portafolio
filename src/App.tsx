/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import Header from './components/Header';
import MyPortfolio from './components/MyPortfolio';
import MarketWatch from './components/MarketWatch';
import DividendTracker from './components/DividendTracker';
import TaxRefunds from './components/TaxRefunds';
import ChartsAndAnalytics from './components/ChartsAndAnalytics';
import PocketBaseSync from './components/PocketBaseSync';
import { pb } from './lib/pocketbase';
import { DBBackupData } from './db';

import { StockHolding, DividendPayment, TaxRefund, MarketStock, StockAlert } from './types';
import {
  INITIAL_MARKET_STOCKS
} from './data';
import { portafolioDB } from './db';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // States initialized as empty arrays
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [dividends, setDividends] = useState<DividendPayment[]>([]);
  const [refunds, setRefunds] = useState<TaxRefund[]>([]);
  const [annualPerformancePercent, setAnnualPerformancePercent] = useState<number>(8.5);

  // Master market reference rates
  const [marketStocks, setMarketStocks] = useState<MarketStock[]>(() => {
    try {
      const saved = localStorage.getItem('custom_searched_stocks');
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any duplicates
        const customOnly = parsed.filter((cs: MarketStock) => cs && cs.ticker && !INITIAL_MARKET_STOCKS.some(s => s.ticker === cs.ticker));
        return [...INITIAL_MARKET_STOCKS, ...customOnly];
      }
    } catch (e) {
      console.warn('Error reading custom_searched_stocks:', e);
    }
    return INITIAL_MARKET_STOCKS;
  });
  const [isSyncingDividends, setIsSyncingDividends] = useState<boolean>(false);

  // Price alerts and voice/audio notifications state
  const [alerts, setAlerts] = useState<StockAlert[]>(() => {
    try {
      const saved = localStorage.getItem('market_price_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [firedNotificationMessages, setFiredNotificationMessages] = useState<{ id: string; ticker: string; message: string }[]>([]);

  // Sync alerts state to localStorage
  useEffect(() => {
    localStorage.setItem('market_price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Synthesized double-pitch notification chime
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(392.00, now); // G4
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18); // C6

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  const handleToggleAlert = (ticker: string, currentPrice: number) => {
    setAlerts(prev => {
      const exists = prev.some(a => a.ticker === ticker);
      if (exists) {
        return prev.filter(a => a.ticker !== ticker);
      } else {
        return [...prev, {
          ticker,
          starredPrice: currentPrice,
          targetPrice: Math.round(currentPrice * 0.98), // Default threshold 2% below baseline
          triggered: false
        }];
      }
    });
  };

  const handleUpdateTargetPrice = (ticker: string, targetPrice: number) => {
    setAlerts(prev => {
      return prev.map(a => {
        if (a.ticker === ticker) {
          return {
            ...a,
            targetPrice,
            triggered: false, // Reset trigger when target price edited
            lastTriggeredAt: undefined
          };
        }
        return a;
      });
    });
  };

  const handleResetAlert = (ticker: string) => {
    setAlerts(prev => {
      return prev.map(a => {
        if (a.ticker === ticker) {
          return {
            ...a,
            triggered: false,
            lastTriggeredAt: undefined
          };
        }
        return a;
      });
    });
  };

  // Check alert triggers whenever market prices are fetched or updated
  useEffect(() => {
    if (marketStocks.length === 0) return;

    setAlerts(prevAlerts => {
      if (prevAlerts.length === 0) return prevAlerts;
      
      let triggerOccurred = false;
      const newMessages: { id: string; ticker: string; message: string }[] = [];

      const updated = prevAlerts.map(alert => {
        const stock = marketStocks.find(s => s.ticker === alert.ticker);
        if (!stock) return alert;

        // Trigger condition: current price <= targetPrice and not yet triggered
        if (stock.price <= alert.targetPrice && !alert.triggered) {
          triggerOccurred = true;
          newMessages.push({
            id: `${alert.ticker}-${Date.now()}-${Math.random()}`,
            ticker: alert.ticker,
            message: `La acción chilena ${alert.ticker} ha caído bajo el precio límite de ${alert.targetPrice.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}. ¡Precio actual: ${stock.price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}!`
          });
          return {
            ...alert,
            triggered: true,
            lastTriggeredAt: new Date().toLocaleTimeString()
          };
        }
        return alert;
      });

      if (triggerOccurred) {
        // Play the alert audio
        playAlertSound();
        // Append alert visual cards
        setFiredNotificationMessages(prev => [...prev, ...newMessages]);
        return updated;
      }

      return prevAlerts;
    });
  }, [marketStocks]);

  // Real-time auto-refresh trackers
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronize stock rates and indicator data in the background from Yahoo Finance
  const handleRefreshMarketData = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      // Collect additional tickers to fetch
      const additionalTickersSet = new Set<string>();
      
      // Load custom searched ones
      try {
        const saved = localStorage.getItem('custom_searched_stocks');
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            if (s && s.ticker) additionalTickersSet.add(s.ticker.toUpperCase());
          });
        }
      } catch (e) {
        console.warn('Error reading custom searched tickers in refresh:', e);
      }

      // Load owned ones
      holdings.forEach(h => {
        if (h && h.ticker) additionalTickersSet.add(h.ticker.toUpperCase());
      });

      const standardTickers = ["CHILE", "SQM-B", "ENELCHILE", "CENCOSHOP", "COPEC", "VAPORES", "BSANTANDER", "CMPC", "FALABELLA", "ANDINA-B"];
      const additionalList = Array.from(additionalTickersSet)
        .filter(t => !standardTickers.includes(t));

      const queryUrl = additionalList.length > 0
        ? `/api/market-stocks?additional=${encodeURIComponent(additionalList.join(','))}`
        : '/api/market-stocks';

      const marketResponse = await fetch(queryUrl);
      if (marketResponse.ok) {
        const quotes = await marketResponse.json();
        if (quotes && quotes.length > 0) {
          // 1. Update Market reference list
          setMarketStocks(prev => {
            const customStocks = prev.filter(p => !quotes.some((q: any) => q.ticker === p.ticker));
            const updatedList = [...quotes, ...customStocks];
            
            // Sync updated custom stock details back to localStorage to preserve latest price/yield
            const finalCustomSavedList = updatedList.filter(s => !standardTickers.includes(s.ticker));
            if (finalCustomSavedList.length > 0) {
              try {
                localStorage.setItem('custom_searched_stocks', JSON.stringify(finalCustomSavedList));
              } catch (e) {
                console.warn('Error saving updated custom_searched_stocks:', e);
              }

              // Sync to IndexedDB for complete persistence/cloud backup
              for (const s of finalCustomSavedList) {
                portafolioDB.saveCustomStock(s).catch(err => console.error('Error auto-syncing custom stock to DB during refresh:', err));
              }
            }
            return updatedList;
          });

          // 2. Refresh active holdings pricing
          setHoldings(prev => {
            return prev.map(h => {
              const quote = quotes.find((q: any) => q.ticker === h.ticker);
              if (!quote) return h;
              const updated = {
                ...h,
                currentPrice: quote.price || h.currentPrice
              };
              portafolioDB.saveHolding(updated); // Save updated price to IndexedDB
              return updated;
            });
          });
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.warn('Error fetching live background updates:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Setup periodic polling interval (automatic sync every 45 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefreshMarketData(true); // Silent background refresh
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Keep track of deleted market tickers persistently (Chile Bolsa layout)
  const [deletedStocks, setDeletedStocks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deleted_market_tickers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDeleteMarketStock = (ticker: string) => {
    const isOwned = holdings.some(h => h.ticker === ticker);
    if (isOwned) {
      return;
    }
    setDeletedStocks(prev => {
      const updated = prev.includes(ticker) ? prev : [...prev, ticker];
      localStorage.setItem('deleted_market_tickers', JSON.stringify(updated));
      portafolioDB.saveDeletedTickers(updated).catch(err => console.error('Error saving deleted stocks to IndexedDB:', err));
      return updated;
    });
  };

  const handleRestoreAllMarketStocks = () => {
    setDeletedStocks([]);
    localStorage.removeItem('deleted_market_tickers');
    portafolioDB.saveDeletedTickers([]).catch(err => console.error('Error clearing deleted stocks in IndexedDB:', err));
  };

  // Synchronize dividends from Chile corporate actions (Yahoo F.) based on holdings
  const handleSyncDividends = async (overrideHoldings?: StockHolding[]) => {
    const listToSync = overrideHoldings || holdings;
    if (listToSync.length === 0) return;

    setIsSyncingDividends(true);
    try {
      const response = await fetch('/api/sync-dividends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: listToSync.map(h => ({
            ticker: h.ticker,
            buyDate: h.buyDate,
            shares: h.shares
          }))
        })
      });

      if (response.ok) {
        const synced: DividendPayment[] = await response.json();
        if (synced && synced.length > 0) {
          // Merge with current state dividends to preserve any existing user entries
          setDividends(prev => {
            const manuals = prev.filter(d => !d.id.startsWith('div-sys-'));
            const sysKeys = new Set(synced.map(s => `${s.ticker}-${s.payoutDate}`));
            
            // Remove manual records of the same ticker/date to avoid duplication
            const filteredManuals = manuals.filter(m => !sysKeys.has(`${m.ticker}-${m.payoutDate}`));
            const merged = [...synced, ...filteredManuals];
            
            // Save to IndexedDB
            synced.forEach(s => {
              portafolioDB.saveDividend(s);
            });
            return merged;
          });
        }
      }
    } catch (err) {
      console.error('Error sincronizando dividendos desde bolsa:', err);
    } finally {
      setIsSyncingDividends(false);
    }
  };

  // Sync state from IndexedDB on initial mount
  useEffect(() => {
    async function loadData() {
      try {
        const storedHoldings = await portafolioDB.getHoldings();
        const storedDividends = await portafolioDB.getDividends();
        const storedRefunds = await portafolioDB.getRefunds();
        const storedYield = await portafolioDB.getAnnualYield();
        const storedCustomStocks = await portafolioDB.getCustomStocks();
        const storedDeletedTickers = await portafolioDB.getDeletedTickers();

        setHoldings(storedHoldings);
        setDividends(storedDividends);
        setRefunds(storedRefunds);
        setAnnualPerformancePercent(storedYield);

        if (storedDeletedTickers) {
          setDeletedStocks(storedDeletedTickers);
          try {
            localStorage.setItem('deleted_market_tickers', JSON.stringify(storedDeletedTickers));
          } catch (e) {
            console.warn('Error saving deleted stocks to localstorage on mount:', e);
          }
        }

        if (storedCustomStocks) {
          const standardTickers = ["CHILE", "SQM-B", "ENELCHILE", "CENCOSHOP", "COPEC", "VAPORES", "BSANTANDER", "CMPC", "FALABELLA", "ANDINA-B"];
          const customOnly = storedCustomStocks.filter(cs => cs && cs.ticker && !standardTickers.includes(cs.ticker));
          setMarketStocks([...INITIAL_MARKET_STOCKS, ...customOnly]);
          try {
            localStorage.setItem('custom_searched_stocks', JSON.stringify(customOnly));
          } catch (e) {
            console.warn('Error saving custom stocks to localstorage on mount:', e);
          }
        }

        // Fetch real-time market stock prices, including custom searched ones and ones from personal holdings!
        try {
          const additionalTickersSet = new Set<string>();
          
          if (storedCustomStocks && storedCustomStocks.length > 0) {
            storedCustomStocks.forEach(s => {
              if (s && s.ticker) additionalTickersSet.add(s.ticker.toUpperCase());
            });
          }
          
          // Load custom searched ones (fallback and legacy compatibility)
          try {
            const saved = localStorage.getItem('custom_searched_stocks');
            const parsed = saved ? JSON.parse(saved) : [];
            if (Array.isArray(parsed)) {
              parsed.forEach((s: any) => {
                if (s && s.ticker) additionalTickersSet.add(s.ticker.toUpperCase());
              });
            }
          } catch (e) {
            console.warn('Error reading custom searched tickers on mount:', e);
          }

          // Load owned ones from db
          storedHoldings.forEach(h => {
            if (h && h.ticker) additionalTickersSet.add(h.ticker.toUpperCase());
          });

          const standardTickers = ["CHILE", "SQM-B", "ENELCHILE", "CENCOSHOP", "COPEC", "VAPORES", "BSANTANDER", "CMPC", "FALABELLA", "ANDINA-B"];
          const additionalList = Array.from(additionalTickersSet)
            .filter(t => !standardTickers.includes(t));

          const queryUrl = additionalList.length > 0
            ? `/api/market-stocks?additional=${encodeURIComponent(additionalList.join(','))}`
            : '/api/market-stocks';

          const marketResponse = await fetch(queryUrl);
          if (marketResponse.ok) {
            const quotes = await marketResponse.json();
            if (quotes && quotes.length > 0) {
              // 1. Update Market reference list
              setMarketStocks(prev => {
                const customStocks = prev.filter(p => !quotes.some((q: any) => q.ticker === p.ticker));
                const updatedList = [...quotes, ...customStocks];
                
                // Sync updated custom stock details back to localStorage & IndexedDB
                const finalCustomSavedList = updatedList.filter(s => !standardTickers.includes(s.ticker));
                if (finalCustomSavedList.length > 0) {
                  try {
                    localStorage.setItem('custom_searched_stocks', JSON.stringify(finalCustomSavedList));
                  } catch (e) {
                    console.warn('Error saving updated custom_searched_stocks:', e);
                  }
                  
                  // Save custom stocks in IndexedDB as well
                  for (const s of finalCustomSavedList) {
                    portafolioDB.saveCustomStock(s).catch(err => console.error('Error auto-syncing custom stock to DB on mount:', err));
                  }
                }
                return updatedList;
              });

              // 2. Refresh active holdings pricing
              setHoldings(prev => {
                return prev.map(h => {
                  const quote = quotes.find((q: any) => q.ticker === h.ticker);
                  if (!quote) return h;
                  const updated = {
                    ...h,
                    currentPrice: quote.price || h.currentPrice
                  };
                  portafolioDB.saveHolding(updated); // Save updated price
                  return updated;
                });
              });
            }
          }
        } catch (apiErr) {
          console.warn('Could not fetch live stock quotes, using local cache:', apiErr);
        }

        // Auto trigger background sync for dividends if user has holdings and no dividends exist
        if (storedHoldings.length > 0 && storedDividends.length === 0) {
          // Fire direct sync
          const response = await fetch('/api/sync-dividends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              holdings: storedHoldings.map(h => ({
                ticker: h.ticker,
                buyDate: h.buyDate,
                shares: h.shares
              }))
            })
          });
          if (response.ok) {
            const synced = await response.json();
            if (Array.isArray(synced) && synced.length > 0) {
              setDividends(synced);
              synced.forEach((s: any) => portafolioDB.saveDividend(s));
            }
          }
        }
      } catch (err) {
        console.error('Error cargando base de datos local:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Listen to PocketBase Auth
  const [pbLoggedIn, setPbLoggedIn] = useState(() => pb.authStore.isValid);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setPbLoggedIn(!!token);
    });
    return () => unsubscribe();
  }, []);

  // 1. Real-time Subscription (Incoming changes from PocketBase cloud)
  useEffect(() => {
    if (!pbLoggedIn || !pb.authStore.model) return;
    const userId = pb.authStore.model.id;
    let isSubscribed = false;

    const setupSubscription = async () => {
      try {
        await pb.collection('portafolios').subscribe('*', async (e) => {
          if (e.action === 'update' && e.record.user === userId && localStorage.getItem('pb_autosync_enabled') === 'true') {
            const incomingData = e.record.data as DBBackupData;
            if (!incomingData) return;

            // Deep stringify comparison
            const currentLocal = await portafolioDB.exportBackup();
            if (JSON.stringify(currentLocal) !== JSON.stringify(incomingData)) {
              console.log('📬 PocketBase: ¡Actualización entrante en tiempo real aplicada!');
              await portafolioDB.importBackup(incomingData);

              // Update states
              setHoldings(incomingData.holdings || []);
              setDividends(incomingData.dividends || []);
              setRefunds(incomingData.refunds || []);
              setAnnualPerformancePercent(incomingData.annualPerformancePercent ?? 8.5);
              setDeletedStocks(incomingData.deletedTickers || []);

              if (incomingData.customStocks) {
                const standardTickers = ["CHILE", "SQM-B", "ENELCHILE", "CENCOSHOP", "COPEC", "VAPORES", "BSANTANDER", "CMPC", "FALABELLA", "ANDINA-B"];
                const customOnly = incomingData.customStocks.filter(cs => cs && cs.ticker && !standardTickers.includes(cs.ticker));
                setMarketStocks([...INITIAL_MARKET_STOCKS, ...customOnly]);
                localStorage.setItem('custom_searched_stocks', JSON.stringify(customOnly));
              }
            }
          }
        });
        isSubscribed = true;
      } catch (err) {
        console.warn('Subscription error:', err);
      }
    };

    setupSubscription();

    return () => {
      if (isSubscribed) {
        pb.collection('portafolios').unsubscribe('*').catch(() => {});
      }
    };
  }, [pbLoggedIn]);

  // 2. Autosync Debounce (Outgoing changes to PocketBase cloud)
  useEffect(() => {
    const isAutosync = localStorage.getItem('pb_autosync_enabled') === 'true';
    if (!isAutosync || !pbLoggedIn || !pb.authStore.model || isLoading) return;

    const serializeAndUpload = async () => {
      try {
        const localData = await portafolioDB.exportBackup();
        
        // Search & compare if we actually need to upload or if server is already identical
        const records = await pb.collection('portafolios').getFullList({
          filter: `user = "${pb.authStore.model?.id}"`,
          requestKey: null
        });
        if (records.length > 0) {
          const currentRemoteData = records[0].data;
          if (JSON.stringify(currentRemoteData) === JSON.stringify(localData)) {
            return; // Already in-sync
          }
        }
        
        // Perform sync upload
        const userId = pb.authStore.model?.id;
        if (records.length > 0) {
          await pb.collection('portafolios').update(records[0].id, { data: localData }, { requestKey: null });
        } else {
          await pb.collection('portafolios').create({ user: userId, data: localData }, { requestKey: null });
        }
        console.log('🚀 PocketBase: ¡Portafolio autosincronizado con éxito!');
      } catch (err) {
        console.warn('Auto-sync error:', err);
      }
    };

    const timer = setTimeout(serializeAndUpload, 1500);
    return () => clearTimeout(timer);
  }, [holdings, dividends, refunds, annualPerformancePercent, marketStocks, deletedStocks, pbLoggedIn, isLoading]);

  // Handlers for Portfolio
  const handleAddHolding = async (newHolding: Omit<StockHolding, 'id'>) => {
    const id = `h-${Date.now()}`;
    const holding: StockHolding = { ...newHolding, id };
    
    // Register the ticker as a custom searched stock if it doesn't already exist in our marketStocks reference list
    if (newHolding.ticker && !marketStocks.some(s => s.ticker === newHolding.ticker)) {
      const parsedStock: MarketStock = {
        ticker: newHolding.ticker,
        name: newHolding.name || `${newHolding.ticker} S.A.`,
        price: newHolding.buyPrice,
        changePercent: 0,
        dividendYield: newHolding.annualTargetYield || 6.0,
        sector: 'Portafolio Personal',
        volumeCLP: 1000000
      };

      try {
        const saved = localStorage.getItem('custom_searched_stocks');
        const parsed = saved ? JSON.parse(saved) : [];
        if (!parsed.some((s: MarketStock) => s.ticker === parsedStock.ticker)) {
          parsed.push(parsedStock);
          localStorage.setItem('custom_searched_stocks', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Error auto-persisting holding ticker as custom searched stock:', e);
      }

      // Save custom stock in IndexedDB as well
      portafolioDB.saveCustomStock(parsedStock).catch(err => console.error('Error auto-persisting custom stock to IndexedDB:', err));

      setMarketStocks(prev => {
        if (prev.some(s => s.ticker === parsedStock.ticker)) return prev;
        return [...prev, parsedStock];
      });
    }

    // Optimistic UI state update
    const updatedHoldings = [...holdings, holding];
    setHoldings(updatedHoldings);
    await portafolioDB.saveHolding(holding);

    // Auto sync actual dividends from the exchange!
    await handleSyncDividends(updatedHoldings);
  };

  const handleUpdateHoldingPrice = async (id: string, newPrice: number) => {
    let targetHolding: StockHolding | null = null;
    
    setHoldings(prev => prev.map(h => {
      if (h.id === id) {
        targetHolding = { ...h, currentPrice: newPrice };
        return targetHolding;
      }
      return h;
    }));

    if (targetHolding) {
      await portafolioDB.saveHolding(targetHolding);
      
      // Update corresponding reference price in market stock list
      setMarketStocks(prev => prev.map(m => {
        if (m.ticker === (targetHolding as any).ticker) {
          return { ...m, price: newPrice };
        }
        return m;
      }));
    }
  };

  const handleUpdateHoldingYield = async (id: string, newYield: number) => {
    let targetHolding: StockHolding | null = null;
    
    setHoldings(prev => prev.map(h => {
      if (h.id === id) {
        targetHolding = { ...h, annualTargetYield: newYield };
        return targetHolding;
      }
      return h;
    }));

    if (targetHolding) {
      await portafolioDB.saveHolding(targetHolding);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
    await portafolioDB.deleteHolding(id);
  };

  // Handlers for Dividends
  const handleAddDividend = async (newDiv: Omit<DividendPayment, 'id'>) => {
    const id = `div-${Date.now()}`;
    const div: DividendPayment = { ...newDiv, id };
    
    setDividends(prev => [div, ...prev]);
    await portafolioDB.saveDividend(div);
  };

  const handleToggleReceived = async (id: string) => {
    let targetDiv: DividendPayment | null = null;
    
    setDividends(prev => prev.map(d => {
      if (d.id === id) {
        targetDiv = { ...d, received: !d.received };
        return targetDiv;
      }
      return d;
    }));

    if (targetDiv) {
      await portafolioDB.saveDividend(targetDiv);
    }
  };

  const handleDeleteDividend = async (id: string) => {
    setDividends(prev => prev.filter(d => d.id !== id));
    await portafolioDB.deleteDividend(id);
  };

  // Handlers for Tax Refunds
  const handleAddRefund = async (newRefund: Omit<TaxRefund, 'id'>) => {
    const id = `tax-${Date.now()}`;
    const ref: TaxRefund = { ...newRefund, id };
    
    setRefunds(prev => [ref, ...prev]);
    await portafolioDB.saveRefund(ref);
  };

  const handleDeleteRefund = async (id: string) => {
    setRefunds(prev => prev.filter(r => r.id !== id));
    await portafolioDB.deleteRefund(id);
  };

  const handleSetAnnualPerformancePercent = async (val: number) => {
    setAnnualPerformancePercent(val);
    await portafolioDB.saveAnnualYield(val);
  };

  // Quick action buy from Market table to simulation portfolio
  const handleMarketQuickBuy = async (tickerCode: string) => {
    const stockInfo = marketStocks.find(s => s.ticker === tickerCode);
    if (!stockInfo) return;

    let updatedHoldings: StockHolding[] = [];

    // Check if user already holds it
    const existing = holdings.find(h => h.ticker === tickerCode);
    if (existing) {
      const updatedHolding = {
        ...existing,
        shares: existing.shares + 1000,
        buyPrice: Math.round((existing.buyPrice + stockInfo.price) / 2),
        currentPrice: stockInfo.price
      };
      updatedHoldings = holdings.map(h => h.ticker === tickerCode ? updatedHolding : h);
      setHoldings(updatedHoldings);
      await portafolioDB.saveHolding(updatedHolding);
    } else {
      const newHolding: StockHolding = {
        id: `h-${Date.now()}`,
        ticker: stockInfo.ticker,
        name: stockInfo.name,
        shares: 1000,
        buyPrice: stockInfo.price,
        currentPrice: stockInfo.price,
        buyDate: new Date().toISOString().split('T')[0],
        annualTargetYield: stockInfo.dividendYield
      };
      updatedHoldings = [...holdings, newHolding];
      setHoldings(updatedHoldings);
      await portafolioDB.saveHolding(newHolding);
    }

    // Trigger auto fetch of actual Chilean market dividend records for this purchase!
    await handleSyncDividends(updatedHoldings);
  };

  // Backup file routines
  const handleExportBackup = async () => {
    try {
      const data = await portafolioDB.exportBackup();
      const text = JSON.stringify(data, null, 2);
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `santiago_bolsa_portafolio_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data: ', err);
      alert('Error al descargar el archivo de respaldo.');
    }
  };

  const handleImportBackup = async (content: string) => {
    try {
      const parsed = JSON.parse(content);
      await portafolioDB.importBackup(parsed);
      
      // Reload states from IndexedDB
      const storedHoldings = await portafolioDB.getHoldings();
      const storedDividends = await portafolioDB.getDividends();
      const storedRefunds = await portafolioDB.getRefunds();
      const storedYield = await portafolioDB.getAnnualYield();
      const storedCustomStocks = await portafolioDB.getCustomStocks();
      const storedDeletedTickers = await portafolioDB.getDeletedTickers();

      setHoldings(storedHoldings);
      setDividends(storedDividends);
      setRefunds(storedRefunds);
      setAnnualPerformancePercent(storedYield);
      setDeletedStocks(storedDeletedTickers);
      
      const standardTickers = ["CHILE", "SQM-B", "ENELCHILE", "CENCOSHOP", "COPEC", "VAPORES", "BSANTANDER", "CMPC", "FALABELLA", "ANDINA-B"];
      const customOnly = storedCustomStocks.filter(cs => cs && cs.ticker && !standardTickers.includes(cs.ticker));
      setMarketStocks([...INITIAL_MARKET_STOCKS, ...customOnly]);
      
      try {
        localStorage.setItem('custom_searched_stocks', JSON.stringify(customOnly));
        localStorage.setItem('deleted_market_tickers', JSON.stringify(storedDeletedTickers));
      } catch (e) {
        console.warn('Error saving updated custom_searched_stocks on import:', e);
      }
    } catch (err) {
      console.error('Error importing backup:', err);
      throw err;
    }
  };

  const handleClearAllData = async () => {
    try {
      await portafolioDB.clearAllData();
      setHoldings([]);
      setDividends([]);
      setRefunds([]);
      setAnnualPerformancePercent(8.5);
      setDeletedStocks([]);
      setMarketStocks(INITIAL_MARKET_STOCKS);
      try {
        localStorage.removeItem('custom_searched_stocks');
        localStorage.removeItem('deleted_market_tickers');
      } catch (e) {
        console.warn(e);
      }
    } catch (err) {
      console.error('Error clearing data:', err);
      alert('No se pudo borrar los datos locales.');
    }
  };

  // Calculations
  const portfolioValuation = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
  const totalContributed = holdings.reduce((sum, h) => sum + (h.shares * h.buyPrice), 0);
  const totalDividends = dividends.filter(d => d.received).reduce((sum, d) => sum + d.totalAmount, 0);
  const totalTaxRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-900">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        portfolioValue={portfolioValuation}
        onRefreshMarketData={() => handleRefreshMarketData(false)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Iniciando base de datos local y cargando portafolio chileno...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Fired Price Alerts List Banner */}
            {firedNotificationMessages.length > 0 && (
              <div className="space-y-2.5">
                {firedNotificationMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs flex items-start justify-between gap-4 animate-fadeIn"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Bell className="w-4 h-4 animate-bounce text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Alerta de Variación de Precio Sonoro</p>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{msg.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFiredNotificationMessages(prev => prev.filter(m => m.id !== msg.id))}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                      title="Cerrar notificación"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {activeTab === 'dashboard' && (
                <ChartsAndAnalytics
                  holdings={holdings}
                  contributedCapital={totalContributed}
                  totalDividends={totalDividends}
                  totalTaxRefunds={totalTaxRefunds}
                  annualPerformancePercentage={annualPerformancePercent}
                  setAnnualPerformancePercentage={handleSetAnnualPerformancePercent}
                  holdingsCount={holdings.length}
                  onExportBackup={handleExportBackup}
                  onImportBackup={handleImportBackup}
                  onClearAllData={handleClearAllData}
                />
              )}

              {activeTab === 'portfolio' && (
                <MyPortfolio
                  holdings={holdings}
                  onAddHolding={handleAddHolding}
                  onUpdateHoldingPrice={handleUpdateHoldingPrice}
                  onUpdateHoldingYield={handleUpdateHoldingYield}
                  onDeleteHolding={handleDeleteHolding}
                  marketStocks={marketStocks.filter(s => !deletedStocks.includes(s.ticker))}
                />
              )}

              {activeTab === 'dividends' && (
                <DividendTracker
                  dividends={dividends}
                  onAddDividend={handleAddDividend}
                  onToggleReceived={handleToggleReceived}
                  onDeleteDividend={handleDeleteDividend}
                  holdings={holdings}
                  onSyncDividends={() => handleSyncDividends()}
                  isSyncing={isSyncingDividends}
                />
              )}

              {activeTab === 'taxes' && (
                <TaxRefunds
                  refunds={refunds}
                  onAddRefund={handleAddRefund}
                  onDeleteRefund={handleDeleteRefund}
                />
              )}

              {activeTab === 'market' && (
                <MarketWatch
                  marketStocks={marketStocks.filter(s => !deletedStocks.includes(s.ticker))}
                  onQuickBuy={handleMarketQuickBuy}
                  holdings={holdings}
                  onSearchAndAddStock={(newStock) => {
                    if (deletedStocks.includes(newStock.ticker)) {
                      setDeletedStocks(prev => {
                        const updated = prev.filter(t => t !== newStock.ticker);
                        localStorage.setItem('deleted_market_tickers', JSON.stringify(updated));
                        portafolioDB.saveDeletedTickers(updated).catch(err => console.error('Error saving updated deleted list:', err));
                        return updated;
                      });
                    }

                    // Save custom searched stock back to localStorage so it persists across reloads
                    try {
                      const saved = localStorage.getItem('custom_searched_stocks');
                      const parsed = saved ? JSON.parse(saved) : [];
                      if (!parsed.some((s: MarketStock) => s.ticker === newStock.ticker)) {
                        parsed.push(newStock);
                        localStorage.setItem('custom_searched_stocks', JSON.stringify(parsed));
                      }
                    } catch (e) {
                      console.error('Error saving searched stock to custom_searched_stocks cache:', e);
                    }

                    // Save custom searched stock to IndexedDB as well for cloud backup
                    portafolioDB.saveCustomStock(newStock).catch(err => console.error('Error saving custom stock to IndexedDB:', err));

                    setMarketStocks(prev => {
                      if (prev.some(s => s.ticker === newStock.ticker)) return prev;
                      return [...prev, newStock];
                    });
                  }}
                  onDeleteStock={handleDeleteMarketStock}
                  deletedStocksCount={deletedStocks.length}
                  onRestoreAllStocks={handleRestoreAllMarketStocks}
                  onRefreshPrices={() => handleRefreshMarketData(false)}
                  isRefreshing={isRefreshing}
                  alerts={alerts}
                  onToggleAlert={handleToggleAlert}
                  onUpdateTargetPrice={handleUpdateTargetPrice}
                  onResetAlert={handleResetAlert}
                />
              )}

              {activeTab === 'backup' && (
                <PocketBaseSync
                  onDataRestored={async () => {
                    try {
                      const storedHoldings = await portafolioDB.getHoldings();
                      const storedDividends = await portafolioDB.getDividends();
                      const storedRefunds = await portafolioDB.getRefunds();
                      const storedYield = await portafolioDB.getAnnualYield();
                      const storedCustomStocks = await portafolioDB.getCustomStocks();
                      const storedDeletedTickers = await portafolioDB.getDeletedTickers();
                      
                      setHoldings(storedHoldings);
                      setDividends(storedDividends);
                      setRefunds(storedRefunds);
                      setAnnualPerformancePercent(storedYield);
                      setDeletedStocks(storedDeletedTickers);
                      
                      const standardTickers = ["CHILE", "SQM-B", "ENELCHILE", "CENCOSHOP", "COPEC", "VAPORES", "BSANTANDER", "CMPC", "FALABELLA", "ANDINA-B"];
                      const customOnly = storedCustomStocks.filter(cs => cs && cs.ticker && !standardTickers.includes(cs.ticker));
                      setMarketStocks([...INITIAL_MARKET_STOCKS, ...customOnly]);
                      try {
                        localStorage.setItem('custom_searched_stocks', JSON.stringify(customOnly));
                        localStorage.setItem('deleted_market_tickers', JSON.stringify(storedDeletedTickers));
                      } catch (e) {
                        console.warn('Error saving updated custom_searched_stocks or deleted tickers on cloud restore:', e);
                      }
                      
                      setActiveTab('dashboard');
                    } catch (err) {
                      console.error('Error al recargar datos importados:', err);
                    }
                  }}
                  holdings={holdings}
                  dividends={dividends}
                  refunds={refunds}
                  annualPerformancePercent={annualPerformancePercent}
                  marketStocks={marketStocks}
                  deletedStocks={deletedStocks}
                />
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modern Chilean Disclaimer Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-center text-xs mt-12">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>© 2026 Bolsa de Santiago Portafolio. Todos los derechos reservados.</p>
          <p className="text-slate-500 max-w-2xl mx-auto text-[10px]">
            Información simulada de referencia bursátil para la República de Chile en base al índice IPSA. Los datos tributarios de Operación Renta son estimaciones didácticas de ahorro personal basados en el crédito de primera categoría de la ley sobre impuesto a la renta chilena.
          </p>
        </div>
      </footer>
    </div>
  );
}
