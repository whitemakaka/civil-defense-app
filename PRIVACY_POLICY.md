# Privacy Policy for Civil Defence

**Last updated:** October 18, 2026

## Overview

Civil Defence provides offline semantic search over prepared civil-defence and emergency-preparedness notes. The model and search content are included in the installed application.

## Search and data collection

Questions are processed locally on the device. Search queries, query embeddings and conversation history are not sent to a search service or saved to disk by the application. Conversation history is held in memory while the chat screen is active.

The application does not integrate analytics, advertising, tracking or remote crash-reporting services. It does not collect location data, contacts or personal information as part of search.

## Local storage

The application uses the following local data:

- The selected language and theme, in a local app file (`settings.json` in the app's private documents directory).
- A flag in its private files indicating that the welcome screen has been completed.
- Bundled notes, source references, document embeddings and tokenizer assets installed with the app.

Search queries, results and opened notes are not saved. Search parameters are read from the bundled manifest.

The application does not upload these files to a developer-operated service. Device storage and app data can be managed through Android settings.

## External links and contact

Search and reading bundled notes do not require an internet connection. Selecting a source, project, social or contact link opens a browser or another external application. Those services may use the internet and process information under their own privacy policies. Search queries and conversation history are not attached to these links.

If you choose to contact the maintainer by email or submit an issue, the information you send, including your email address or account details, is handled through that service. Do not include private information in public issue reports.

## Android permissions

The release build has no Internet or storage permission and asks for no permission at runtime; the Internet permission is present only in debug builds for the development server. Its manifest keeps only `ACCESS_NETWORK_STATE`, which the bundled ONNX Runtime library declares; it is granted automatically and does not allow any network access. External links such as official sources are handed to the system browser, and the app itself sends no data. The "112" button opens the phone's dialer with 112 filled in; the user places the call. Bundled content and the files above are kept in the app's own storage and need no storage permission. The app contains no runtime permission requests for location, contacts or personal files.

The app's local search behavior is separate from any services provided by Android, the app store, your browser or your email application.

## Changes to this policy

Changes to application data handling will be reflected in this document with an updated date.

## Contact and source code

- [Email the maintainer](mailto:apps.whitemakaka@gmail.com)
- [Project source code](https://github.com/whitemakaka/civil-defense-app)
