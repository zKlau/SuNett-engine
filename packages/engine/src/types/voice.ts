import type { Beat } from "./beats/beat";

export type Voice = {
  measure_index: number;
  beats: Beat[];
  direction: keyof typeof VoiceDirection;
};

export const VoiceDirection = {
  None: "None",
  Up: "Up",
  Down: "Down",
} as const;
