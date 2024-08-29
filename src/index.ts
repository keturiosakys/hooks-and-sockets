import { Hono } from "hono";
import { WebhookReceiver } from "./receiver";

type Variables = {
	receiver: DurableObjectStub<WebhookReceiver>;
};

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>();

app.use("*", async (c, next) => {
	const id = c.env.WEBHOOK_RECEIVER.idFromName("default");
	const stub = c.env.WEBHOOK_RECEIVER.get(id);
	c.set("receiver", stub);
	await next();
})

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/ws", async (c) => {
	if (c.req.header("upgrade") !== "websocket") {
		return c.text("Not a websocket request", 426);
	}

	const stub = c.get("receiver");
	return stub.fetch(c.req.raw)
});

app.all("/receiver-listen/*", async (c) => {
	const method = c.req.method;
	const path = c.req.path;
	const body = await c.req.text()

	const received = {
		method,
		path,
		body
	}

	const stub = c.get("receiver");
	await stub.broadcast(JSON.stringify(received))

	return c.text("OK");
})

export { WebhookReceiver };

export default app;
