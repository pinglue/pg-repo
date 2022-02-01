
export function milliTimeFormatter(timestamp?: number): string {

    const d = (timestamp) ? new Date(timestamp) : new Date();

    return `[${_pad(d.getMinutes())}:${_pad(d.getSeconds())}::${_pad(d.getMilliseconds(), 4)}]`;

}

export function timeFormatter(millisecs: number): string {

    let x = millisecs;
    const millis = x % 1000;
    x = Math.floor(x / 1000);

    if (x === 0) return `${millis} ms`;

    const arr = [];

    for (const cl of [60, 60, 24]) {

        arr.push(x % cl);
        x = Math.floor(x / cl);
        if (x === 0) break;

    }

    const flag = (x > 0) ? "+" : "";

    return `${flag}${arr.join(":")}::${millis}`;

}

export function _pad(n: number, digits = 2): string {

    const padStr = String(10 ** digits).slice(1);
    return (padStr + n).slice(-digits);

}
