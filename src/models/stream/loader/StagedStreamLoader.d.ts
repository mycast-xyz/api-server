import { StagedStream } from '../common/StagedStream';

export interface StagedStreamLoader {
    load(keyId: string): Promise<StagedStream | null>;
}
