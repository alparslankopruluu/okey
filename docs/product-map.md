# Product Map — Luma Okey

## Core job and loop

- **Job:** start or resume a trustworthy Okey round with friends or bots in under a minute.
- **Loop:** choose mode → seat four players → draw/arrange/discard → validate/score → rematch or return.
- **Activation:** the first legal discard passes the active-turn halo and the user understands the table without help.
- **Gotcha screen:** `/game/[roomId]`.
- **Device proof:** small and large iPhone, representative Android phone, tablet, portrait/landscape, large font, screen reader, Reduced Motion, and low-performance mode.

## Primary journey

```text
Launch/session restore
  ├─ Home → daily bonus → quick offline → table → result/rematch
  └─ Home → rooms/invite → seated online room → table + chat/voice → result/rematch
                └─ create room → Classic or 101 → casual (chip rooms disabled)
Settings/profile/store/safety remain reachable without interrupting a live turn.
```

## Screen inventory (11)

| Route | Value / primary action | Required states | Motion and feedback | Accessibility / acceptance |
|---|---|---|---|---|
| `/` | restore session or route to welcome/home | loading, offline, corrupt-save recovery | ambient fade only | launch visual matches first rendered background; no text-only spinner |
| `/welcome` | choose language/theme and continue | first run, returning, large text | two short material/theme transitions | skip allowed; controls labelled; full TR/EN |
| `/(tabs)/home` | claim bonus or start/join play | ready, offline, bonus available/claimed, service degraded | bonus reveal, floating room orbs, one CTA pulse | bonus is never color-only; quick play in thumb zone |
| `/rooms` | join public/private/invite room | loading, empty, error, reconnecting, blocked room | list insertion and seat availability | room name/stake/variant/privacy announced |
| `/create-room` | configure and create local/mock online room | casual, chip-disabled, private, validation error | segmented transitions, tactile toggles | chip-disabled reason readable; no hidden stake |
| `/offline` | choose variant/bot pace/resume | new, resumable, invalid save | rack preview and subtle bot cards | deterministic seed optional in developer menu |
| `/game/[roomId]` **gotcha** | draw, reorder, discard, chat/PTT | active/waiting, reconnect, offline, invalid move, round end, reduced motion, low perf | deal/discard arcs, rack spring, turn halo, restrained particles | tile number/color has text/shape redundancy; 44pt targets; actions announced |
| `/profile` | select original avatar/cosmetics and view stats | guest, synced, offline, empty stats | medallion tilt/selection | no account-only deletion controls while anonymous; readable stats |
| `/store` | inspect mock chip/VIP products, restore | loading, unavailable, mock success/error, restore | chip stack count and one purchase confirmation | prices are provider-owned; no gameplay-advantage claim |
| `/settings` | music/voice/motion/language/account | permission denied, no tracks, provider unavailable | immediate toggles; no ambient motion in Reduced Motion | every slider/toggle labelled; personal-music scope explained |
| `/safety` | mute/block/report and policy | empty, submitted, rate-limited, offline | confirmation sheet only | reason optional/accessible; emergency/legal wording not implied |

## Scope integrity

Every M1 item maps to home/offline/game/settings; every M2 item maps to rooms/game/store/safety. Browser play, leagues, clubs, public voice discovery, and production stake rooms remain in `docs/backlog.md`.
