# Channel art: Doodle Poodle

Drawn with the stage kit (`studio/src/videos/channel/film.ts`) so it matches the shorts. Nothing here is uploaded
by the repo; the owner sets it in YouTube Studio.

| File | Use | Size |
|---|---|---|
| `avatar-1080.jpg` | profile picture (YouTube crops it to a circle) | 1080 x 1080 |
| `banner-2560x1440.jpg` | banner; the name and the poodle sit inside the middle 1546 x 423 that phones show | 2560 x 1440 |

Re-render from `studio/`:

    node scripts/stills.mjs ChannelAvatar out/channel/avatar 0 1
    node scripts/stills.mjs ChannelBanner out/channel/banner 0 1

## Bio (channel description)

> Weird history, doodled. 🐩✏️
>
> The true stories your teacher skipped: wars lost to birds, laws that backfired, explorers who found a continent
> and went home for dinner. Each one drawn and told in under a minute.
>
> Every fact is checked against real sources. The poodle only does the drawing.
>
> New shorts every week. Subscribe so you don't miss the next bad idea in history.

Short version (handle line, Shorts, TikTok, Instagram): `Weird history, doodled. True stories in under a minute. 🐩✏️`
