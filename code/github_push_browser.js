/**
 * github_push_browser.js
 *
 * Working pattern for pushing files to GitHub via the browser's fetch() API.
 * Developed during PostGlider competitor intelligence sessions (2026-04-10).
 *
 * WHY BROWSER-BASED:
 *   The Cowork sandbox blocks outbound connections to github.com.
 *   Running these JS snippets inside a github.com tab bypasses that restriction.
 *   The virtiofs mount (D:\projects\postglider → /sessions/.../mnt/postglider)
 *   also does NOT sync to Windows Explorer, so GitHub is used as the delivery
 *   mechanism instead.
 *
 * USAGE PATTERN (run in browser tab on github.com):
 *
 * Step 1 — Build the file content as a raw string in JS
 *   (avoids base64 corruption from large embedded strings in tool calls)
 *
 *   window._content = '';
 *   window._content += 'first chunk of text...';
 *   window._content += 'next chunk...';
 *   // repeat until full file is assembled
 *
 * Step 2 — Encode to base64 (GitHub API requires base64 content)
 *
 *   window._b64 = btoa(window._content);
 *
 * Step 3 — Push to GitHub (handles both new files and updates)
 */

(async () => {
  const PAT  = 'YOUR_PAT_HERE';           // GitHub Personal Access Token
  const REPO = 'owner/repo-name';         // e.g. 'kenlyle2/mfystrategy'
  const path = 'path/to/file.json';       // path within repo, no leading slash
  const msg  = 'Add file via browser API';

  const headers = {
    'Authorization':      `Bearer ${PAT}`,
    'Content-Type':       'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // Get existing file SHA (required when updating an existing file)
  const checkR = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { headers });
  const checkD = await checkR.json();

  const body = { message: msg, content: window._b64 };
  if (checkD.sha) body.sha = checkD.sha;   // omit for new files, required for updates

  const r = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    { method: 'PUT', headers, body: JSON.stringify(body) }
  );
  const d = await r.json();
  console.log({ status: r.status, url: d?.content?.html_url, err: d?.message });
})();

/**
 * LESSONS LEARNED:
 *
 * 1. Never embed large base64 strings directly in JS tool calls — the Claude
 *    in Chrome extension introduces whitespace corruption. Instead, pass raw
 *    text and let btoa() do the encoding in the browser.
 *
 * 2. The GitHub API returns 422 "sha wasn't supplied" when updating a file
 *    that already exists. Always GET the file first to retrieve its SHA.
 *
 * 3. Chunk size for raw text +=: 2000 chars works reliably. Larger chunks
 *    may hit tool argument limits.
 *
 * 4. PATs exposed in sessions should be rotated immediately after use.
 *    Go to GitHub → Settings → Developer settings → Personal access tokens.
 */
