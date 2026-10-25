import { Suspense, lazy } from "react";

// Loads the hidden pages on demand, so the app itself never downloads them or TensorFlow.js.
// page: "test" (/hw-test) or "letters" (/hw-letters).
const HwTestPage = lazy(() => import("./HwTestPage.jsx"));
const HwLettersPage = lazy(() => import("./HwLettersPage.jsx"));

export default function HwTestRoot({ page = "test" }) {
  return (
    <Suspense fallback={null}>
      {page === "letters" ? <HwLettersPage /> : <HwTestPage />}
    </Suspense>
  );
}
