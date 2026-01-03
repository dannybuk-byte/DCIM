/**
 * BGP Real-Time Monitoring via RIPE RIS Live WebSocket
 * Monitors BGP routing updates, detects anomalies, and tracks AS path changes
 */

export interface BGPUpdate {
  timestamp: number;
  type: 'announcement' | 'withdrawal';
  prefix: string;
  asPath: number[];
  peer: string;
  origin: string;
  nextHop?: string;
}

export interface BGPAnomaly {
  type: 'short_path' | 'new_prefix' | 'path_change' | 'potential_hijack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  update: BGPUpdate;
  timestamp: number;
}

type BGPUpdateCallback = (update: BGPUpdate) => void;
type AnomalyCallback = (anomaly: BGPAnomaly) => void;

export class BGPMonitor {
  private static readonly RIS_LIVE_URL = 'wss://ris-live.ripe.net/v1/ws/';
  private socket: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private updateListeners = new Set<BGPUpdateCallback>();
  private anomalyListeners = new Set<AnomalyCallback>();
  private monitoredASNs = new Set<number>();
  private monitoredPrefixes = new Map<string, number[]>(); // prefix -> last known AS path
  private isConnecting = false;
  private isConnected = false;
  private permanentlyDisconnected = false;

  connect(): void {
    if (this.isConnecting || this.isConnected || this.permanentlyDisconnected) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.socket = new WebSocket(BGPMonitor.RIS_LIVE_URL);
      
      this.socket.onopen = () => {
        console.log('🌐 BGP Monitor: Connected to RIPE RIS Live');
        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectDelay = 1000;
        this.reconnectAttempts = 0;
        this.subscribe();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ris_message') {
            this.processMessage(data.data);
          }
        } catch (error) {
          console.error('BGP Monitor: Error processing message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('BGP Monitor: WebSocket error:', error);
        this.reconnectAttempts++;
      };

      this.socket.onclose = () => {
        console.log('🌐 BGP Monitor: Disconnected from RIPE RIS Live');
        this.isConnected = false;
        this.isConnecting = false;
        this.socket = null;
        
        // Check if we've exceeded max reconnect attempts
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn('BGP Monitor: Max reconnect attempts reached. Entering offline mode.');
          this.permanentlyDisconnected = true;
        } else {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('BGP Monitor: Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.permanentlyDisconnected = true;
      }
    }
  }

  private subscribe(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscription = {
      type: 'ris_subscribe',
      data: {
        type: 'UPDATE',
        require: 'announcements',
        socketOptions: {
          includeRaw: false
        }
      }
    };

    this.socket.send(JSON.stringify(subscription));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    const jitter = Math.random() * 1000;
    const delay = Math.min(this.reconnectDelay + jitter, this.maxReconnectDelay);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, delay);
  }

  private processMessage(data: any): void {
    if (!data || data.type !== 'UPDATE') {
      return;
    }

    const announcements = data.announcements || [];
    
    for (const announcement of announcements) {
      const update: BGPUpdate = {
        timestamp: data.timestamp * 1000,
        type: 'announcement',
        prefix: announcement.prefixes?.[0] || 'unknown',
        asPath: announcement.as_path || [],
        peer: data.peer || 'unknown',
        origin: data.origin || 'unknown',
        nextHop: announcement.next_hop
      };

      // Notify listeners
      this.updateListeners.forEach(listener => listener(update));

      // Check for anomalies
      this.detectAnomalies(update);
    }
  }

  private detectAnomalies(update: BGPUpdate): void {
    const anomalies: BGPAnomaly[] = [];

    // Anomaly 1: Unusually short AS path (< 2 hops)
    if (update.asPath.length < 2 && update.asPath.length > 0) {
      anomalies.push({
        type: 'short_path',
        severity: 'medium',
        description: `Unusually short AS path detected: ${update.asPath.join(' → ')}`,
        update,
        timestamp: Date.now()
      });
    }

    // Anomaly 2: New prefix announcement
    if (!this.monitoredPrefixes.has(update.prefix)) {
      this.monitoredPrefixes.set(update.prefix, update.asPath);
      
      // Only alert for monitored ASNs
      const hasMonitoredASN = update.asPath.some(asn => this.monitoredASNs.has(asn));
      if (hasMonitoredASN) {
        anomalies.push({
          type: 'new_prefix',
          severity: 'low',
          description: `New prefix announcement: ${update.prefix}`,
          update,
          timestamp: Date.now()
        });
      }
    } else {
      // Anomaly 3: AS path change for existing prefix
      const oldPath = this.monitoredPrefixes.get(update.prefix)!;
      if (JSON.stringify(oldPath) !== JSON.stringify(update.asPath)) {
        anomalies.push({
          type: 'path_change',
          severity: 'medium',
          description: `AS path changed for ${update.prefix}: ${oldPath.join(' → ')} ⇒ ${update.asPath.join(' → ')}`,
          update,
          timestamp: Date.now()
        });
        
        this.monitoredPrefixes.set(update.prefix, update.asPath);
      }
    }

    // Anomaly 4: Potential hijack (origin AS change)
    if (update.asPath.length >= 2) {
      const currentOrigin = update.asPath[update.asPath.length - 1];
      const prefix = update.prefix;
      
      // Check if we've seen this prefix before with a different origin
      const existingPath = this.monitoredPrefixes.get(prefix);
      if (existingPath && existingPath.length >= 2) {
        const previousOrigin = existingPath[existingPath.length - 1];
        if (currentOrigin !== previousOrigin) {
          anomalies.push({
            type: 'potential_hijack',
            severity: 'critical',
            description: `Potential BGP hijack detected for ${prefix}: Origin AS changed from ${previousOrigin} to ${currentOrigin}`,
            update,
            timestamp: Date.now()
          });
        }
      }
    }

    // Notify anomaly listeners
    anomalies.forEach(anomaly => {
      this.anomalyListeners.forEach(listener => listener(anomaly));
    });
  }

  addMonitoredASN(asn: number): void {
    this.monitoredASNs.add(asn);
  }

  removeMonitoredASN(asn: number): void {
    this.monitoredASNs.delete(asn);
  }

  onUpdate(callback: BGPUpdateCallback): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  onAnomaly(callback: AnomalyCallback): () => void {
    this.anomalyListeners.add(callback);
    return () => this.anomalyListeners.delete(callback);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.permanentlyDisconnected = false;
    this.reconnectAttempts = 0;
    this.updateListeners.clear();
    this.anomalyListeners.clear();
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'offline' {
    if (this.permanentlyDisconnected) return 'offline';
    if (this.isConnected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  retry(): void {
    this.permanentlyDisconnected = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect();
  }

  getMonitoredASNs(): number[] {
    return Array.from(this.monitoredASNs);
  }
}

// Singleton instance
export const bgpMonitor = new BGPMonitor();

