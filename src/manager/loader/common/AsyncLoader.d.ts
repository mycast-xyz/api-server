import { Loader } from './Loader';

export interface AsyncLoader<Input, Result> extends Loader<Input, Result> {
    getResult(input: Input): Promise<Result | null>;
}
