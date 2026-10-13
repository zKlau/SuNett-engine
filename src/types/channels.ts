export type MidiChannel = {
  channel: number;
  effect_channel: number;
  instrument: number;
  volume: number;
  balance: number; // 64 is the center
  chorus: number;
  reverb: number;
  phaser: number;
  tremolo: number;
  bank: number;
};
