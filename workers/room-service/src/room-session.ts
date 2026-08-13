import { DurableObject } from 'cloudflare:workers';
import { GameRuleError, applyCommand, createGame, createTileSet, type GameCommand, type GameState } from '@luma/game-core';
import type { CreateRoomInput, Env, GiftPublishResult, GiftPublishRpcResult, RoomRpcResult, RoomSnapshot, SocketAttachment, SubmitCommandInput, VerifiedGiftReceipt } from './types';

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const GIFT_COSTS = { tea: 50, coffee: 100, chocolate: 150, rose: 250, prayer_beads: 400, cake: 1000 } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function tileSignature(value: Record<string, unknown>): string {
  return JSON.stringify([value.id, value.kind, value.copy, value.color ?? null, value.number ?? null]);
}

function tileIds(value: unknown, canonicalTiles: ReadonlyMap<string, string>): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids: string[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string') return undefined;
    const signature = tileSignature(item);
    if (canonicalTiles.get(item.id) !== signature) return undefined;
    ids.push(item.id);
  }
  return ids;
}

export function parseSnapshot(raw: string): RoomSnapshot {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || typeof parsed.roomId !== 'string' || typeof parsed.updatedAt !== 'number' || !isRecord(parsed.seats)) {
    throw new Error('Stored room snapshot is invalid');
  }
  const seatEntries = Object.entries(parsed.seats);
  if (seatEntries.some(([, playerId]) => typeof playerId !== 'string')) throw new Error('Stored room snapshot is invalid');
  const state = parsed.state;
  if (!isRecord(state)
    || state.gameId !== parsed.roomId
    || typeof state.sequence !== 'number'
    || !Number.isSafeInteger(state.sequence)
    || !Array.isArray(state.players)
    || state.players.length !== 4
    || !Array.isArray(state.tableMelds)
    || !isRecord(state.indicatorTile)) throw new Error('Stored room snapshot is invalid');
  const canonicalTiles = new Map(createTileSet().map((tile) => [tile.id, tileSignature(tile as unknown as Record<string, unknown>)]));
  const wallIds = tileIds(state.wall, canonicalTiles);
  const discardIds = tileIds(state.discards, canonicalTiles);
  const rackCollections = state.players.map((player) => isRecord(player) ? tileIds(player.rack, canonicalTiles) : undefined);
  const tableCollections = state.tableMelds.map((meld) => isRecord(meld) ? tileIds(meld.tiles, canonicalTiles) : undefined);
  const rackIds = rackCollections.flatMap((ids) => ids ?? []);
  const tableIds = tableCollections.flatMap((ids) => ids ?? []);
  if (wallIds === undefined || discardIds === undefined
    || rackCollections.some((ids) => ids === undefined)
    || tableCollections.some((ids) => ids === undefined)
    || typeof state.indicatorTile.id !== 'string'
    || canonicalTiles.get(state.indicatorTile.id) !== tileSignature(state.indicatorTile)) throw new Error('Stored room snapshot is invalid');
  const ids = [state.indicatorTile.id, ...wallIds, ...discardIds, ...rackIds, ...tableIds];
  const canonical = new Set(canonicalTiles.keys());
  if (ids.length !== canonical.size || new Set(ids).size !== canonical.size || ids.some((id) => !canonical.has(id))) {
    throw new Error('Stored room snapshot violates tile conservation');
  }
  return {
    roomId: parsed.roomId,
    state: state as unknown as GameState,
    seats: Object.fromEntries(seatEntries) as Record<string, string>,
    updatedAt: parsed.updatedAt,
  };
}

function safeId(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(normalized)) throw new Error(`${label} is invalid`);
  return normalized;
}

export class RoomSession extends DurableObject<Env> {
  public constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
          id INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS room_state (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          snapshot_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS gift_receipts (
          receipt_id TEXT PRIMARY KEY,
          receipt_json TEXT NOT NULL,
          published_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO _sql_schema_migrations (id) VALUES (1);
        INSERT OR IGNORE INTO _sql_schema_migrations (id) VALUES (2);
      `);
      return Promise.resolve();
    });
  }

  public async init(input: CreateRoomInput): Promise<RoomSnapshot> {
    const existing = this.readSnapshot();
    if (existing !== undefined) return existing;
    const roomId = safeId(input.roomId, 'Room ID');
    const hostUserId = safeId(input.hostUserId, 'Host user ID');
    if (!Number.isSafeInteger(input.seed)) throw new Error('Seed must be a safe integer');
    const playerIds = [`${roomId}_p0`, `${roomId}_p1`, `${roomId}_p2`, `${roomId}_p3`] as const;
    const now = Date.now();
    const snapshot: RoomSnapshot = {
      roomId,
      state: createGame({ gameId: roomId, variant: input.variant, playerIds, seed: input.seed }),
      seats: { [hostUserId]: playerIds[0] },
      updatedAt: now,
    };
    this.writeSnapshot(snapshot);
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);
    return snapshot;
  }

  public join(userIdInput: string): RoomSnapshot {
    const userId = safeId(userIdInput, 'User ID');
    const snapshot = this.requireSnapshot();
    if (snapshot.seats[userId] !== undefined) return snapshot;
    const occupied = new Set(Object.values(snapshot.seats));
    const seat = snapshot.state.players.find((player) => !occupied.has(player.id));
    if (seat === undefined) throw new Error('Room is full');
    const next = { ...snapshot, seats: { ...snapshot.seats, [userId]: seat.id }, updatedAt: Date.now() };
    this.writeSnapshot(next);
    return next;
  }

  public tryJoin(userIdInput: string): RoomRpcResult {
    try {
      return { ok: true, snapshot: this.join(userIdInput) };
    } catch (error) {
      return { ok: false, code: error instanceof Error && /full/.test(error.message) ? 'room_full' : 'invalid_request', message: error instanceof Error ? error.message : 'Invalid join request' };
    }
  }

  public snapshot(userIdInput: string): RoomSnapshot {
    const userId = safeId(userIdInput, 'User ID');
    const snapshot = this.requireSnapshot();
    if (snapshot.seats[userId] === undefined) throw new Error('User has not joined this room');
    return snapshot;
  }

  public submitCommand(input: SubmitCommandInput): RoomSnapshot {
    const userId = safeId(input.userId, 'User ID');
    const snapshot = this.requireSnapshot();
    const playerId = snapshot.seats[userId];
    if (playerId === undefined) throw new Error('User has not joined this room');
    if (input.command.playerId !== playerId) throw new GameRuleError('seat_mismatch', 'Command player does not match the authenticated seat');
    const result = applyCommand(snapshot.state, input.command);
    if (result.duplicate) return snapshot;
    const next = { ...snapshot, state: result.state, updatedAt: Date.now() };
    this.writeSnapshot(next);
    this.broadcast({ type: 'state', snapshot: next });
    return next;
  }

  public trySubmitCommand(input: SubmitCommandInput): RoomRpcResult {
    try {
      return { ok: true, snapshot: this.submitCommand(input) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid command';
      const code = /not joined|authenticated seat/.test(message) ? 'forbidden' : error instanceof GameRuleError ? 'rule_error' : 'invalid_request';
      return { ok: false, code, message };
    }
  }

  /** Called only by the future verified Firebase receipt bridge, never by a mobile client. */
  public publishGiftReceipt(input: VerifiedGiftReceipt): GiftPublishResult {
    const snapshot = this.requireSnapshot();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(input.receiptId)) throw new Error('Gift receipt ID is invalid');
    if (input.roomId !== snapshot.roomId) throw new Error('Gift receipt room does not match');
    const senderId = safeId(input.senderId, 'Gift sender ID');
    const recipientId = safeId(input.recipientId, 'Gift recipient ID');
    if (senderId === recipientId || snapshot.seats[senderId] === undefined || snapshot.seats[recipientId] === undefined) throw new Error('Gift participants must be distinct room members');
    if (GIFT_COSTS[input.giftId] !== input.chipCost || !Number.isSafeInteger(input.createdAt) || input.createdAt < 0) throw new Error('Gift receipt is invalid');
    const encoded = JSON.stringify(input);
    const existing = this.ctx.storage.sql.exec<{ receipt_json: string }>('SELECT receipt_json FROM gift_receipts WHERE receipt_id = ?', input.receiptId).toArray()[0];
    if (existing !== undefined) {
      if (existing.receipt_json !== encoded) throw new Error('Gift receipt ID was already used for another payload');
      return { published: false, receipt: JSON.parse(existing.receipt_json) as VerifiedGiftReceipt };
    }
    this.ctx.storage.sql.exec('INSERT INTO gift_receipts (receipt_id, receipt_json, published_at) VALUES (?, ?, ?)', input.receiptId, encoded, Date.now());
    this.broadcast({ type: 'gift', receipt: input });
    return { published: true, receipt: input };
  }

  public tryPublishGiftReceipt(input: VerifiedGiftReceipt): GiftPublishRpcResult {
    try {
      return { ok: true, result: this.publishGiftReceipt(input) };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Invalid gift receipt' };
    }
  }

  public fetch(request: Request): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const userId = safeId(new URL(request.url).searchParams.get('userId') ?? '', 'User ID');
    const snapshot = this.snapshot(userId);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment({ userId } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type: 'state', snapshot }));
    return new Response(null, { status: 101, webSocket: client });
  }

  public webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    try {
      if (typeof message !== 'string') throw new Error('Binary messages are not supported');
      const attachment = socket.deserializeAttachment() as SocketAttachment | null;
      if (attachment === null) throw new Error('Missing socket identity');
      const envelope = JSON.parse(message) as { type?: unknown; command?: unknown };
      if (envelope.type !== 'command' || envelope.command === undefined) throw new Error('Invalid command envelope');
      const snapshot = this.submitCommand({ userId: attachment.userId, command: envelope.command as GameCommand });
      socket.send(JSON.stringify({ type: 'ack', sequence: snapshot.state.sequence }));
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }));
    }
  }

  public webSocketClose(_socket: WebSocket, _code: number, _reason: string): void {
    // Workerd already finalized the peer before this lifecycle callback runs.
    // Closing again can attempt to send reserved transport codes such as 1006.
  }

  public webSocketError(socket: WebSocket, error: unknown): void {
    console.error(JSON.stringify({ level: 'error', event: 'room_socket_error', error: String(error) }));
    socket.close(1011, 'Socket error');
  }

  public async alarm(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) socket.close(1001, 'Room expired');
    await this.ctx.storage.deleteAll();
  }

  private readSnapshot(): RoomSnapshot | undefined {
    const row = this.ctx.storage.sql.exec<{ snapshot_json: string }>('SELECT snapshot_json FROM room_state WHERE singleton = 1').toArray()[0];
    return row === undefined ? undefined : parseSnapshot(row.snapshot_json);
  }

  private requireSnapshot(): RoomSnapshot {
    const snapshot = this.readSnapshot();
    if (snapshot === undefined) throw new Error('Room is not initialized');
    return snapshot;
  }

  private writeSnapshot(snapshot: RoomSnapshot): void {
    this.ctx.storage.sql.exec(
      'INSERT INTO room_state (singleton, snapshot_json, updated_at) VALUES (1, ?, ?) ON CONFLICT(singleton) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at',
      JSON.stringify(snapshot),
      snapshot.updatedAt,
    );
  }

  private broadcast(payload: unknown): void {
    const encoded = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState === WebSocket.OPEN) socket.send(encoded);
    }
  }
}
