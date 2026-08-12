export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const GIFT_COSTS = { tea: 50, coffee: 100, chocolate: 150, rose: 250, prayer_beads: 400, cake: 1000 };
export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export function normalizeUsername(username) {
    if (!USERNAME_PATTERN.test(username))
        throw new Error('invalid_username');
    return username.toLowerCase();
}
export function friendshipPairId(first, second) {
    if (!SAFE_ID_PATTERN.test(first) || !SAFE_ID_PATTERN.test(second) || first === second)
        throw new Error('invalid_pair');
    return [first, second].sort().join('_');
}
export function assertSafeId(value) {
    if (!SAFE_ID_PATTERN.test(value))
        throw new Error('invalid_identifier');
}
export function giftCost(giftId) {
    const cost = GIFT_COSTS[giftId];
    if (cost === undefined)
        throw new Error('unknown_gift');
    return cost;
}
export function assertUsernameChangeAllowed(previousChangedAt, now) {
    if (!Number.isSafeInteger(now) || now < 0)
        throw new Error('invalid_time');
    if (previousChangedAt !== undefined && now - previousChangedAt < USERNAME_CHANGE_COOLDOWN_MS)
        throw new Error('username_change_cooldown');
}
export function sameGiftReceipt(first, second) {
    return first.senderId === second.senderId
        && first.recipientId === second.recipientId
        && first.giftId === second.giftId
        && first.roomId === second.roomId;
}
export function assertGiftBalance(balance, cost) {
    if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(cost) || cost <= 0 || balance < cost)
        throw new Error('insufficient_chips');
}
export function nextGiftRate(state, now, cost) {
    if (!Number.isSafeInteger(now) || now < 0)
        throw new Error('invalid_time');
    const day = new Date(now).toISOString().slice(0, 10);
    const recentTimes = (state?.recentTimes ?? []).filter((time) => time <= now && now - time < 3_600_000);
    if (state?.lastGiftAt !== undefined && now - state.lastGiftAt < 5_000)
        throw new Error('gift_cooldown');
    if (recentTimes.length >= 20)
        throw new Error('gift_hourly_limit');
    const daySpend = state?.day === day ? state.daySpend : 0;
    if (daySpend + cost > 5_000)
        throw new Error('gift_daily_limit');
    return { lastGiftAt: now, recentTimes: [...recentTimes, now], day, daySpend: daySpend + cost };
}
