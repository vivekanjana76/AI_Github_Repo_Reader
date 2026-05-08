export async function postJson<TResponse>(
  url: string,
  body: unknown,
  fallbackMessage: string,
  signal?: AbortSignal
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal
  });

  const payload = (await response.json()) as TResponse | { error?: string };

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : fallbackMessage;

    throw new Error(message);
  }

  return payload as TResponse;
}

