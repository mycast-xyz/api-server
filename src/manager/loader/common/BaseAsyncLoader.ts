import { AsyncLoader } from './AsyncLoader';
import { Loader, LoaderCallback } from './Loader';

export abstract class BaseAsyncLoader<Input, Result>
    implements AsyncLoader<Input, Result>, Loader<Input, Result> {
    public load(input: Input, callback: LoaderCallback<Result>): void {
        this.getResult(input)
            .then((result) => {
                callback(result);
            })
            .catch(() => {
                callback(null);
            });
    }

    public abstract getResult(input: Input): Promise<Result | null>;
}
