import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  GameRuleError,
  applyCommand,
  createGame,
  createMatch,
  findOpeningMelds101,
  findTableExtension,
  findWinningMelds,
  playDeterministicBotTurn,
  recordMatchRound,
  settleMatchEconomy,
  type GameState,
  type GameCommand,
  type GameVariant,
} from '@luma/game-core';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MessageCircle, Mic, Music2, Send, VolumeX, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OkeyTable, type SeatDiscard, type TableGiftEvent } from '../../src/components/okey-table';
import { TileRack } from '../../src/components/tile-rack';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { decodeOfflineMatch, encodeOfflineMatch, offlineMatchIdentity } from '../../src/services/offline-match';
import { useAppStore } from '../../src/stores/app-store';
import { palette, radius, space } from '../../src/theme/tokens';
import { useLumaAudio } from '../../src/audio/audio-provider';
import { GiftSheet, giftImageKey } from '../../src/components/gift-sheet';
import { GIFT_CATALOG, nextGiftId, type GiftId } from '../../src/services/gifts';
import { LocalGiftAuthority } from '../../src/services/local-gift-authority';
import { roomEconomyMode, type MockEconomyMode, type RoomEntry } from '../../src/services/room-catalog';
import { MockChatAdapter } from '../../src/services/mock-chat';
import { MockVoiceAdapter } from '../../src/services/mock-voice';
import type { ChatMessage } from '../../src/services/contracts';
import { botTurnDelayMs } from '../../src/services/table-interaction';

const PLAYERS = ['p0', 'p1', 'p2', 'p3'] as const;
const LANDSCAPE_TABLE_SHARE = 0.56;
const LANDSCAPE_TABLE_MAX_WIDTH = 620;
const PORTRAIT_TABLE_MAX_WIDTH = 620;
const LANDSCAPE_TABLE_MAX_HEIGHT = 310;
const PORTRAIT_TABLE_MAX_HEIGHT = 360;
const LANDSCAPE_HEADER_HEIGHT = 44;

function newMatch(variant: GameVariant, seed: number): GameState {
  return createGame({ gameId: `offline-${variant}-${seed}`, variant, playerIds: PLAYERS, seed });
}

export default function GameScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { playEffect, setTableAudio, setVoiceActive } = useLumaAudio();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ variant?: string; seed?: string; tableTheme?: string; economyMode?: string; entryChips?: string; roomId?: string }>();
  const variant: GameVariant = params.variant === '101' ? '101' : 'classic';
  const seed = Number.isFinite(Number(params.seed)) ? Number(params.seed) : 20260811;
  const requestedEntry = Number(params.entryChips);
  const entryChips: RoomEntry = requestedEntry === 100 || requestedEntry === 500 || requestedEntry === 1000 ? requestedEntry : 0;
  const economyMode: MockEconomyMode = roomEconomyMode(entryChips);
  const identity = useMemo(() => offlineMatchIdentity(variant, seed), [seed, variant]);
  const persistenceKey = `luma-match-v1-${variant}-${seed}`;
  const [game, setGame] = useState(() => newMatch(variant, seed));
  const [hydratedKey, setHydratedKey] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [chatSafetyTarget, setChatSafetyTarget] = useState<ChatMessage>();
  const [talking, setTalking] = useState(false);
  const [giftSeat, setGiftSeat] = useState<number>();
  const [giftEvent, setGiftEvent] = useState<TableGiftEvent>();
  const [giftCooldownUntil, setGiftCooldownUntil] = useState<number>();
  const [rackDragActive, setRackDragActive] = useState(false);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const lowPerformance = useAppStore((state) => state.lowPerformance);
  const tableTheme = useAppStore((state) => state.tableTheme);
  const roomTableTheme = params.tableTheme === 'kahvehane' ? 'kahvehane' : tableTheme;
  const musicPlaying = useAppStore((state) => state.musicPlaying);
  const toggleMusic = useAppStore((state) => state.toggleMusic);
  const chips = useAppStore((state) => state.chips);
  const setMockChipBalance = useAppStore((state) => state.setMockChipBalance);
  const giftHistory = useAppStore((state) => state.giftHistory);
  const blockedUserIds = useAppStore((state) => state.blockedUserIds);
  const recordGift = useAppStore((state) => state.recordGift);
  const applyMockMatchSettlement = useAppStore((state) => state.applyMockMatchSettlement);
  const botBusy = useRef(false);
  const botCommands = useRef<GameCommand[]>([]);
  const commandIndex = useRef(0);
  const hydrationRequest = useRef<symbol | undefined>(undefined);
  const audioState = useRef<{ sequence: number; discards: number; melds: number; penalties: number; finished: boolean; turnIndex: number; winnerIds: readonly string[] } | undefined>(undefined);
  const localGiftAuthority = useRef<LocalGiftAuthority | undefined>(undefined);
  const chatAdapter = useRef(new MockChatAdapter());
  const voiceAdapter = useRef(new MockVoiceAdapter());
  if (localGiftAuthority.current === undefined) {
    localGiftAuthority.current = new LocalGiftAuthority(chips, giftHistory, {
      isBlocked: (_senderId, recipientId) => blockedUserIds.includes(recipientId),
    });
  }
  const playerNames = useMemo(() => [t('game.you'), 'Ada', 'Mert', 'Lina'] as const, [t]);

  const userRack = useMemo(() => game.players[0]?.rack ?? [], [game.players]);
  const orderedRack = useMemo(() => {
    const byId = new Map(userRack.map((tile) => [tile.id, tile]));
    const ordered = rackOrder.flatMap((id) => {
      const tile = byId.get(id);
      return tile === undefined ? [] : [tile];
    });
    for (const tile of userRack) if (!rackOrder.includes(tile.id)) ordered.push(tile);
    return ordered;
  }, [rackOrder, userRack]);
  const selectedFinishMelds = useMemo(() => {
    if (selectedId === undefined || game.phase !== 'awaiting_discard' || game.turnIndex !== 0) return undefined;
    const player = game.players[0];
    if (player === undefined) return undefined;
    if (variant === '101' && !player.opened && !game.rules.allowDirectFinishBelowThreshold101) return undefined;
    const remaining = player.rack.filter((tile) => tile.id !== selectedId);
    return findWinningMelds(remaining, game.indicator, {
      allowHighAceWrap: variant === 'classic' && game.rules.classicHighAceRun,
      allowSevenPairs: variant === 'classic' && game.rules.allowSevenPairsClassic,
      pairsOnly: variant === '101' && player.openingMode === 'pairs',
    });
  }, [game.indicator, game.phase, game.players, game.rules.allowDirectFinishBelowThreshold101, game.rules.allowSevenPairsClassic, game.rules.classicHighAceRun, game.turnIndex, selectedId, variant]);
  const automaticOpening = useMemo(() => {
    const player = game.players[0];
    if (variant !== '101' || game.phase !== 'awaiting_discard' || game.turnIndex !== 0 || player === undefined || player.opened) return undefined;
    return findOpeningMelds101(
      player.rack,
      game.indicator,
      game.rules.openingPoints101,
      game.rules.pairsRequiredToOpen101,
      game.rules.allowPairsOpening101,
    );
  }, [game.indicator, game.phase, game.players, game.rules.allowPairsOpening101, game.rules.openingPoints101, game.rules.pairsRequiredToOpen101, game.turnIndex, variant]);
  const automaticExtension = useMemo(
    () => variant === '101' && game.phase === 'awaiting_discard' && game.turnIndex === 0 ? findTableExtension(game, 'p0') : undefined,
    [game, variant],
  );
  const latestDiscards = useMemo<readonly SeatDiscard[]>(() => {
    const byPlayer = new Map<string, (typeof game.discardHistory)[number]>();
    for (const record of game.discardHistory) {
      if (record.pickedBy === undefined) byPlayer.set(record.playerId, record);
    }
    const top = game.discardHistory.at(-1);
    const currentPlayer = game.players[0];
    const canTakeTop = game.phase === 'awaiting_draw'
      && game.turnIndex === 0
      && top?.pickedBy === undefined
      && (variant === 'classic' || currentPlayer?.opened === true);
    return [...byPlayer.values()].map((record) => {
      const actionable = canTakeTop && record.sequence === top?.sequence;
      const player = playerNames[game.players.findIndex((candidate) => candidate.id === record.playerId)] ?? record.playerId;
      const tile = record.tile.kind === 'false_joker'
        ? t('a11y.falseJoker')
        : t('a11y.tile', { color: t(`color.${record.tile.color ?? 'black'}`), number: record.tile.number });
      return {
        playerId: record.playerId,
        tile: record.tile,
        actionable,
        accessibilityLabel: t(actionable ? 'a11y.takeDiscard' : 'a11y.lastDiscard', { player, tile }),
      };
    });
  }, [game, playerNames, t, variant]);

  useEffect(() => {
    const request = Symbol(persistenceKey);
    hydrationRequest.current = request;
    void (async () => {
      const fresh = newMatch(variant, seed);
      try {
        const saved = await AsyncStorage.getItem(persistenceKey);
        if (hydrationRequest.current !== request) return;
        const restored = saved === null ? undefined : decodeOfflineMatch(saved, identity);
        setGame(restored ?? fresh);
        if (saved !== null && restored === undefined) await AsyncStorage.removeItem(persistenceKey);
      } catch {
        if (hydrationRequest.current === request) setGame(fresh);
      } finally {
        if (hydrationRequest.current === request) setHydratedKey(persistenceKey);
      }
    })();
    return () => {
      if (hydrationRequest.current === request) hydrationRequest.current = undefined;
    };
  }, [identity, persistenceKey, seed, variant]);

  useEffect(() => {
    if (hydratedKey !== persistenceKey) return;
    void AsyncStorage.setItem(persistenceKey, encodeOfflineMatch(game));
  }, [game, hydratedKey, persistenceKey]);

  useEffect(() => {
    if (game.phase !== 'round_finished' || game.settlement === undefined || entryChips === 0) return;
    const matchId = `${params.roomId ?? identity.gameId}:${String(seed)}:${economyMode}`;
    const match = createMatch({
      gameId: matchId,
      variant,
      playerIds: PLAYERS,
      seed,
      config: { economyMode },
    });
    const completed = recordMatchRound(match, game.settlement);
    const economy = settleMatchEconomy(completed);
    const playerEntry = economy.entries.find((entry) => entry.playerId === 'p0');
    if (playerEntry !== undefined) applyMockMatchSettlement(matchId, playerEntry.net);
  }, [applyMockMatchSettlement, economyMode, entryChips, game.phase, game.settlement, identity.gameId, params.roomId, seed, variant]);

  useEffect(() => {
    setTableAudio(true, seed);
    return () => setTableAudio(false, seed);
  }, [seed, setTableAudio]);

  useEffect(() => {
    setVoiceActive(talking);
    return () => setVoiceActive(false);
  }, [setVoiceActive, talking]);

  useEffect(() => {
    const voice = voiceAdapter.current;
    voice.join('granted');
    return () => { voice.disconnect(); };
  }, []);

  useEffect(() => {
    if (hydratedKey !== persistenceKey) return;
    const next = {
      sequence: game.sequence,
      discards: game.discardHistory.length,
      melds: game.tableMelds.length,
      penalties: game.players[0]?.penalties ?? 0,
      finished: game.phase === 'round_finished',
      turnIndex: game.turnIndex,
      winnerIds: game.settlement?.winnerIds ?? (game.winnerId === undefined ? [] : [game.winnerId]),
    };
    const previous = audioState.current;
    audioState.current = next;
    if (previous === undefined || next.sequence <= previous.sequence) return;
    if (next.discards > previous.discards) {
      playEffect('tileDiscard');
      if (previous.turnIndex === 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (next.melds > previous.melds) {
      playEffect('meldOpen');
      if (previous.turnIndex === 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      playEffect('tilePickup');
      if (previous.turnIndex === 0) void Haptics.selectionAsync();
    }
    if (next.penalties > previous.penalties) {
      playEffect('warning');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    if (next.finished && !previous.finished) {
      playEffect('win');
      if (next.winnerIds.includes('p0')) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [game, hydratedKey, persistenceKey, playEffect]);

  useEffect(() => {
    if (game.phase === 'round_finished' || game.turnIndex === 0) {
      botCommands.current = [];
      botBusy.current = false;
      return;
    }
    if (botBusy.current) return;
    if (botCommands.current.length === 0) {
      try {
        const player = game.players[game.turnIndex];
        if (player === undefined) return;
        botCommands.current = [...playDeterministicBotTurn(game, commandIndex.current++, `bot-${player.id}`).commands];
      } catch {
        botCommands.current = [];
        return;
      }
    }
    const nextCommand = botCommands.current[0];
    if (nextCommand === undefined) return;
    botBusy.current = true;
    const timer = setTimeout(() => {
      setGame((current) => {
        try {
          if (current.turnIndex === 0 || current.phase === 'round_finished') {
            botCommands.current = [];
            return current;
          }
          const next = applyCommand(current, nextCommand).state;
          botCommands.current.shift();
          return next;
        } catch (error) {
          botCommands.current = [];
          setNotice(error instanceof Error ? error.message : String(error));
          return { ...current };
        } finally {
          botBusy.current = false;
        }
      });
    }, botTurnDelayMs(game.sequence, nextCommand.type));
    return () => {
      clearTimeout(timer);
      botBusy.current = false;
    };
  }, [game]);

  const runUserCommand = (kind: 'draw' | 'discard') => {
    if (kind === 'draw') {
      applyUserCommand((current) => ({
        type: 'draw_wall', commandId: `user-draw-wall-${current.sequence}`, playerId: 'p0', expectedSequence: current.sequence,
      }));
      return;
    }
    if (selectedId === undefined) {
      setNotice(t('game.select'));
      return;
    }
    applyUserCommand((current) => selectedFinishMelds === undefined
      ? { type: 'discard', tileId: selectedId, commandId: `user-discard-${current.sequence}`, playerId: 'p0', expectedSequence: current.sequence }
      : { type: 'finish', discardTileId: selectedId, melds: selectedFinishMelds, commandId: `user-finish-${current.sequence}`, playerId: 'p0', expectedSequence: current.sequence });
    setSelectedId(undefined);
  };

  const discardRackTile = (tileId: string) => {
    if (game.phase !== 'awaiting_discard' || game.turnIndex !== 0) return;
    const player = game.players[0];
    if (player === undefined) return;
    const remaining = player.rack.filter((tile) => tile.id !== tileId);
    const finishMelds = variant === '101' && !player.opened && !game.rules.allowDirectFinishBelowThreshold101
      ? undefined
      : findWinningMelds(remaining, game.indicator, {
          allowHighAceWrap: variant === 'classic' && game.rules.classicHighAceRun,
          allowSevenPairs: variant === 'classic' && game.rules.allowSevenPairsClassic,
          pairsOnly: variant === '101' && player.openingMode === 'pairs',
        });
    applyUserCommand((current) => finishMelds === undefined
      ? { type: 'discard', tileId, commandId: `user-drag-discard-${current.sequence}`, playerId: 'p0', expectedSequence: current.sequence }
      : { type: 'finish', discardTileId: tileId, melds: finishMelds, commandId: `user-drag-finish-${current.sequence}`, playerId: 'p0', expectedSequence: current.sequence });
    setSelectedId(undefined);
  };

  const takeLatestDiscard = () => {
    applyUserCommand((current) => ({
      type: 'draw_discard', commandId: `user-draw-discard-${current.sequence}`, playerId: 'p0', expectedSequence: current.sequence,
    }));
  };

  function applyUserCommand(build: (current: GameState) => GameCommand): void {
    setGame((current) => {
      try {
        const next = applyCommand(current, build(current)).state;
        setNotice('');
        return next;
      } catch (error) {
        setNotice(error instanceof GameRuleError ? error.message : String(error));
        return current;
      }
    });
  }

  const runTableAction = () => {
    if (automaticOpening !== undefined) {
      applyUserCommand((current) => ({
          type: 'open_melds', commandId: `user-open-${current.sequence}`, playerId: 'p0',
          expectedSequence: current.sequence, melds: automaticOpening.melds,
      }));
    } else if (automaticExtension !== undefined) {
      applyUserCommand((current) => ({
          type: 'extend_meld', commandId: `user-extend-${current.sequence}`, playerId: 'p0',
          expectedSequence: current.sequence, tableMeldId: automaticExtension.tableMeldId,
          tileIds: automaticExtension.tileIds,
      }));
    }
  };

  const moveTile = (id: string, delta: number) => {
    setRackOrder((order) => {
      const live = new Set(userRack.map((tile) => tile.id));
      const normalized = [...order.filter((tileId) => live.has(tileId)), ...userRack.map((tile) => tile.id).filter((tileId) => !order.includes(tileId))];
      const from = normalized.indexOf(id);
      if (from < 0) return order;
      const to = Math.max(0, Math.min(normalized.length - 1, from + delta));
      const copy = [...normalized];
      copy.splice(from, 1);
      copy.splice(to, 0, id);
      return copy;
    });
  };

  const sendMessage = () => {
    const message = chatDraft.trim().slice(0, 240);
    if (message.length === 0) return;
    try {
      chatAdapter.current.send({ roomId: identity.gameId, senderId: 'p0', body: message, now: Date.now() });
      setMessages(chatAdapter.current.list(identity.gameId, 'p0', Date.now()).slice(-20));
      setChatDraft('');
      setNotice('');
    } catch {
      setNotice(t('chat.unavailable'));
    }
  };

  const toggleChat = () => {
    setChatOpen((open) => {
      const next = !open;
      if (next && chatAdapter.current.list(identity.gameId, 'p0', Date.now()).length === 0) {
        chatAdapter.current.send({ roomId: identity.gameId, senderId: 'p1', body: t('chat.demoMessage'), now: Date.now() });
        setMessages(chatAdapter.current.list(identity.gameId, 'p0', Date.now()));
      }
      return next;
    });
  };

  const applyChatSafetyAction = (action: 'mute' | 'block' | 'report') => {
    if (chatSafetyTarget === undefined) return;
    if (action === 'mute') chatAdapter.current.mute('p0', chatSafetyTarget.senderId);
    if (action === 'block') chatAdapter.current.block('p0', chatSafetyTarget.senderId);
    if (action === 'report') chatAdapter.current.report({ reporterId: 'p0', messageId: chatSafetyTarget.id, reason: 'other', now: Date.now() });
    setMessages(chatAdapter.current.list(identity.gameId, 'p0', Date.now()).slice(-20));
    setChatSafetyTarget(undefined);
    setNotice(t(`chat.${action}Applied`));
  };

  const setPushToTalk = (active: boolean) => {
    const state = voiceAdapter.current.setPushToTalk(active);
    setTalking(state.pushToTalkActive);
  };

  const sendGift = (giftId: GiftId) => {
    if (giftSeat === undefined || giftSeat === 0) return;
    const gift = GIFT_CATALOG.find((item) => item.id === giftId);
    if (gift === undefined) return;
    try {
      const recipient = game.players[giftSeat];
      if (recipient === undefined) return;
      const now = Date.now();
      const receipt = localGiftAuthority.current?.send({
        idempotencyKey: nextGiftId(identity.gameId, now, giftHistory),
        recipientId: recipient.id,
        giftId,
        roomId: identity.gameId,
        now,
      });
      if (receipt === undefined) return;
      recordGift({
        id: receipt.id,
        senderId: receipt.senderId,
        recipientId: receipt.recipientId,
        giftId: receipt.giftId,
        roomId: receipt.roomId,
        chipCost: receipt.chipCost,
        createdAt: receipt.createdAt,
      });
      setMockChipBalance(localGiftAuthority.current?.balance() ?? chips);
      setGiftCooldownUntil(Date.now() + 5000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setNotice(t(message.includes('negative') ? 'gift.insufficient' : 'gift.unavailable'));
      return;
    }
    setGiftEvent({
      id: `gift-flight-${commandIndex.current++}`,
      fromSeatIndex: 0,
      toSeatIndex: giftSeat,
      giftId: giftImageKey(giftId),
      accessibilityLabel: t(`gift.name.${giftId}`),
    });
    setGiftSeat(undefined);
    setNotice(t('gift.sent'));
    playEffect('gift');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const isLandscape = width > height;
  const rootPaddingTop = isLandscape
    ? Math.max(insets.top, space.xxs)
    : Platform.OS === 'android' ? 34 : 56;
  const landscapeLeftInset = Math.max(insets.left, space.md);
  const landscapeRightInset = Math.max(insets.right, space.md);
  const landscapeContentWidth = width - landscapeLeftInset - landscapeRightInset;
  const tableWidth = isLandscape
    ? Math.min(LANDSCAPE_TABLE_MAX_WIDTH, landscapeContentWidth * LANDSCAPE_TABLE_SHARE)
    : Math.min(width - space.md * 2, PORTRAIT_TABLE_MAX_WIDTH);
  const playColumnWidth = isLandscape
    ? landscapeContentWidth - tableWidth - space.md
    : tableWidth;
  const landscapeContentHeight = height
    - rootPaddingTop
    - LANDSCAPE_HEADER_HEIGHT
    - Math.max(insets.bottom, space.xxs)
    - space.md;
  const tableHeight = isLandscape
    ? Math.min(landscapeContentHeight, LANDSCAPE_TABLE_MAX_HEIGHT)
    : Math.min(height * 0.36, PORTRAIT_TABLE_MAX_HEIGHT);
  const compactLandscapeActions = isLandscape && playColumnWidth < 360;
  const roundFinished = game.phase === 'round_finished';
  const userCanAct = game.turnIndex === 0 && !roundFinished;
  const roundWinnerIds = game.settlement?.winnerIds ?? (game.winnerId === undefined ? [] : [game.winnerId]);
  const roundWinnerNames = roundWinnerIds.map((winnerId) => {
    const winnerIndex = game.players.findIndex((player) => player.id === winnerId);
    return playerNames[winnerIndex] ?? winnerId;
  });
  const roundStatus = roundWinnerNames.length === 0
    ? t('game.roundDraw')
    : roundWinnerNames.length === 1
      ? t('game.roundWinner', { name: roundWinnerNames[0] })
      : t('game.roundWinners', { names: roundWinnerNames.join(', ') });
  const userRoundScore = game.settlement?.entries.find((entry) => entry.playerId === 'p0')?.delta;

  const table = (
    <OkeyTable
      state={game}
      width={tableWidth}
      height={tableHeight}
      lowPerformance={lowPerformance}
      reducedMotion={reducedMotion}
      playerNames={playerNames}
      wallLabel={t('game.wallLabel')}
      latestDiscards={latestDiscards}
      onDiscardPress={takeLatestDiscard}
      onSeatPress={(seatIndex) => { if (seatIndex !== 0) setGiftSeat(seatIndex); }}
      giftEvent={giftEvent}
      theme={roomTableTheme}
      wallDrawEnabled={game.phase === 'awaiting_draw' && game.turnIndex === 0 && !roundFinished}
      onWallDraw={() => runUserCommand('draw')}
      wallDropDirection={isLandscape ? 'right' : 'down'}
      rackDropActive={rackDragActive}
    />
  );

  const playControls = (
    <View style={[styles.playColumn, { width: playColumnWidth }]}>
      <View style={styles.statusRow}>
        <Text maxFontSizeMultiplier={1.6} numberOfLines={2} adjustsFontSizeToFit style={[styles.status, { color: roundFinished ? palette.gold : userCanAct ? palette.aqua : colors.muted }]}>
          {roundFinished
            ? roundStatus
            : userCanAct
              ? t('game.yourTurn')
              : t('game.waiting', { name: playerNames[game.turnIndex] ?? t('game.you') })}
        </Text>
        <Text maxFontSizeMultiplier={1.6} numberOfLines={2} adjustsFontSizeToFit style={[styles.wall, { color: colors.muted }]}>
          {roundFinished && userRoundScore !== undefined
            ? t('game.roundScore', { score: userRoundScore })
            : game.tableMelds.length > 0
              ? t('game.tableMelds', { count: game.tableMelds.length })
              : t('game.wall', { count: game.wall.length })}
        </Text>
      </View>
      <TileRack
        tiles={orderedRack}
        selectedId={selectedId}
        width={playColumnWidth}
        accessibilityLabel={t('a11y.rack')}
        reducedMotion={reducedMotion}
        theme={roomTableTheme}
        onSelect={(tileId) => setSelectedId((current) => current === tileId ? undefined : tileId)}
        onMove={moveTile}
        onDiscard={discardRackTile}
        discardEnabled={game.phase === 'awaiting_discard' && game.turnIndex === 0 && !roundFinished}
        discardDirection={isLandscape ? 'left' : 'up'}
        interactionEnabled={userCanAct}
        onDragActive={setRackDragActive}
      />
      {notice.length > 0 && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      {(automaticOpening !== undefined || automaticExtension !== undefined) && (
        <Pressable accessibilityRole="button" onPress={runTableAction} style={[styles.tableAction, { backgroundColor: colors.glass, borderColor: colors.border }]}>
          <Text style={[styles.tableActionLabel, { color: palette.aqua }]}>
            {automaticOpening !== undefined
              ? t('game.autoOpen', { points: automaticOpening.points })
              : t('game.autoExtend')}
          </Text>
        </Pressable>
      )}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !userCanAct }}
          disabled={!userCanAct}
          onPress={() => runUserCommand(game.phase === 'awaiting_draw' ? 'draw' : 'discard')}
          style={[styles.primary, compactLandscapeActions && styles.compactAction, { opacity: userCanAct ? 1 : 0.45 }]}
        >
          <Text maxFontSizeMultiplier={1.5} numberOfLines={2} adjustsFontSizeToFit style={styles.primaryLabel}>
            {roundFinished
              ? t('game.roundComplete')
              : game.phase === 'awaiting_draw'
                ? t('game.draw')
                : selectedFinishMelds !== undefined
                  ? t('game.finish')
                  : t('game.discard')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('game.chat')}
          onPress={toggleChat}
          style={[styles.secondary, compactLandscapeActions && styles.compactSecondary, { backgroundColor: colors.glass }]}
        >
          <MessageCircle color={colors.text} />
          {!compactLandscapeActions && <Text maxFontSizeMultiplier={1.4} numberOfLines={1} adjustsFontSizeToFit style={[styles.secondaryLabel, { color: colors.text }]}>{t('game.chat')}</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('game.voiceMock')}
          onPressIn={() => setPushToTalk(true)}
          onPressOut={() => setPushToTalk(false)}
          style={[styles.voice, compactLandscapeActions && styles.compactVoice, { backgroundColor: talking ? palette.coral : colors.glass }]}
        >
          <Mic color={talking ? palette.white : colors.text} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background, paddingTop: rootPaddingTop }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={[
          styles.topBar,
          isLandscape && styles.landscapeTopBar,
          isLandscape && { paddingLeft: landscapeLeftInset, paddingRight: landscapeRightInset },
        ]}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} adjustsFontSizeToFit style={[styles.variant, { color: colors.text }]}>{variant === 'classic' ? t('game.classic') : t('game.101')}</Text>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} adjustsFontSizeToFit style={[styles.seed, { color: colors.muted }]}>{t('game.replaySeed', { seed })}</Text>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: musicPlaying }} onPress={toggleMusic} style={[styles.iconButton, { backgroundColor: colors.glass }]}>
          {musicPlaying ? <Music2 color={palette.aqua} /> : <VolumeX color={colors.muted} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isLandscape && styles.landscapeContent,
          isLandscape && {
            paddingLeft: landscapeLeftInset,
            paddingRight: landscapeRightInset,
            paddingBottom: Math.max(insets.bottom, space.xxs),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {table}
        {playControls}
      </ScrollView>

      {chatOpen && (
        <View
          style={[
            styles.chatPanel,
            isLandscape && styles.landscapeChatPanel,
            isLandscape && {
              left: landscapeLeftInset + tableWidth + space.md,
              right: landscapeRightInset,
              top: rootPaddingTop + LANDSCAPE_HEADER_HEIGHT + space.xs,
              bottom: Math.max(insets.bottom, space.xs),
            },
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.chatHeader}>
            <Text style={[styles.chatTitle, { color: colors.text }]}>{t('chat.title')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setChatOpen(false)}><X color={colors.text} /></Pressable>
          </View>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messageList}>
            {messages.map((message) => message.senderId === 'p0'
              ? <Text key={message.id} style={[styles.message, { color: colors.text, backgroundColor: colors.elevated }]}>{message.body}</Text>
              : (
                <Pressable
                  key={message.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.safetyActions', { message: message.body })}
                  onPress={() => setChatSafetyTarget(message)}
                  style={[styles.message, styles.incomingMessage, { backgroundColor: colors.glass }]}
                >
                  <Text style={{ color: colors.text }}>{message.body}</Text>
                </Pressable>
              ))}
          </ScrollView>
          {chatSafetyTarget !== undefined && (
            <View style={styles.chatSafetyActions}>
              <Pressable accessibilityRole="button" onPress={() => applyChatSafetyAction('mute')}><Text style={[styles.chatSafetyLabel, { color: colors.text }]}>{t('chat.mute')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => applyChatSafetyAction('block')}><Text style={[styles.chatSafetyLabel, { color: colors.text }]}>{t('chat.block')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => applyChatSafetyAction('report')}><Text style={[styles.chatSafetyLabel, { color: palette.coral }]}>{t('chat.report')}</Text></Pressable>
            </View>
          )}
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel={t('chat.placeholder')}
              value={chatDraft}
              onChangeText={setChatDraft}
              onSubmitEditing={sendMessage}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.muted}
              maxLength={240}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={t('chat.send')} onPress={sendMessage} style={styles.send}><Send size={19} color={palette.ink} /></Pressable>
          </View>
        </View>
      )}
      <GiftSheet
        visible={giftSeat !== undefined}
        recipient={giftSeat === undefined ? '' : playerNames[giftSeat] ?? ''}
        recipientAvatarIndex={giftSeat ?? 0}
        balance={chips}
        cooldownUntil={giftCooldownUntil}
        onClose={() => setGiftSeat(undefined)}
        onSend={sendGift}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, gap: space.sm },
  landscapeTopBar: { minHeight: LANDSCAPE_HEADER_HEIGHT },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, alignItems: 'center' },
  variant: { fontSize: 18, fontWeight: '900' },
  seed: { fontSize: 11, marginTop: 2 },
  content: { flexGrow: 1, gap: space.sm, padding: space.md, paddingBottom: 36 },
  landscapeContent: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingTop: space.xs },
  playColumn: { alignSelf: 'center', gap: space.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 15, fontWeight: '800' },
  wall: { fontSize: 12, fontWeight: '700' },
  notice: { color: palette.coral, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  tableAction: { minHeight: 40, borderWidth: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  tableActionLabel: { fontSize: 13, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: space.xs, alignItems: 'center' },
  primary: { flex: 1, minHeight: 52, borderRadius: radius.pill, backgroundColor: palette.aqua, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  compactAction: { minHeight: 44, paddingHorizontal: space.xs },
  primaryLabel: { color: palette.ink, fontSize: 15, fontWeight: '900' },
  secondary: { minHeight: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md },
  compactSecondary: { width: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 0 },
  secondaryLabel: { fontSize: 13, fontWeight: '800' },
  voice: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  compactVoice: { width: 44, height: 44, borderRadius: 22 },
  chatPanel: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, maxHeight: '56%', minHeight: 250, borderWidth: 1, borderRadius: radius.lg, padding: space.md, shadowColor: palette.black, shadowOpacity: 0.28, shadowRadius: 24 },
  landscapeChatPanel: { minHeight: 0, maxHeight: '100%' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatTitle: { fontSize: 18, fontWeight: '900' },
  messages: { flex: 1, marginVertical: space.sm },
  messageList: { gap: space.xs, justifyContent: 'flex-end' },
  message: { alignSelf: 'flex-end', maxWidth: '82%', paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.md, overflow: 'hidden' },
  incomingMessage: { alignSelf: 'flex-start' },
  chatSafetyActions: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: space.sm, marginBottom: space.xs },
  chatSafetyLabel: { minHeight: 44, paddingHorizontal: space.sm, textAlignVertical: 'center', fontSize: 13, fontWeight: '800' },
  composer: { flexDirection: 'row', gap: space.xs },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.aqua, alignItems: 'center', justifyContent: 'center' },
});
