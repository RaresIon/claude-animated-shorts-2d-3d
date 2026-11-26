import React from "react";
import { Composition } from "remotion";
import { Stage } from "./stage/Stage";
import { film as ratTails } from "./videos/rat-tails/film";
import { film as vikings } from "./videos/vikings/film";
import { film as carrots } from "./videos/carrots/film";
import { film as kitTest } from "./videos/kit-test/film";

// One <Composition> per short. Copy src/videos/rat-tails/ to start a new one.
export const Root: React.FC = () => (
  <>
    <Composition id="RatTails" component={() => <Stage film={ratTails} />} durationInFrames={ratTails.total} fps={30} width={1080} height={1920} />
    <Composition id="Vikings" component={() => <Stage film={vikings} />} durationInFrames={vikings.total} fps={30} width={1080} height={1920} />
    <Composition id="Carrots" component={() => <Stage film={carrots} />} durationInFrames={carrots.total} fps={30} width={1080} height={1920} />
    {/* the kit regression card (scripts/kit_test.py), not a short */}
    <Composition id="KitTest" component={() => <Stage film={kitTest} />} durationInFrames={kitTest.total} fps={30} width={1080} height={1920} />
  </>
);
