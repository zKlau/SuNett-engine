export type GraceEffect = {
    duration: number,
    fret: number,
    is_dead: boolean,
    is_on_beat: boolean,
    transition: keyof typeof GraceEffectTransition,
    velocity: number,   
};

const GraceEffectTransition = {
    None: "None",
    Slide: "Slide",
    Bend: "Bend",
    Hammer: "Hammer",
} as const;