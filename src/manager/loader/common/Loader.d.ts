export interface Loader<Input, Result> {
    load(input: Input, callback: LoaderCallback<Result>): void;
}

export type LoaderCallback<Result> = (data: Result | null) => void;
