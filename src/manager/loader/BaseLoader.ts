import { Loader, LoaderCallback } from './common/Loader';

export abstract class BaseLoader<Input, Result>
    implements Loader<Input, Result> {
    protected mInput: Input | null = null;
    protected mCallback: LoaderCallback<Result> = () => {
        return;
    }

    public load(input: Input, callback: LoaderCallback<Result>): void {
        this.mInput = input;
        this.mCallback = callback;
        this.loadData();
    }

    protected abstract loadData(): void;
}
