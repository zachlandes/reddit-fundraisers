export class PropertyManager<T> {
    protected properties: Map<keyof T, T[keyof T] | null>;

    constructor(initialProperties?: Partial<T>) {
        this.properties = new Map<keyof T, T[keyof T] | null>();
        if (initialProperties) {
            for (const [key, value] of Object.entries(initialProperties)) {
                this.properties.set(key as keyof T, value as T[keyof T]);
            }
        }
    }

    setProperty<K extends keyof T>(key: K, value: T[K]): void {
        this.properties.set(key, value);
    }

    getProperty<K extends keyof T>(key: K): T[K] | null {
        return this.properties.get(key) as T[K] | null;
    }

    serialize(): Record<string, any> {
        const result: Record<string, any> = {};
        this.properties.forEach((value, key) => {
            result[key as string] = value ?? null;
        });
        return result;
    }

    deserialize(data: Record<string, any>): void {
        for (const [key, value] of Object.entries(data)) {
            this.properties.set(key as keyof T, value);
        }
    }

    getAllProperties(): T {
        const allProps = {} as T;
        this.properties.forEach((value, key) => {
            allProps[key] = value as T[keyof T];
        });
        return allProps;
    }
}