# Semantic model

The app uses the PolDense-17M model in ONNX FP32 format with a ByteLevel BPE tokenizer. The matching model export and tokenizer are included in `public/assets/offline_bundle/model/`, together with the prepared notes and vectors. They do not need to be downloaded separately before building. The manifest lists their paths and SHA-256 hashes. The tools that prepare them are maintained outside this repository.

The model returns an embedding after CLS token pooling and L2 normalisation. The app adds the prefix defined in `manifest.json` to each query; documents are embedded without a prefix. Document vectors are stored as INT8 with an FP16 scale for each record.

The export has a dynamic sequence length. The `max_length` limit in the manifest comes from the model's `max_position_embeddings`. Short questions are not padded to the maximum context. For a longer question, the app embeds as much as the model can hold, including special tokens. The text in the input field stays unchanged.

Complete notes must fit in the context when the bundle is prepared. Their content is not truncated. The ONNX export is checked against the source model, and the embeddings are verified, before the bundle is delivered.

The app reads the model and tokenizer paths, input and output names and the embedding dimension from the manifest. It needs no service access token and no network connection at runtime.

License: the model is provided under the Gemma Terms of Use (ai.google.dev/gemma/terms). The license and ONNX conversion notice is in the [NOTICE](../../NOTICE) file. Copies of the terms and the use policy are in [GEMMA_TERMS_OF_USE.txt](../../GEMMA_TERMS_OF_USE.txt) and [GEMMA_PROHIBITED_USE_POLICY.txt](../../GEMMA_PROHIBITED_USE_POLICY.txt).
