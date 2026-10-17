# Provider NFC writing

The **Tulis NFC** button appears beside QR downloads on new-card results and provider inventory. It writes one NDEF URL record containing the card destination; never the activation PIN. The inventory button follows nfc_enabled. It does not change activation state, inventory status or NFC identifiers in the database.

Use Chrome on an Android phone with NFC enabled, on the HTTPS YukReview domain. Click the button, grant NFC permission, and hold the writable NDEF tag against the phone until success. Existing NDEF contents are replaced. Tags are never made permanently read-only. Tap the finished card outside the writer to verify its destination. Test a dedicated physical tag before production use.

Unsupported browsers show the exact URL plus **Salin URL NFC** for use with a native NFC writer. NFC-capable iPhones and desktop browsers may read tags but this browser writing workflow requires Web NFC support. No automatic device access occurs when the page opens. Pending writes can be cancelled, time out after 30 seconds and are aborted when the component unmounts.

Validation: production build; language checks; `npm run test:nfc` uses mocked NDEFReader to cover exact URL records, confirmed success, write failure, unsupported fallback, cancellation/unmount, duplicate/disabled guards and invalid URLs. Physical NFC hardware has not been tested in this session.

Browser reference: https://developer.chrome.com/docs/capabilities/nfc
