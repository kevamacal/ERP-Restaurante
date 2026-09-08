const TERMINAL_TOKEN_KEY = "app_terminal_device_token";
const TERMINAL_LOCAL_ID_KEY = "app_terminal_local_id";

export interface TerminalPairingInfo {
  token: string;
  localId: string;
}

export function getTerminalPairing(): TerminalPairingInfo | null {
  const token = localStorage.getItem(TERMINAL_TOKEN_KEY);
  const localId = localStorage.getItem(TERMINAL_LOCAL_ID_KEY);
  if (token && localId) {
    return { token, localId };
  }
  return null;
}

export function setTerminalPairing(token: string, localId: string): void {
  localStorage.setItem(TERMINAL_TOKEN_KEY, token);
  localStorage.setItem(TERMINAL_LOCAL_ID_KEY, localId);
}

export function clearTerminalPairing(): void {
  localStorage.removeItem(TERMINAL_TOKEN_KEY);
  localStorage.removeItem(TERMINAL_LOCAL_ID_KEY);
}

export interface QRPairingPayload {
  version: string;
  empresaId: string;
  localId: string;
  localNombre: string;
  timestamp: number;
}

export function generatePairingQRPayload(
  empresaId: string,
  localId: string,
  localNombre: string
): string {
  const payload: QRPairingPayload = {
    version: "1.0",
    empresaId,
    localId,
    localNombre,
    timestamp: Date.now(),
  };
  return JSON.stringify(payload);
}

export function parsePairingQRPayload(rawJson: string): QRPairingPayload | null {
  try {
    const data = JSON.parse(rawJson);
    if (data && data.empresaId && data.localId) {
      return data as QRPairingPayload;
    }
  } catch {
    // Ignore parse errors for non-matching QRs
  }
  return null;
}

export function isIpMatch(clientIp: string, expectedIp?: string): boolean {
  if (!expectedIp || expectedIp.trim() === "" || expectedIp === "0.0.0.0") {
    return true; // No IP restriction configured
  }
  return clientIp.trim() === expectedIp.trim();
}
