import { Logger } from './Logger';

export class TaskUtils {
    private static ONE_HOUR = 60 * 60 * 1000;
    private static ONE_DAY = 24 * 60 * 60 * 1000;
    private static KST = 9 * 60 * 60 * 1000;

    private static sLogger: Logger = new Logger('TaskUtils');

    public static setDailyScheduler(hour: number, schedule: Schedule) {
        const date = new Date();
        const now = date.getTime();
        const today = now - ((now + this.KST) % this.ONE_DAY);
        let scheduleTime = today + hour * this.ONE_HOUR;
        if (now >= scheduleTime) { scheduleTime += this.ONE_DAY; }

        const term = scheduleTime - now;
        setTimeout(() => {
            schedule.task();
            this.setDailyScheduler(hour, schedule);
        }, term);
        const timestamp = new Date(scheduleTime);
        this.sLogger.v(`Scheduler: '${schedule.name}' set at ${timestamp}`);
    }
}

export type Schedule = {
    name: string;
    task: () => void;
};
