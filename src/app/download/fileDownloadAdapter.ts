export interface FileDownloadInput {
  fileName: string;
  mediaType: string;
  content: string;
}

export interface FileDownloadAdapter {
  downloadText(input: FileDownloadInput): void;
}

export class FileDownloadError extends Error {
  readonly code = "FILE_DOWNLOAD_FAILED";

  constructor(options: { cause?: unknown } = {}) {
    super("FILE_DOWNLOAD_FAILED", options);
    this.name = "FileDownloadError";
  }
}

interface DownloadAnchor {
  href: string;
  download: string;
  click(): void;
  remove(): void;
}

export interface BrowserFileDownloadEnvironment {
  createBlob(content: string, mediaType: string): Blob;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createAnchor(): DownloadAnchor;
  appendAnchor(anchor: DownloadAnchor): void;
}

function browserEnvironment(): BrowserFileDownloadEnvironment {
  return {
    createBlob: (content, mediaType) =>
      new Blob([content], { type: mediaType }),
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement("a"),
    appendAnchor: (anchor) => document.body.append(anchor as HTMLAnchorElement),
  };
}

export class BrowserFileDownloadAdapter implements FileDownloadAdapter {
  readonly #environment: BrowserFileDownloadEnvironment;

  constructor(environment: BrowserFileDownloadEnvironment = browserEnvironment()) {
    this.#environment = environment;
  }

  downloadText(input: FileDownloadInput): void {
    let objectUrl: string | null = null;
    try {
      const blob = this.#environment.createBlob(input.content, input.mediaType);
      objectUrl = this.#environment.createObjectUrl(blob);
      const anchor = this.#environment.createAnchor();
      anchor.href = objectUrl;
      anchor.download = input.fileName;
      this.#environment.appendAnchor(anchor);
      anchor.click();
      anchor.remove();
    } catch (cause) {
      throw new FileDownloadError({ cause });
    } finally {
      if (objectUrl !== null) this.#environment.revokeObjectUrl(objectUrl);
    }
  }
}

export function createKnowledgeExportFileName(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `creative-knowledge-${year}${month}${day}.json`;
}

