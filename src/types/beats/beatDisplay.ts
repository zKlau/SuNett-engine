import { VoiceDirection } from "../voice";

export type BeatDisplay = {
    break_beam: boolean,
    force_beam: boolean,
    beam_direction: keyof typeof VoiceDirection,
    tuplet_bracket: keyof typeof TupletBracket,
    break_secondary: number,
    break_secondary_tuplet: boolean,
    force_bracket: boolean,
};

const TupletBracket = {
    None : "None",
    Start : "Start",
    End : "End",
} as const;
