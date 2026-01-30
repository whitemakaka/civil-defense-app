/**
 * Bundle Validation
 * Ensures offline bundle is compatible with runtime embedder
 */

import type { Manifest, BundleValidationResult, Embedder } from '../types';
import { EMBEDDING_MODEL_ID, EMBEDDING_DIM, BUNDLE_SCHEMA_VERSION } from '../config';

/**
 * Validates bundle manifest against expected model configuration
 * CRITICAL: This prevents using incompatible embeddings that would give wrong results
 */
export function validateBundleManifest(
  manifest: Manifest,
  embedder?: Embedder
): BundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check model ID match
  const manifestModelId = (manifest.model_id ?? manifest.model) as string | undefined;
  if (manifestModelId !== EMBEDDING_MODEL_ID) {
    errors.push(
      `Model mismatch: Bundle uses "${manifestModelId ?? 'unknown'}" but app expects "${EMBEDDING_MODEL_ID}". ` +
      `Vector search will NOT work correctly with incompatible models.`
    );
  }

  // 2. Check dimension match
  const expectedDim = embedder ? embedder.getOutputDim() : EMBEDDING_DIM;
  if (manifest.dim !== expectedDim) {
    errors.push(
      `Dimension mismatch: Bundle has dim=${manifest.dim} but embedder outputs dim=${expectedDim}. ` +
      `This will cause crashes or incorrect results.`
    );
  }

  // 3. Check schema version
  if (manifest.schema_version !== BUNDLE_SCHEMA_VERSION) {
    warnings.push(
      `Schema version mismatch: Bundle is ${manifest.schema_version}, app expects ${BUNDLE_SCHEMA_VERSION}. ` +
      `May have compatibility issues.`
    );
  }

  // 4. Check count sanity
  if (manifest.count <= 0) {
    errors.push(`Invalid record count: ${manifest.count}`);
  }

  // 5. Check required files
  if (!manifest.records_file || !manifest.embeddings_file) {
    errors.push('Missing required file references in manifest');
  }

  // v4a: if embeddings are int8-per-scale, scale file must be present
  if (manifest.embeddings_quant === 'int8_per_vector_scale' && !manifest.embeddings_scale_file) {
    errors.push('Missing embeddings_scale_file for int8_per_vector_scale embeddings');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
  };
}

/**
 * Validates loaded bundle data against manifest
 */
export function validateBundleData(
  manifest: Manifest,
  actualRecordCount: number,
  actualEmbeddingDim: number
): BundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check record count matches manifest
  if (actualRecordCount !== manifest.count) {
    errors.push(
      `Record count mismatch: Manifest says ${manifest.count} but loaded ${actualRecordCount} records`
    );
  }

  // Check embedding dimension matches manifest
  if (actualEmbeddingDim !== manifest.dim) {
    errors.push(
      `Embedding dimension mismatch: Manifest says dim=${manifest.dim} but loaded dim=${actualEmbeddingDim}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
  };
}

/**
 * Format validation result for display to user
 */
export function formatValidationError(result: BundleValidationResult, language: 'pl' | 'en'): string {
  if (result.valid) return '';

  const header = language === 'pl' 
    ? '⚠️ Niezgodny bundle danych'
    : '⚠️ Incompatible data bundle';

  const errorList = result.errors.join('\n• ');
  const warningList = result.warnings.length > 0 ? '\n\n' + result.warnings.join('\n• ') : '';

  return `${header}\n\n• ${errorList}${warningList}`;
}

/**
 * Get user-friendly fallback message when validation fails
 */
export function getValidationFallbackMessage(language: 'pl' | 'en'): string {
  return language === 'pl'
    ? 'Wyszukiwanie wektorowe wyłączone. Dostępne tylko wyszukiwanie po słowach kluczowych.'
    : 'Vector search disabled. Only keyword search available.';
}

