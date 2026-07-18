export const LOCAL_VIDEO_BASE_URL = "http://127.0.0.1:4173/";

export interface VideoTarget {
  baseURL: string;
  usesLocalPreview: boolean;
}

export function resolveVideoTarget(rawBaseURL: string | undefined): VideoTarget {
  const value = rawBaseURL?.trim();
  if (value === undefined || value.length === 0) {
    return {
      baseURL: LOCAL_VIDEO_BASE_URL,
      usesLocalPreview: true,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("VIDEO_BASE_URL must be an absolute http or https URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("VIDEO_BASE_URL must use http or https.");
  }
  if (parsed.search.length > 0 || parsed.hash.length > 0) {
    throw new Error("VIDEO_BASE_URL must not contain a query or fragment.");
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error("VIDEO_BASE_URL must not contain credentials.");
  }

  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return {
    baseURL: parsed.toString(),
    usesLocalPreview: false,
  };
}
