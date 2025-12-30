export const cleanImportedText = (text: string): string => {
  // Remove extra whitespace
  let cleaned = text.trim();
  
  // Remove multiple empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleaned;
};

export const parseWhatsAppExport = (text: string): string => {
  // Basic cleaning first
  let cleaned = cleanImportedText(text);
  
  // Remove the standard "Messages and calls are end-to-end encrypted..." system message
  cleaned = cleaned.replace(/^Messages and calls are end-to-end encrypted.*\n?/m, '');

  // Remove timestamps like [25/12/24, 10:30:15 PM] or 25/12/24, 10:30 PM - 
  // Pattern 1: [Date, Time] Name: Message
  // Pattern 2: Date, Time - Name: Message
  
  // Regex for "[dd/mm/yy, hh:mm:ss] " or similar
  // This is a naive implementation; WhatsApp formats vary by region/OS
  
  // Attempt to remove just the timestamp prefix to make it more readable as a script
  // Example: "[12/25/24, 9:26:15 PM] User: Hello" -> "User: Hello"
  cleaned = cleaned.replace(/^\[?\d{1,2}\/\d{1,2}\/\d{2,4},? \d{1,2}:\d{2}(:\d{2})?\s?(AM|PM|am|pm)?\]? (- )?/gm, '');
  
  return cleaned;
};
