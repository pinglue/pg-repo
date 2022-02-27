
export function filterMatch(target: string, pattern?: string): boolean {

    if (!pattern) return true;
    return !!target.match(pattern);

}