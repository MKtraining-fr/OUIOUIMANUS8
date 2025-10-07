export const withAppendedQueryParam = (url: string, key: string, value: string): string => {
  if (!url) {
    return url;
  }

  try {
    const urlObject = new URL(url);
    urlObject.searchParams.set(key, value);
    return urlObject.toString();
  } catch (error) {
    const separator = url.includes('?') ? '&' : '?';
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    return `${url}${separator}${encodedKey}=${encodedValue}`;
  }
};
