import { describe, expect, it } from 'vitest';
import { parsePushPayload } from './push-payload';

describe('safe FCM payload parser', () => {
  it('accepts the four allowlisted notification types and safe deep-link identifiers', () => {
    expect(parsePushPayload({ type: 'room_invite', notificationId: 'note_1', deepLinkId: 'invite_1' })).toEqual({ type: 'room_invite', notificationId: 'note_1', deepLinkId: 'invite_1' });
  });
  it('rejects chat text, balances, unknown types, and unsafe identifiers', () => {
    expect(parsePushPayload({ type: 'room_invite', notificationId: 'n1', deepLinkId: 'i1', chatText: 'secret' })).toBeUndefined();
    expect(parsePushPayload({ type: 'wallet', notificationId: 'n1', deepLinkId: 'i1' })).toBeUndefined();
    expect(parsePushPayload({ type: 'gift_received', notificationId: 'n1', deepLinkId: '../wallet' })).toBeUndefined();
  });
});
