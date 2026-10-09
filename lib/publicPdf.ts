// Only proxy public PDF objects belonging to this project's landing-media bucket.
export function isHostedMenuPdf(value: string, projectUrl: string): boolean {
  try {
    const url = new URL(value);
    const project = new URL(projectUrl);
    const path = decodeURIComponent(url.pathname);
    return url.protocol === 'https:' && url.origin === project.origin && !url.username && !url.password
      && path.startsWith('/storage/v1/object/public/landing-media/')
      && !path.split('/').some(segment => segment === '..' || segment === '.')
      && path.toLowerCase().endsWith('.pdf') && !url.search;
  } catch { return false; }
}
