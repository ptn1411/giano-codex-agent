/**
 * Schema Normalization for LLM Compatibility
 * Based on OpenClaw tools-system-blueprint
 *
 * Handles:
 * - Gemini: Rejects many JSON Schema keywords ($schema, examples, etc.)
 * - OpenAI: Requires top-level type: "object"
 * - Claude: Uses different param names
 */

// Keywords that Gemini doesn't support
const GEMINI_UNSUPPORTED_KEYS = [
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "examples",
  "const",
  "contentEncoding",
  "contentMediaType",
];

/**
 * Clean schema for Gemini compatibility (removes unsupported keys)
 */
export function cleanSchemaForGemini(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (GEMINI_UNSUPPORTED_KEYS.includes(key)) {
      continue;
    }

    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? cleanSchemaForGemini(item as Record<string, unknown>)
            : item
        );
      } else {
        cleaned[key] = cleanSchemaForGemini(value as Record<string, unknown>);
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Flatten union schemas (anyOf/oneOf) into single object schema
 */
export function flattenUnionSchema(
  schema: Record<string, unknown>,
  variantKey: "anyOf" | "oneOf"
): Record<string, unknown> {
  const variants = schema[variantKey] as Record<string, unknown>[];
  if (!Array.isArray(variants) || variants.length === 0) {
    return schema;
  }

  // Merge all variant properties
  const mergedProperties: Record<string, unknown> = {};
  const requiredSet = new Set<string>();

  for (const variant of variants) {
    const props = variant.properties as Record<string, unknown> | undefined;
    if (props) {
      Object.assign(mergedProperties, props);
    }

    const required = variant.required as string[] | undefined;
    if (required) {
      // Only include required fields that are in ALL variants
      if (requiredSet.size === 0) {
        required.forEach((r) => requiredSet.add(r));
      } else {
        const newRequired = new Set(required);
        for (const r of requiredSet) {
          if (!newRequired.has(r)) {
            requiredSet.delete(r);
          }
        }
      }
    }
  }

  return {
    type: "object",
    properties: mergedProperties,
    required: Array.from(requiredSet),
  };
}

/**
 * Normalize tool parameters for cross-provider compatibility
 */
export function normalizeToolParameters(
  parameters: Record<string, unknown>
): Record<string, unknown> {
  if (!parameters) return { type: "object", properties: {} };

  const schema = { ...parameters };

  // If already has type + properties, just clean for Gemini
  if (
    "type" in schema &&
    "properties" in schema &&
    !Array.isArray(schema.anyOf)
  ) {
    return cleanSchemaForGemini(schema);
  }

  // Force type: "object" for OpenAI compatibility
  if (
    !("type" in schema) &&
    (typeof schema.properties === "object" || Array.isArray(schema.required))
  ) {
    return cleanSchemaForGemini({ ...schema, type: "object" });
  }

  // Handle union schemas (anyOf/oneOf)
  const variantKey = Array.isArray(schema.anyOf)
    ? "anyOf"
    : Array.isArray(schema.oneOf)
      ? "oneOf"
      : null;

  if (variantKey) {
    const merged = flattenUnionSchema(schema, variantKey);
    return cleanSchemaForGemini(merged);
  }

  // Default: ensure type object
  if (!("type" in schema)) {
    return cleanSchemaForGemini({ type: "object", properties: {}, ...schema });
  }

  return cleanSchemaForGemini(schema);
}

/**
 * Convert tool definition to LLM-compatible format
 */
export function formatToolForLLM(tool: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}): {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: normalizeToolParameters(tool.parameters),
    },
  };
}
