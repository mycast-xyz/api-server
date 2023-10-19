import { Memo } from './Memo';
import { MemoDao } from './MemoDao';

export class MemoDaoAdapter implements Memo {
    private mMemoDao: MemoDao;

    public constructor(memoDao: MemoDao) {
        this.mMemoDao = memoDao;
    }

    public getIdx(): number {
        return this.mMemoDao.idx;
    }

    public getUserNickname(): string {
        return this.mMemoDao.userNickname;
    }

    public getUserIcon(): string {
        return this.mMemoDao.userIcon;
    }

    public getContent(): string {
        return this.mMemoDao.content;
    }

    public getRegDate(): Date {
        return this.mMemoDao.regDate;
    }
}
