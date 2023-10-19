export type DollInfo = {
    id: number;
    name: string;
    icon: string;
    type: TypeInfo;
    star: number;
    description: string;
    buff: BuffInfo;
    voice: string | null;
    link: string;
    keyword: string;
};

export type BuffInfo = {
    cells: BuffPosition[];
    text: string;
};

export declare const enum TypeInfo {
    HG = 1,
    SMG,
    RF,
    AR,
    MG,
    SG,
}

export declare const enum BuffPosition {
    NONE,
    BUFF,
    ME,
}
