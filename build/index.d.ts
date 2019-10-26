export interface Hit {
    startIdx: number;
    endIdx: number;
    osis: string;
    text: string;
}
export declare const parseText: (text: string) => Hit[];
