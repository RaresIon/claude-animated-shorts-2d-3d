import React from "react";
import { Composition } from "remotion";
import { Stage } from "./stage/Stage";
import { film as ratTails } from "./videos/rat-tails/film";

// One <Composition> per short. Copy src/videos/rat-tails/ to start a new one.
export const Root: React.FC = () => (
  <>
    <Composition id="RatTails" component={() => <Stage film={ratTails} />} durationInFrames={ratTails.total} fps={30} width={1080} height={1920} />
  </>
);
