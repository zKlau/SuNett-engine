export type MixTableChange = {
  instrument?: MixTableItem;
  rse: RseInstrument;
  volume?: number;
  balance?: number;
  chorus?: number;
  reverb?: number;
  phaser?: number;
  tremolo?: number;
  tempo_name: string;
  tempo?: number;
  hide_tempo: boolean;
  wah?: WahEffect;
  use_rse: boolean;
};

type MixTableItem = {
  value: number;
  duration: number;
  all_tracks: boolean;
};

type RseInstrument = {
  instrument: number;
  unknown: number;
  sound_bank: number;
  effect_number: number;
  effect_category: string;
  effect: string;
};

type WahEffect = {
  value: number;
  display: boolean;
};
