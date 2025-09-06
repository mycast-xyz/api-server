import { AsyncLoader } from './AsyncLoader';
import { Loader, LoaderCallback } from './Loader';

export abstract class BaseAsyncLoader<Input, Result>
    implements AsyncLoader<Input, Result>, Loader<Input, Result>
{
    load(input: Input, callback: LoaderCallback<Result>): void {
        this.getResult(input)
            .then((result) => {
                callback(result);
            })
            .catch(() => {
                callback(null);
            });
    }

    abstract getResult(input: Input): Promise<Result | null>;
}
