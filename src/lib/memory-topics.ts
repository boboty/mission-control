import os from 'os';
import path from 'path';

export function getMemoryTopicsDir() {
  if (process.env.MEMORY_TOPICS_DIR) {
    return path.resolve(process.env.MEMORY_TOPICS_DIR);
  }

  return path.join(os.homedir(), '.openclaw', 'workspace', 'memory', 'topics');
}
