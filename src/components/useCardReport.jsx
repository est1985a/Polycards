import { useRef, useState } from 'react';
import { t } from '../i18n';

// The report sheet for one screen (the review, the drill or a word list). openReport(target)
// starts the screenshot first, then opens the sheet; reportUi is the sheet (and its thank-you
// message) to render anywhere in that screen. Nothing in the screen's own state changes, so
// closing the sheet leaves the student exactly where they were.
// The sheet (ReportHost.jsx) and the screenshot code (reportCapture.js) are only downloaded when a
// student first taps a flag; a failed download is a short pop-up message.
// target: { wordId, english, direction, deckId, source, answerMode, answer }.
export function useCardReport() {
  const [report, setReport] = useState(null); // { target, capture } while the sheet is open
  // The loaded ReportHost. It stays mounted once loaded, so its thank-you message outlives the sheet.
  const [Host, setHost] = useState(null);
  const opening = useRef(false);

  function openReport(target) {
    if (opening.current || report) return;
    opening.current = true;
    let capture = Promise.resolve(null);
    // The screenshot starts as soon as its code is here, before the sheet is shown.
    const captureModule = import('../lib/reportCapture.js').then((m) => { capture = m.captureScreen(); });
    Promise.all([import('./ReportHost.jsx'), captureModule])
      .then(([hostModule]) => {
        setHost(() => hostModule.default);
        setReport({ target, capture });
      })
      .catch((error) => {
        console.error("The report sheet could not be loaded:", error);
        alert(t("errors.reportOpenFailed"));
      })
      .finally(() => { opening.current = false; });
  }

  const reportUi = Host && <Host report={report} onClose={() => setReport(null)} />;
  return { openReport, reportUi };
}
