/**
 * WebSocket Service - Real-time Updates
 */
import { API_URL } from '@/constants/config';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

interface WebSocketMessage {
    type: string;
    channel?: string;
    data: any;
    timestamp: string;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private token: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
    private onConnectHandler: ConnectionHandler | null = null;
    private onDisconnectHandler: ConnectionHandler | null = null;
    private isConnecting = false;
    private pingInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Connect to WebSocket server
     */
    connect(token: string): void {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }

        this.token = token;
        this.isConnecting = true;

        const wsUrl = API_URL.replace('http', 'ws') + `/api/ws?token=${token}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.onConnectHandler?.();
                this.startPing();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                this.isConnecting = false;
                this.stopPing();
                this.onDisconnectHandler?.();
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) {
            console.log('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            if (this.token) {
                this.connect(this.token);
            }
        }, delay);
    }

    /**
     * Start ping interval to keep connection alive
     */
    private startPing(): void {
        this.pingInterval = setInterval(() => {
            this.send({ action: 'ping' });
        }, 30000);
    }

    /**
     * Stop ping interval
     */
    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Send message to server
     */
    send(message: object): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Subscribe to channels
     */
    subscribe(channels: string[]): void {
        this.send({ action: 'subscribe', channels });
    }

    /**
     * Unsubscribe from channels
     */
    unsubscribe(channels: string[]): void {
        this.send({ action: 'unsubscribe', channels });
    }

    /**
     * Send driver location update
     */
    sendDriverLocation(jobId: string, latitude: number, longitude: number, heading?: number): void {
        this.send({
            action: 'driver_location',
            job_id: jobId,
            latitude,
            longitude,
            heading,
        });
    }

    /**
     * Handle incoming message
     */
    private handleMessage(message: WebSocketMessage): void {
        const { type, data } = message;

        // Handle system messages
        if (type === 'pong') return;
        if (type === 'connected') {
            console.log('WebSocket handshake complete:', data);
            return;
        }
        if (type === 'subscribed') {
            console.log('Subscribed to channels:', data.channels);
            return;
        }

        // Dispatch to registered handlers
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            handlers.forEach((handler) => handler(data));
        }

        // Also dispatch to wildcard handlers
        const wildcardHandlers = this.messageHandlers.get('*');
        if (wildcardHandlers) {
            wildcardHandlers.forEach((handler) => handler({ type, ...data }));
        }
    }

    /**
     * Register message handler for a specific event type
     */
    on(eventType: string, handler: MessageHandler): () => void {
        if (!this.messageHandlers.has(eventType)) {
            this.messageHandlers.set(eventType, new Set());
        }
        this.messageHandlers.get(eventType)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.get(eventType)?.delete(handler);
        };
    }

    /**
     * Remove all handlers for an event type
     */
    off(eventType: string): void {
        this.messageHandlers.delete(eventType);
    }

    /**
     * Set connection handlers
     */
    onConnect(handler: ConnectionHandler): void {
        this.onConnectHandler = handler;
    }

    onDisconnect(handler: ConnectionHandler): void {
        this.onDisconnectHandler = handler;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

export const websocketService = new WebSocketService();

// Event type constants
export const WS_EVENTS = {
    JOB_STATUS_CHANGED: 'job.status_changed',
    ESTIMATE_READY: 'estimate.ready',
    ESTIMATE_APPROVED: 'estimate.approved',
    PARTS_APPROVAL_NEEDED: 'parts.approval_needed',
    PAYMENT_RECEIVED: 'payment.received',
    DRIVER_LOCATION: 'driver.location',
    DRIVER_ASSIGNED: 'driver.assigned',
    PICKUP_STARTED: 'pickup.started',
    VEHICLE_PICKED: 'vehicle.picked',
    DELIVERY_STARTED: 'delivery.started',
    VEHICLE_DELIVERED: 'vehicle.delivered',
    NEW_MESSAGE: 'message.new',
    NOTIFICATION: 'notification',
} as const;

// React hook for WebSocket
export function useWebSocket() {
    return {
        connect: (token: string) => websocketService.connect(token),
        disconnect: () => websocketService.disconnect(),
        subscribe: (channels: string[]) => websocketService.subscribe(channels),
        unsubscribe: (channels: string[]) => websocketService.unsubscribe(channels),
        on: (event: string, handler: MessageHandler) => websocketService.on(event, handler),
        off: (event: string) => websocketService.off(event),
        isConnected: () => websocketService.isConnected(),
        sendDriverLocation: websocketService.sendDriverLocation.bind(websocketService),
    };
}
