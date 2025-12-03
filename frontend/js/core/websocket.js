/**
 * WebSocket Client Module
 * Handles real-time communication with the server
 */

export class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.messageCallbacks = [];
        this.activityCallbacks = [];
        this.statusCallbacks = [];
        this.pingInterval = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);

                this.ws.onopen = () => {
                    console.log('[WS] Connected');
                    this.reconnectAttempts = 0;
                    this._notifyStatus('connected');
                    this._startPing();
                    resolve();
                };

                this.ws.onclose = (event) => {
                    console.log('[WS] Disconnected', event.code);
                    this._stopPing();
                    this._notifyStatus('disconnected');
                    this._attemptReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('[WS] Error:', error);
                    this._notifyStatus('error');
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this._handleMessage(event.data);
                };

            } catch (error) {
                console.error('[WS] Connection failed:', error);
                reject(error);
            }
        });
    }

    _handleMessage(data) {
        try {
            const message = JSON.parse(data);

            if (message.type === 'activity') {
                this.activityCallbacks.forEach(cb => cb(message));
            } else if (message.type === 'response' || message.type === 'error') {
                this.messageCallbacks.forEach(cb => cb(message));
            } else if (message.type === 'pong') {
                // Ping response - connection is alive
            }
        } catch (error) {
            console.error('[WS] Parse error:', error);
        }
    }

    _attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WS] Reconnecting... (attempt ${this.reconnectAttempts})`);
            this._notifyStatus('reconnecting');

            setTimeout(() => {
                this.connect().catch(() => {});
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('[WS] Max reconnect attempts reached');
            this._notifyStatus('failed');
        }
    }

    _startPing() {
        this._stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
            }
        }, 30000);
    }

    _stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    _notifyStatus(status) {
        this.statusCallbacks.forEach(cb => cb(status));
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    sendChat(content) {
        return this.send({
            type: 'chat',
            content: content
        });
    }

    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }

    onActivity(callback) {
        this.activityCallbacks.push(callback);
    }

    onStatus(callback) {
        this.statusCallbacks.push(callback);
    }

    disconnect() {
        this._stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
