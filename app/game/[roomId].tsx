import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameRuleError,
  applyCommand,
  chooseBotDiscard,
  createGame,
  type GameState,
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
import { OkeyTable } from '../../src/components/okey-table';
import { TileRack } from '../../src/components/tile-rack';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { decodeOfflineMatch, encodeOfflineMatch, offlineMatchIdentity } from '../../src/services/offline-match';
import { useAppStore } from '../../src/stores/app-store';
import { palette, radius, space } from '../../src/theme/tokens';

const PLAYERS = ['p0', 'p1', 'p2', 'p3'] as const;

function newMatch(variant: GameVariant, seed: number): GameState {
  return createGame({ gameId: `offline-${variant}-${seed}`, variant, playerIds: PLAYERS, seed });
}

export default function GameScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ variant?: string; seed?: string }>();
  const variant: GameVariant = params.variant === '101' ? '101' : 'classic';
  const seed = Number.isFinite(Number(params.seed)) ? Number(params.seed) : 20260811;
  const identity = useMemo(() => offlineMatchIdentity(variant, seed), [seed, variant]);
  const persistenceKey = `luma-match-v1-${variant}-${seed}`;
  const [game, setGame] = useState(() => newMatch(variant, seed));
  const [hydratedKey, setHydratedKey] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [talking, setTalking] = useState(false);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const lowPerformance = useAppStore((state) => state.lowPerformance);
  const musicPlaying = useAppStore((state) => state.musicPlaying);
  const toggleMusic = useAppStore((state) => state.toggleMusic);
  const botBusy = useRef(false);
  const commandIndex = useRef(0);
  const hydrationRequest = useRef<symbol | undefined>(undefined);
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
    if (game.phase === 'round_finished' || game.turnIndex === 0 || botBusy.current) return;
    botBusy.current = true;
    const timer = setTimeout(() => {
      setGame((current) => {
        try {
          const player = current.players[current.turnIndex];
          if (player === undefined || current.turnIndex === 0 || current.phase === 'round_finished') return current;
          let next = current;
          if (next.phase === 'awaiting_draw') {
            next = applyCommand(next, {
              type: 'draw_wall',
              commandId: `bot-draw-${commandIndex.current++}`,
              playerId: player.id,
              expectedSequence: next.sequence,
            }).state;
          }
          const tileId = chooseBotDiscard(next, player.id, commandIndex.current);
          return applyCommand(next, {
            type: 'discard',
            tileId,
            commandId: `bot-discard-${commandIndex.current++}`,
            playerId: player.id,
            expectedSequence: next.sequence,
          }).state;
        } catch (error) {
          setNotice(error instanceof Error ? error.message : String(error));
          return current;
        } finally {
          botBusy.current = false;
        }
      });
    }, reducedMotion ? 80 : 430);
    return () => {
      clearTimeout(timer);
      botBusy.current = false;
    };
  }, [game.phase, game.sequence, game.turnIndex, reducedMotion]);

  const runUserCommand = (kind: 'draw' | 'discard') => {
    try {
      const commandId = `user-${kind}-${commandIndex.current++}`;
      if (kind === 'draw') {
        setGame((current) => applyCommand(current, {
          type: 'draw_wall', commandId, playerId: 'p0', expectedSequence: current.sequence,
        }).state);
        setNotice('');
        return;
      }
      if (selectedId === undefined) {
        setNotice(t('game.select'));
        return;
      }
      setGame((current) => applyCommand(current, {
        type: 'discard', tileId: selectedId, commandId, playerId: 'p0', expectedSequence: current.sequence,
      }).state);
      setSelectedId(undefined);
      setNotice('');
    } catch (error) {
      setNotice(error instanceof GameRuleError ? error.message : String(error));
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
    setMessages((items) => [...items.slice(-19), message]);
    setChatDraft('');
  };

  const isLandscape = width > height;
  const tableWidth = Math.min(width - space.md * 2, isLandscape ? width * 0.58 : 620);
  const tableHeight = Math.min(isLandscape ? height * 0.55 : height * 0.36, 360);
  const userCanAct = game.turnIndex === 0;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.variant, { color: colors.text }]}>{variant === 'classic' ? t('game.classic') : t('game.101')}</Text>
          <Text style={[styles.seed, { color: colors.muted }]}>{t('game.replaySeed', { seed })}</Text>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: musicPlaying }} onPress={toggleMusic} style={[styles.iconButton, { backgroundColor: colors.glass }]}>
          {musicPlaying ? <Music2 color={palette.aqua} /> : <VolumeX color={colors.muted} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <OkeyTable
          state={game}
          width={tableWidth}
          height={tableHeight}
          lowPerformance={lowPerformance}
          playerNames={playerNames}
          wallLabel={t('game.wallLabel')}
        />
        <View style={styles.statusRow}>
          <Text style={[styles.status, { color: userCanAct ? palette.aqua : colors.muted }]}>
            {userCanAct ? t('game.yourTurn') : t('game.waiting', { name: playerNames[game.turnIndex] ?? t('game.you') })}
          </Text>
          <Text style={[styles.wall, { color: colors.muted }]}>{t('game.wall', { count: game.wall.length })}</Text>
        </View>
        <TileRack
          tiles={orderedRack}
          selectedId={selectedId}
          width={tableWidth}
          accessibilityLabel={t('a11y.rack')}
          reducedMotion={reducedMotion}
          onSelect={(tileId) => setSelectedId((current) => current === tileId ? undefined : tileId)}
          onMove={moveTile}
        />
        {notice.length > 0 && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={!userCanAct}
            onPress={() => runUserCommand(game.phase === 'awaiting_draw' ? 'draw' : 'discard')}
            style={[styles.primary, { opacity: userCanAct ? 1 : 0.45 }]}
          >
            <Text style={styles.primaryLabel}>{game.phase === 'awaiting_draw' ? t('game.draw') : t('game.discard')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setChatOpen((open) => !open)} style={[styles.secondary, { backgroundColor: colors.glass }]}>
            <MessageCircle color={colors.text} />
            <Text style={[styles.secondaryLabel, { color: colors.text }]}>{t('game.chat')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.voiceMock')}
            onPressIn={() => setTalking(true)}
            onPressOut={() => setTalking(false)}
            style={[styles.voice, { backgroundColor: talking ? palette.coral : colors.glass }]}
          >
            <Mic color={talking ? palette.white : colors.text} />
          </Pressable>
        </View>
      </ScrollView>

      {chatOpen && (
        <View style={[styles.chatPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatTitle, { color: colors.text }]}>{t('chat.title')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setChatOpen(false)}><X color={colors.text} /></Pressable>
          </View>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messageList}>
            {messages.map((message, index) => <Text key={`${index}-${message}`} style={[styles.message, { color: colors.text, backgroundColor: colors.elevated }]}>{message}</Text>)}
          </ScrollView>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === 'android' ? 34 : 56 },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, gap: space.sm },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, alignItems: 'center' },
  variant: { fontSize: 18, fontWeight: '900' },
  seed: { fontSize: 11, marginTop: 2 },
  content: { flexGrow: 1, gap: space.sm, padding: space.md, paddingBottom: 36 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 15, fontWeight: '800' },
  wall: { fontSize: 12, fontWeight: '700' },
  notice: { color: palette.coral, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: space.xs, alignItems: 'center' },
  primary: { flex: 1, minHeight: 52, borderRadius: radius.pill, backgroundColor: palette.aqua, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  primaryLabel: { color: palette.ink, fontSize: 15, fontWeight: '900' },
  secondary: { minHeight: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md },
  secondaryLabel: { fontSize: 13, fontWeight: '800' },
  voice: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chatPanel: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, maxHeight: '56%', minHeight: 250, borderWidth: 1, borderRadius: radius.lg, padding: space.md, shadowColor: palette.black, shadowOpacity: 0.28, shadowRadius: 24 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatTitle: { fontSize: 18, fontWeight: '900' },
  messages: { flex: 1, marginVertical: space.sm },
  messageList: { gap: space.xs, justifyContent: 'flex-end' },
  message: { alignSelf: 'flex-end', maxWidth: '82%', paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.md, overflow: 'hidden' },
  composer: { flexDirection: 'row', gap: space.xs },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.aqua, alignItems: 'center', justifyContent: 'center' },
});
