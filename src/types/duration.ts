
export type Duration = {
    value: number; 
    dotted: boolean;
    double_dotted: boolean;
    min_time: number;
    tuplet_enters: number;
    tuplet_times: number; 
}

export type TimeSignature = {
    numerator: number;
    denominator: Duration;
    beams: number[];
}

export type KeySignature = {
    key: number;      
    is_minor: boolean;
}