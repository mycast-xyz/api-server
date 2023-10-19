export class Logger {
    private mTag: string;
    public constructor(tag: string) {
        this.mTag = tag;
    }

    public v(messages?: any, ...params: any[]): void {
        const time = new Date().toISOString();
        if (messages) {
            if (params.length > 0) {
                // tslint:disable-next-line: no-console
                console.log(`${time} V ${this.mTag}:`, messages, params);
            } else {
                // tslint:disable-next-line: no-console
                console.log(`${time} V ${this.mTag}:`, messages);
            }
        }
    }

    public w(messages?: any, ...params: any[]): void {
        const time = new Date().toISOString();
        if (messages) {
            if (params.length > 0) {
                // tslint:disable-next-line: no-console
                console.log(`${time} W ${this.mTag}:`, messages, params);
            } else {
                // tslint:disable-next-line: no-console
                console.log(`${time} W ${this.mTag}:`, messages);
            }
        }
    }

    public e(messages?: any, ...params: any[]): void {
        const time = new Date().toISOString();
        if (messages) {
            if (params.length > 0) {
                // tslint:disable-next-line: no-console
                console.error(`${time} E ${this.mTag}:`, messages, params);
            } else {
                // tslint:disable-next-line: no-console
                console.error(`${time} E ${this.mTag}:`, messages);
            }
        }
    }
}
