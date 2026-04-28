export type BeatStroke = {
  direction: keyof typeof BeatStrokeDirection;
  value: number;
  swap: boolean;
};

export const BeatStrokeDirection = {
  None: "None",
  Up: "Up",
  Down: "Down",
} as const;
