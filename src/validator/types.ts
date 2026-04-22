export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function createResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

export function addError(result: ValidationResult, path: string, message: string): void {
  result.valid = false;
  result.errors.push({ path, message, severity: "error" });
}

export function addWarning(result: ValidationResult, path: string, message: string): void {
  result.warnings.push({ path, message, severity: "warning" });
}
