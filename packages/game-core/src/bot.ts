import { applyCommand } from './game';
import { createSeededRandom } from './random';
import { findOpeningMelds101, findTableExtension, findWinningDiscard } from './solver';
import { effectiveValue, isJoker } from './tiles';
import { type GameCommand, type GameState, type Tile } from './types';

function tileUtility(tile: Tile, rack: readonly Tile[], state: GameState): number {
  if (isJoker(tile, state.indicator)) return 100;
  const value = effectiveValue(tile, state.indicator);
  if (value === 'joker') return 100;
  return rack.reduce((score, other) => {
    if (other.id === tile.id) return score;
    const otherValue = effectiveValue(other, state.indicator);
    if (otherValue === 'joker') return score + 2;
    if (otherValue.number === value.number && otherValue.color !== value.color) return score + 4;
    if (otherValue.color === value.color && Math.abs(otherValue.number - value.number) <= 2) return score + 3;
    return score;
  }, 0);
}

export function chooseBotDiscard(state: GameState, playerId: string, decisionIndex: number): string {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined || player.rack.length === 0) throw new Error('Bot player has no rack');
  const scored = player.rack.map((tile) => ({ tile, utility: tileUtility(tile, player.rack, state) }));
  const minimum = Math.min(...scored.map((item) => item.utility));
  const candidates = scored
    .filter((item) => item.utility === minimum)
    .sort((left, right) => left.tile.id.localeCompare(right.tile.id, 'en'));
  const random = createSeededRandom(state.seed ^ state.sequence ^ decisionIndex);
  const selected = candidates[random.int(candidates.length)];
  if (selected === undefined) throw new Error('Bot could not select a discard');
  return selected.tile.id;
}

export interface BotRoundSimulation {
  readonly state: GameState;
  readonly commands: readonly GameCommand[];
}

export function playDeterministicBotTurn(initial: GameState, decisionIndex: number, commandPrefix = 'bot'): BotRoundSimulation {
  let state = initial;
  const commands: GameCommand[] = [];
  const player = state.players[state.turnIndex];
  if (player === undefined) throw new Error('Bot turn has no active player');

  const submit = (command: GameCommand): void => {
    commands.push(command);
    state = applyCommand(state, command).state;
  };

  if (state.phase === 'awaiting_draw') {
    submit({
      type: 'draw_wall',
      commandId: `${commandPrefix}-${state.sequence}-draw`,
      playerId: player.id,
      expectedSequence: state.sequence,
    });
  }

  const winningMove = (): ReturnType<typeof findWinningDiscard> => {
    const active = state.players[state.turnIndex];
    if (active === undefined) return undefined;
    if (state.variant === '101' && !active.opened && !state.rules.allowDirectFinishBelowThreshold101) return undefined;
    return findWinningDiscard(active.rack, state.indicator, {
      allowHighAceWrap: state.variant === 'classic' && state.rules.classicHighAceRun,
      allowSevenPairs: state.variant === 'classic' && state.rules.allowSevenPairsClassic,
      pairsOnly: state.variant === '101' && active.openingMode === 'pairs',
    });
  };

  let finish = winningMove();
  if (finish !== undefined) {
    submit({
      type: 'finish',
      commandId: `${commandPrefix}-${state.sequence}-finish`,
      playerId: player.id,
      expectedSequence: state.sequence,
      discardTileId: finish.discardTileId,
      melds: finish.melds,
    });
    return { state, commands };
  }

  let active = state.players[state.turnIndex];
  if (state.variant === '101' && active !== undefined && !active.opened) {
    const opening = findOpeningMelds101(
      active.rack,
      state.indicator,
      state.rules.openingPoints101,
      state.rules.pairsRequiredToOpen101,
      state.rules.allowPairsOpening101,
    );
    if (opening !== undefined) {
      submit({
        type: 'open_melds',
        commandId: `${commandPrefix}-${state.sequence}-open`,
        playerId: player.id,
        expectedSequence: state.sequence,
        melds: opening.melds,
      });
    }
  }

  if (state.variant === '101') {
    let extension = findTableExtension(state, player.id);
    while (extension !== undefined) {
      const alreadyAdded = state.turnContext.layoffCountByMeldId[extension.tableMeldId] ?? 0;
      if (alreadyAdded + extension.tileIds.length > 2) break;
      submit({
        type: 'extend_meld',
        commandId: `${commandPrefix}-${state.sequence}-extend`,
        playerId: player.id,
        expectedSequence: state.sequence,
        tableMeldId: extension.tableMeldId,
        tileIds: extension.tileIds,
      });
      extension = findTableExtension(state, player.id);
    }
  }

  finish = winningMove();
  if (finish !== undefined) {
    submit({
      type: 'finish',
      commandId: `${commandPrefix}-${state.sequence}-finish`,
      playerId: player.id,
      expectedSequence: state.sequence,
      discardTileId: finish.discardTileId,
      melds: finish.melds,
    });
    return { state, commands };
  }

  active = state.players[state.turnIndex];
  if (active === undefined) throw new Error('Bot player disappeared during turn');
  const tileId = chooseBotDiscard(state, active.id, decisionIndex);
  submit({
    type: 'discard',
    tileId,
    commandId: `${commandPrefix}-${state.sequence}-discard`,
    playerId: active.id,
    expectedSequence: state.sequence,
  });
  return { state, commands };
}

export function playDeterministicBotRound(initial: GameState, maxCommands = 512): BotRoundSimulation {
  let state = initial;
  const commands: GameCommand[] = [];

  while (state.phase !== 'round_finished') {
    if (commands.length >= maxCommands) throw new Error(`Bot round exceeded ${maxCommands} commands`);
    const player = state.players[state.turnIndex];
    if (player === undefined) throw new Error('Bot round has no active player');
    const turn = playDeterministicBotTurn(state, state.sequence, 'simulation');
    if (turn.commands.length === 0) throw new Error(`Bot ${player.id} produced no command`);
    commands.push(...turn.commands);
    state = turn.state;
  }

  return { state, commands };
}
