import { useEffect, useState } from "react";

export async function request(path, { data, signal } = {}) {
  const options = { credentials: "same-origin", signal };
  if (data !== undefined) {
    const cookie = document.cookie.split("; ").find((entry) => entry.startsWith("csrftoken="));
    if (!cookie) throw new Error("Refresh the page before submitting the form.");
    options.method = "POST";
    options.headers = {
      "Content-Type": "application/json",
      "X-CSRFToken": decodeURIComponent(cookie.slice("csrftoken=".length)),
    };
    options.body = JSON.stringify(data);
  }

  const response = await fetch("/djangoapp" + path, options);
  const isJson = (response.headers?.get("content-type") ?? "application/json")
    .includes("application/json");
  if (!isJson) throw new Error("The server could not process your request. Please try again.");

  const payload = await response.json();
  if (!response.ok || payload.status >= 400) {
    throw new Error(payload.error || payload.message || "The request failed. Please try again.");
  }
  return payload;
}

export function useApi(path) {
  const [result, setResult] = useState({ path: null, data: null, error: "" });

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    request(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ path, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [path]);

  return path === result.path
    ? { ...result, loading: false }
    : { data: null, error: "", loading: Boolean(path) };
}
