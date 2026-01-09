/**
 * Verify the post exists.
 * @param url the URL of the post to validate.
 * @param timeout in milliseconds.
 * @returns true if the post exists, false otherwise.
 */
export async function validatePostUrl(url: string, timeout: number): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full page
      signal: AbortSignal.timeout(timeout),
    });

    return res.ok;
  } catch (err) {
    console.warn(`Blog post validation failed for ${url}:`, err);
    return false;
  }
}
