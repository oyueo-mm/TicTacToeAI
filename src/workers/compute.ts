import { search } from "../ai/search";
import { episode } from "../training/qlearning";
self.onmessage = (e) => {
  const { id, type, ...data } = e.data;
  try {
    if (type === "search")
      self.postMessage({
        id,
        value: search(
          data.game,
          data.algorithm,
          data.budget,
          data.q,
          undefined,
          data.depth,
          (progress) => self.postMessage({ id, progress }),
        ),
      });
    else {
      const samples = [];
      const start = performance.now();
      for (let i = 0; i < data.count; i++)
        samples.push(episode(data.q, data.settings, data.index + i));
      self.postMessage({
        id,
        value: { q: data.q, samples, ms: performance.now() - start },
      });
    }
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
