export function compute<T>(
  data: Record<string, unknown>,
  signal?: AbortSignal,
  onProgress?: (iterations: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./compute.ts", import.meta.url), {
      type: "module",
    });
    const abort = () => {
      worker.terminate();
      reject(new DOMException("취소됨", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    worker.onmessage = (e) => {
      if (typeof e.data.progress === "number") {
        onProgress?.(e.data.progress);
        return;
      }
      worker.terminate();
      signal?.removeEventListener("abort", abort);
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.value);
    };
    worker.onerror = (e) => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
      reject(new Error(e.message));
    };
    worker.postMessage({ ...data, id: 1 });
  });
}
