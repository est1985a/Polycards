import { Suspense, lazy } from "react";

// Loads the /hw-test page on demand, so the app itself never downloads it or TensorFlow.js.
const HwTestPage = lazy(() => import("./HwTestPage.jsx"));

export default function HwTestRoot() {
  return (
    <Suspense fallback={null}>
      <HwTestPage />
    </Suspense>
  );
}
