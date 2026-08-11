import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { playDeterministicBotTurn } from '@luma/game-core';
import worker from '../src/index';

function request(path: string, userId: string, body?: unknown): Request {
  const init: RequestInit = {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Luma-User': userId },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(`https://local.test${path}`, init);
}

describe('authoritative room Durable Object', () => {
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
});
