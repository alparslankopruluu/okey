import type { CreateRoomInput, Env, SubmitCommandInput } from './types';

export { RoomSession } from './room-session';

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function userId(request: Request): string | undefined {
  const value = request.headers.get('X-Luma-User')?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const url = new URL(request.url);
    const giftMatch = /^\/internal\/v1\/rooms\/([a-zA-Z0-9_-]{1,64})\/gift-receipts$/.exec(url.pathname);
    const match = /^\/v1\/rooms\/([a-zA-Z0-9_-]{1,64})(?:\/(socket|join|command))?$/.exec(url.pathname);
    try {
      if (giftMatch !== null) {
        if (request.method !== 'POST') return jsonError('Method not allowed', 405);
        const expectedToken = env.GIFT_BRIDGE_TOKEN;
        if (expectedToken === undefined || request.headers.get('Authorization') !== `Bearer ${expectedToken}`) return jsonError('Forbidden', 403);
        const roomId = giftMatch[1];
        if (roomId === undefined) return jsonError('Invalid room ID', 400);
        const body = await request.json();
        const result = await env.ROOMS.getByName(roomId).tryPublishGiftReceipt(body as never);
        return result.ok ? Response.json(result.result) : jsonError(result.message, 400);
      }
      if (match === null) return jsonError('Not found', 404);
      const roomId = match[1];
      const action = match[2];
      if (roomId === undefined) return jsonError('Invalid room ID', 400);
      const authenticatedUserId = userId(request);
      if (authenticatedUserId === undefined) return jsonError('Missing local authentication identity', 401);
      const stub = env.ROOMS.getByName(roomId);

      if (action === 'socket') {
        const socketUrl = new URL(request.url);
        socketUrl.searchParams.set('userId', authenticatedUserId);
        return await stub.fetch(new Request(socketUrl, request));
      }
      if (request.method === 'POST' && action === undefined) {
        const body = await request.json<{ variant?: unknown; seed?: unknown }>();
        if ((body.variant !== 'classic' && body.variant !== '101') || typeof body.seed !== 'number') return jsonError('Invalid room setup', 400);
        const input: CreateRoomInput = { roomId, hostUserId: authenticatedUserId, variant: body.variant, seed: body.seed };
        return Response.json(await stub.init(input), { status: 201 });
      }
      if (request.method === 'POST' && action === 'join') {
        const result = await stub.tryJoin(authenticatedUserId);
        return result.ok ? Response.json(result.snapshot) : jsonError(result.message, result.code === 'forbidden' ? 403 : 400);
      }
      if (request.method === 'GET' && action === undefined) return Response.json(await stub.snapshot(authenticatedUserId));
      if (request.method === 'POST' && action === 'command') {
        const body = await request.json<{ command?: unknown }>();
        if (body.command === undefined) return jsonError('Missing command', 400);
        const input: SubmitCommandInput = { userId: authenticatedUserId, command: body.command as SubmitCommandInput['command'] };
        const result = await stub.trySubmitCommand(input);
        return result.ok ? Response.json(result.snapshot) : jsonError(result.message, result.code === 'forbidden' ? 403 : 400);
      }
      return jsonError('Method not allowed', 405);
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'room_request_failed', requestId, path: url.pathname, durationMs: Date.now() - startedAt, error: String(error) }));
      return jsonError(error instanceof Error ? error.message : 'Internal error', error instanceof Error && /not joined|Missing/.test(error.message) ? 403 : 400);
    }
  },
} satisfies ExportedHandler<Env>;
