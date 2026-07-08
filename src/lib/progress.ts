// =========================================================================
// progress — حفظ تقدم المتعلّم في localStorage (BLUEPRINT §5.3)
// لا حسابات ولا خادم — متوافق GDPR بطبيعته. يعمل فقط في المتصفح.
// =========================================================================

const KEY = "ccl:progress:v1";

export type ModuleStatus = "not-started" | "in-progress" | "completed";

export interface Progress {
  /** module id -> status */
  modules: Record<string, ModuleStatus>;
  updatedAt: string;
}

const empty = (): Progress => ({ modules: {}, updatedAt: new Date().toISOString() });

export function loadProgress(): Progress {
  if (typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : empty();
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress): void {
  if (typeof localStorage === "undefined") return;
  p.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function setModuleStatus(moduleId: string, status: ModuleStatus): Progress {
  const p = loadProgress();
  p.modules[moduleId] = status;
  saveProgress(p);
  return p;
}

export function getModuleStatus(moduleId: string): ModuleStatus {
  return loadProgress().modules[moduleId] ?? "not-started";
}
