# Content and Data Policy

**Last updated:** October 18, 2026

## Scope

This policy covers the guidance and source references supplied in the offline search bundle. Handling of user queries is described in the [Privacy Policy](PRIVACY_POLICY.md).

The public repository contains the application. Content preparation, translation and embedding generation take place separately; prepared notes, records, vectors and the manifest are included in `public/assets/offline_bundle/`. The matching model and tokenizer are included in its `model/` directory. The complete bundle is copied into Android assets during the build.

## Sources

Content should be grounded in identifiable material from public authorities, emergency services, public-health institutions, recognized professional organizations or humanitarian organizations.

Notes may draw on civil-defence handbooks and specialist safety guidance. They are prepared notes that may summarize, organize or translate source material; they are not necessarily verbatim quotations.

## Content requirements

- Preserve the meaning, conditions and important warnings in the source material.
- Attribute each note to its sources, including document page references or source URLs as applicable.
- Keep source identifiers and references consistent between the Polish and English content.
- Check translations and factual claims against the cited material before distributing a bundle.
- Exclude unsupported claims, fabricated references and personally identifiable information about private individuals.
- Respect the licenses and reuse conditions of the original material. Public availability alone does not grant redistribution rights.

## Search behavior

Semantic search compares a question with prepared passages and complete notes. Selecting a result displays the stored note with its source references. The application does not generate new guidance while answering a query.

Results below the relevance threshold set in the bundle manifest are hidden, and release builds do not display scores. Relevance describes how closely a result matches the question; it is not a guarantee that the guidance applies to every situation or remains current. Bundled content reflects the material included when that bundle was prepared. Source references allow readers and contributors to check the original context.

## Contributions and corrections

For content corrections, identify the affected note, language and source, and describe the discrepancy. Avoid including private information in public reports.

Modified bundles must remain compatible with the documented [bundle format](docs/search-bundle/README.md), preserve attribution and use matching model and embedding assets. Changes to supported languages or models may also require application changes.
