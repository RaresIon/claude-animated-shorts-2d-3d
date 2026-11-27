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

## Profile picture colours

Three colours plus the ink line; every other tone is a tint of these.

| Role | Colour | Share |
|---|---|---|
| background | violet `#5b2be0` | about 60 % |
| the poodle | cream `#fff6e5` | about 30 % |
| pencil and collar | yellow `#ffc928` | about 10 % |

Violet and yellow are opposites on the colour wheel, so the pencil is the loudest thing in the picture. Measured
contrast: cream on violet 6.8 : 1, yellow on violet 4.8 : 1, violet on a white page 7.3 : 1. Of four palettes tried
(`PALETTES` in the film file; render `ChannelAvatarOptions` frames 0-3 to compare) it was the only one where both the
poodle and the pencil stayed clear at 32 px on light and dark pages.

## Bio (channel description)

> Stories doodled. 🐩✏️
>
> The stories nobody told you: wars lost to birds, laws that backfired, inventions that went wrong, animals that
> outsmarted everyone. History, science, nature, whatever is strange and real. Each one drawn and told in under a
> minute.
>
> Every fact is checked against real sources. The poodle only does the drawing.
>
> New shorts every week. Subscribe so you don't miss the next one.

Short version (handle line, Shorts, TikTok, Instagram): `Stories doodled. Weird, true, and under a minute. 🐩✏️`

## Publishing (owner's request, 2026-11-27)

The owner asked for the finished shorts to go out on the DoodlePoodle channel, one a day. The channel exists in the
control plane (`channels` id 4, one slot a day at 20:45 New York time, engine list `["animated2d3d"]`, YouTube set to
post automatically). A video is queued from a checkout of `raresion/sitefarmdocs`:

    python -m shorts.publish <name>.mp4 --status approved

with a `<name>.json` beside it: `title`, `caption`, `hashtags`, `posts.youtube` (title, text, hashtags),
`spec.engine = "animated2d3d"`, `result` and `gates`. About two minutes later the control plane gives it the next
free daily slot. Publish only what the owner has asked for; a new short still needs the owner's yes first.
