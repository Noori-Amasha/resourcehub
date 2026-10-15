export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Unable to connect to the server.", 0);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as {
      message?: string;
    } | null;

    throw new ApiError(
      error?.message ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  return data as T;
}
