// Characters that avoid ambiguity (no 0/O, 1/I/l)
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const SITE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.the2048league.com";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== 6) return false;
  return [...code].every((ch) => ROOM_CODE_CHARS.includes(ch));
}

export function buildInviteUrl(code: string): string {
  return `${SITE_URL}/play/${code}`;
}
