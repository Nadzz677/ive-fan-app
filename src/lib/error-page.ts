export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="/404.css" />
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p class="desc">Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <a class="btn" href="">Try again</a>
        <a class="btn btn-secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
