import type { ComponentDefinition, DocumentMeta, FormyConfig, FormyDocument, Violation } from './sdk';

export interface LoadResult {
  document: FormyDocument;
  meta: DocumentMeta;
}

/** A non-2xx response from the Formy API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly violations: Violation[] = [],
  ) {
    super(message);
  }
}

/** Talks to ApiController. One instance per editor. */
export class FormyApi {
  private csrfToken: string | null = null;

  constructor(private readonly endpoints: FormyConfig['endpoints']) {}

  async components(): Promise<ComponentDefinition[]> {
    const body = await this.request<{ components: ComponentDefinition[] }>(this.endpoints.components);
    return body.components;
  }

  load(): Promise<LoadResult> {
    return this.request<LoadResult>(this.endpoints.load);
  }

  async save(document: FormyDocument, revision: string): Promise<LoadResult> {
    return this.request<LoadResult>(this.endpoints.save, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': await this.token(),
      },
      body: JSON.stringify({ document, revision }),
    });
  }

  private async token(): Promise<string> {
    if (this.csrfToken === null) {
      const response = await fetch(this.endpoints.csrfToken, { credentials: 'same-origin' });
      if (!response.ok) {
        throw new ApiError(response.status, 'csrf', 'Could not get a security token. Reload the page.');
      }
      this.csrfToken = await response.text();
    }
    return this.csrfToken;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        credentials: 'same-origin',
        ...init,
        headers: { Accept: 'application/json', ...init.headers },
      });
    }
    catch {
      throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        response.status,
        body.error ?? 'http',
        body.message ?? (response.status === 422 ? 'Some fields need attention.' : `The server answered ${response.status}.`),
        body.violations ?? [],
      );
    }
    return body as T;
  }
}
