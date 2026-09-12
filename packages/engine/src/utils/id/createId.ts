let counter = 0;

export function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  counter += 1;
  const random = Math.floor(Math.random() * 0x1_0000_0000).toString(16);
  return `${counter.toString(16)}-${random}`;
}
