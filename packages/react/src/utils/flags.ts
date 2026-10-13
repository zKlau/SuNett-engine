/** A toggleable option: `true` for defaults, an options object, or off. */
export type Flag<T> = boolean | T | undefined;

export const resolveFlag = <T extends object>(
  value: Flag<T>,
): T | undefined => {
  if (value === undefined || value === false) {
    return undefined;
  }
  if (value === true) {
    return {} as T;
  }
  return value;
};
