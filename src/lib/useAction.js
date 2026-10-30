// A React hook shared by the teacher screens (ClassPage, AssignmentPage).
import { useState } from 'react';

// Runs an action that returns a promise, with a busy flag and an error message.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function run(fn) {
    setBusy(true); setError(null);
    try {
      await fn();
      setBusy(false);
      return true;
    } catch (e) {
      setError(e.message);
      setBusy(false);
      return false;
    }
  }
  return { busy, error, run, clearError: () => setError(null) };
}
