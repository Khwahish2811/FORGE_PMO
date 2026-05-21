export const openNotification = (type, title, message) => {
  if (!message) {
    message = title;
    title = type.toUpperCase();
  }
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  // In a real implementation, you can integrate this with a toast library.
  // We'll fallback to a browser alert if it's a critical error (like 401).
  if (type === 'error') {
    alert(`${title}\n${message}`);
  }
};
