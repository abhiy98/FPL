export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/transfers/index.html";
  const response = await context.env.ASSETS.fetch(new Request(url, context.request));
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.includes("text/html")) return response;

  let html = await response.text();
  if (!html.includes("/transfers-pitch.css")) {
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/transfers-pitch.css"></head>');
  }
  if (!html.includes("/transfers-header.js")) {
    html = html.replace(/<\/body>/i, '<script src="/transfers-header.js"></script></body>');
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
