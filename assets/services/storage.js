export function createStorageService(key) {
  return {
    load() {
      try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    },
    save(project) {
      try { localStorage.setItem(key, JSON.stringify(project)); } catch {}
    },
    clear() {
      try { localStorage.removeItem(key); } catch {}
    }
  };
}
