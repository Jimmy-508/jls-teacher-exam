export async function save<T>(key: string, value: T): Promise<void> {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function load<T>(key: string): Promise<T | null> {
  const rawValue = localStorage.getItem(key);

  if (rawValue === null) {
    return null;
  }

  return JSON.parse(rawValue) as T;
}

export async function remove(key: string): Promise<void> {
  localStorage.removeItem(key);
}

export async function clear(): Promise<void> {
  localStorage.clear();
}
