import { getAddress, type Address } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Normalize any address-like string into a viem-checksummed `Address`.
 *
 * viem rejects addresses whose EIP-55 checksum casing doesn't match. Hand-typed
 * constants and env vars are a common source of that error, so we lowercase the
 * input first and let viem recompute the checksum — meaning any casing is accepted.
 *
 * @throws if the value isn't a valid 20-byte hex address (wrong length / non-hex).
 */
export function toAddress(value: string, label = "address"): Address {
  const trimmed = value.trim();
  try {
    return getAddress(trimmed.toLowerCase());
  } catch {
    throw new Error(
      `Invalid ${label}: "${value}". Must be a 20-byte hex value (0x + 40 hex chars).`,
    );
  }
}

/**
 * Normalize an optional env-provided address. Returns the zero address when the
 * value is missing/empty (callers already treat zero address as "not deployed").
 */
export function toAddressOrZero(value: string | undefined, label = "address"): Address {
  if (!value || value.trim() === "") return ZERO_ADDRESS;
  return toAddress(value, label);
}
