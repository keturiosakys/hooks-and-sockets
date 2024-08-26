import { DurableObject } from "cloudflare:workers";

export class WebhookReceiver extends DurableObject<CloudflareBindings> {
	connections: Set<WebSocket>;

	constructor(ctx: DurableObjectState, env: CloudflareBindings) {
		super(ctx, env);
		this.connections = new Set<WebSocket>();

		const websockets = this.ctx.getWebSockets();

		for (const ws of websockets) {
			this.connections.add(ws);
		}
	}

	async fetch(req: Request) {
		const websocketPair = new WebSocketPair();
		const [client, server] = Object.values(websocketPair);

		this.ctx.acceptWebSocket(server)
		this.connections.add(client);

		console.log("fetch, connections", this.connections);
		return new Response(null, {
			status: 101,
			webSocket: client,
		})
	}

	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		if (typeof message === "string" && message.toLowerCase() === "ping") {
			ws.send("pong");
		}
	}

	webSocketError(ws: WebSocket, error: unknown) {
		this.connections.delete(ws);
	}


	webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
		this.connections.delete(ws);
	}

	async broadcast(message: string) {
		for (const connection of this.connections) {
			connection.send(message);
		}
	}
}
