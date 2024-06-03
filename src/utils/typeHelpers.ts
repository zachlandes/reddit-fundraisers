import { TypeMapping } from '../types/index.js';

// map each key in TypeMapping to its own name as a value
export function createTypeKeys<T>(): { [P in keyof T]: P } {
    let keys: Partial<{ [P in keyof T]: P }> = {};
    (Object.keys(keys) as Array<keyof T>).forEach((key) => {
        keys[key] = key;
    });
    return keys as { [P in keyof T]: P };
}

// Automatically generated TypeKeys based on TypeMapping
export const TypeKeys = createTypeKeys<TypeMapping>();//TODO: It may make sense, especially if we have multiple form flows, to create different sets of TypeKeys for different form flows

