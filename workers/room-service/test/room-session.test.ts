import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createGame, playDeterministicBotTurn } from '@luma/game-core';
import worker from '../src/index';
import { parseSnapshot } from '../src/room-session';

function request(path: string, userId: string, body?: unknown): Request {
  const init: RequestInit = {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Luma-User': userId },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(`https://local.test${path}`, init);
}

describe('authoritative room Durable Object', () => {
  it('rejects persisted snapshots whose tile face does not match its canonical identity', () => {
    const state = createGame({ gameId: 'shape-probe', variant: 'classic', playerIds: ['p0', 'p1', 'p2', 'p3'], seed: 71 });
    const firstWallTile = state.wall[0];
    if (firstWallTile === undefined) throw new Error('Expected wall tile');
    const tamperedState = { ...state, wall: [{ ...firstWallTile, number: firstWallTile.number === 13 ? 12 : 13 }, ...state.wall.slice(1)] };
    const tampered = {
      roomId: 'shape-probe',
      state: tamperedState,
      seats: { u0: 'p0' },
      updatedAt: 1,
    };
    expect(() => parseSnapshot(JSON.stringify(tampered))).toThrow(/invalid/);
  });

  it('isolates rooms, assigns four seats, and rejects a fifth player', async () => {
    const room = env.ROOMS.getByName('room-a');
    const initialized = await room.init({ roomId: 'room-a', hostUserId: 'u0', variant: 'classic', seed: 11 });
    expect(initialized.state.players).toHaveLength(4);
    await room.join('u1');
    await room.join('u2');
    await room.join('u3');
    expect((await worker.fetch(request('/v1/rooms/room-a/join', 'u4', {}), env)).status).toBe(400);
    const other = env.ROOMS.getByName('room-b');
    expect((await other.init({ roomId: 'room-b', hostUserId: 'u0', variant: '101', seed: 12 })).state.variant).toBe('101');
  });

  it('validates seat ownership, sequence numbers, and duplicate commands', async () => {
    const room = env.ROOMS.getByName('commands');
    const snapshot = await room.init({ roomId: 'commands', hostUserId: 'host', variant: 'classic', seed: 99 });
    const playerId = snapshot.seats.host;
    const tileId = snapshot.state.players[0]?.rack[0]?.id;
    expect(playerId).toBeDefined();
    expect(tileId).toBeDefined();
    if (playerId === undefined || tileId === undefined) throw new Error('Expected dealer seat and tile');
    const command = { type: 'discard' as const, commandId: 'c1', playerId, expectedSequence: 0, tileId };
    expect((await room.submitCommand({ userId: 'host', command })).state.sequence).toBe(1);
    expect((await room.submitCommand({ userId: 'host', command })).state.sequence).toBe(1);
    const collision = await worker.fetch(request('/v1/rooms/commands/command', 'host', { command: { ...command, tileId: snapshot.state.players[0]?.rack[1]?.id ?? '' } }), env);
    expect(collision.status).toBe(400);
    const collisionBody = await collision.json<{ error: string }>();
    expect(collisionBody.error).toMatch(/another payload/);
    expect((await worker.fetch(request('/v1/rooms/commands/command', 'intruder', { command }), env)).status).toBe(403);
  });

  it('keeps one seat per account across two devices, reconnect, disconnect, stale and out-of-turn commands', async () => {
    const room = env.ROOMS.getByName('two-device');
    const initialized = await room.init({ roomId: 'two-device', hostUserId: 'host', variant: 'classic', seed: 42 });
    const firstJoin = await room.join('friend');
    const secondDeviceJoin = await room.join('friend');
    expect(secondDeviceJoin.seats.friend).toBe(firstJoin.seats.friend);
    expect(Object.keys(secondDeviceJoin.seats)).toEqual(['host', 'friend']);

    const hostPlayerId = initialized.seats.host;
    const hostTileId = initialized.state.players[0]?.rack[0]?.id;
    if (hostPlayerId === undefined || hostTileId === undefined) throw new Error('Expected host dealer seat');
    const afterDiscard = await room.submitCommand({
      userId: 'host',
      command: { type: 'discard', commandId: 'two-device-discard', playerId: hostPlayerId, expectedSequence: 0, tileId: hostTileId },
    });
    const outOfTurn = await room.trySubmitCommand({
      userId: 'host',
      command: { type: 'draw_wall', commandId: 'host-out-of-turn', playerId: hostPlayerId, expectedSequence: afterDiscard.state.sequence },
    });
    expect(outOfTurn).toMatchObject({ ok: false, code: 'rule_error' });
    const friendPlayerId = afterDiscard.seats.friend;
    if (friendPlayerId === undefined) throw new Error('Expected friend seat');
    const stale = await room.trySubmitCommand({
      userId: 'friend',
      command: { type: 'draw_wall', commandId: 'friend-stale', playerId: friendPlayerId, expectedSequence: 0 },
    });
    expect(stale).toMatchObject({ ok: false, code: 'rule_error' });

    const socketRequest = () => new Request('https://local.test/v1/rooms/two-device/socket', {
      headers: { 'X-Luma-User': 'friend', Upgrade: 'websocket' },
    });
    const firstSocket = await worker.fetch(socketRequest(), env);
    const secondSocket = await worker.fetch(socketRequest(), env);
    expect(firstSocket.status).toBe(101);
    expect(secondSocket.status).toBe(101);
    firstSocket.webSocket?.accept();
    firstSocket.webSocket?.close(1000, 'device disconnected');
    const reconnected = await worker.fetch(socketRequest(), env);
    expect(reconnected.status).toBe(101);
    expect((await room.snapshot('friend')).state).toEqual(afterDiscard.state);
  });

  it('authoritatively persists a complete 101 bot round including table melds and settlement', async () => {
    const room = env.ROOMS.getByName('complete-101');
    let snapshot = await room.init({ roomId: 'complete-101', hostUserId: 'u0', variant: '101', seed: 20260811 });
    for (const userId of ['u1', 'u2', 'u3']) snapshot = await room.join(userId);
    const userByPlayer = new Map(Object.entries(snapshot.seats).map(([userId, playerId]) => [playerId, userId]));
    let turns = 0;
    while (snapshot.state.phase !== 'round_finished') {
      const active = snapshot.state.players[snapshot.state.turnIndex];
      if (active === undefined) throw new Error('Expected active player');
      const userId = userByPlayer.get(active.id);
      if (userId === undefined) throw new Error('Expected authenticated seat');
      const turn = playDeterministicBotTurn(snapshot.state, snapshot.state.sequence, 'worker-bot');
      for (const command of turn.commands) snapshot = await room.submitCommand({ userId, command });
      turns += 1;
      if (turns > 256) throw new Error('Authoritative round did not terminate');
    }
    expect(snapshot.state.settlement?.profile).toBe('101-fixed-open-v1');
    expect(snapshot.state.tableMelds.length).toBeGreaterThan(0);
    expect((await room.snapshot('u0')).state).toEqual(snapshot.state);
  }, 20_000);

  it('publishes a verified gift receipt exactly once and rejects an idempotency collision', async () => {
    const room = env.ROOMS.getByName('gift-room');
    await room.init({ roomId: 'gift-room', hostUserId: 'alice', variant: 'classic', seed: 17 });
    await room.join('bob');
    const receipt = { receiptId: 'receipt_1', roomId: 'gift-room', senderId: 'alice', recipientId: 'bob', giftId: 'tea' as const, chipCost: 50 as const, createdAt: 1_786_512_000_000 };
    expect(await room.publishGiftReceipt(receipt)).toMatchObject({ published: true, receipt });
    expect(await room.publishGiftReceipt(receipt)).toMatchObject({ published: false, receipt });
    const collision = await room.tryPublishGiftReceipt({ ...receipt, giftId: 'coffee', chipCost: 100 });
    expect(collision.ok).toBe(false);
    if (collision.ok) throw new Error('Expected gift receipt collision');
    expect(collision.message).toMatch(/another payload/);
  });

  it('accepts the private Firebase receipt bridge only with its configured bearer token', async () => {
    const room = env.ROOMS.getByName('bridge-room');
    await room.init({ roomId: 'bridge-room', hostUserId: 'alice', variant: 'classic', seed: 18 });
    await room.join('bob');
    const receipt = { receiptId: 'receipt_bridge_1', roomId: 'bridge-room', senderId: 'alice', recipientId: 'bob', giftId: 'tea', chipCost: 50, createdAt: 1_786_512_000_000 };
    const unauthorized = await worker.fetch(new Request('https://local.test/internal/v1/rooms/bridge-room/gift-receipts', { method: 'POST', body: JSON.stringify(receipt) }), env);
    expect(unauthorized.status).toBe(403);
    const authorizedRequest = () => new Request('https://local.test/internal/v1/rooms/bridge-room/gift-receipts', {
      method: 'POST', headers: { Authorization: 'Bearer local-test-gift-bridge-token', 'Content-Type': 'application/json' }, body: JSON.stringify(receipt),
    });
    expect(await worker.fetch(authorizedRequest(), env)).toMatchObject({ status: 200 });
    const replay = await worker.fetch(authorizedRequest(), env);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ published: false });
  });
});
