
import React from 'react';
import { Text, View, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface MarkdownTextProps {
  content: string;
  style?: TextStyle;
  isUser?: boolean; // To adjust colors
}

/**
 * A lightweight Markdown renderer for Chat bubbles.
 * Supports: **bold**, *italic*, bullet lists (•, -), and numbered lists (1.).
 */
export default function MarkdownText({ content, style, isUser = false }: MarkdownTextProps) {
  if (!content) return null;

  // Split by newlines to handle paragraphs and lists
  const lines = content.split('\n');

  const textColor = isUser ? '#FFFFFF' : '#1E293B';

  const parseText = (text: string) => {
    // We will simple split by bold tokens
    // Note: Nested bold/italic is not supported in this simple version
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const inner = part.slice(2, -2);
            return (
                <Text key={index} style={[style, styles.bold, { color: textColor }]}>
                    {inner}
                </Text>
            );
        }
        return (
            <Text key={index} style={[style, { color: textColor }]}>
                {part}
            </Text>
        );
    });
  };

  return (
    <View>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        
        // Bullet List
        if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
             const cleanLine = trimmed.replace(/^[-•]\s*/, '');
             return (
                 <View key={index} style={styles.listItem}>
                     <Text style={[style, styles.bullet, { color: textColor }]}>•</Text>
                     <Text style={[style, { flex: 1, color: textColor }]}>
                        {parseText(cleanLine)}
                     </Text>
                 </View>
             );
        }
        
        // Numbered List (Simple detection for 1., 2. etc)
        // Regex: start with number dot space
        if (/^\d+\.\s/.test(trimmed)) {
             const match = trimmed.match(/^(\d+\.)\s(.*)/);
             if (match) {
                 const number = match[1];
                 const text = match[2];
                 return (
                     <View key={index} style={styles.listItem}>
                         <Text style={[style, styles.bullet, { color: textColor }]}>{number}</Text>
                         <Text style={[style, { flex: 1, color: textColor }]}>
                            {parseText(text)}
                         </Text>
                     </View>
                 );
             }
        }
        
        // Headers (## Title)
        if (trimmed.startsWith('## ')) {
             return (
                 <Text key={index} style={[style, styles.h2, { color: textColor }]}>
                     {trimmed.replace('## ', '')}
                 </Text>
             );
        }
        
        // Regular Text
        // Only return View if it's not empty text (to avoid large gaps), unless it's explicitly a spacer
        if (trimmed.length === 0) {
            return <View key={index} style={{ height: 8 }} />;
        }

        return (
          <Text key={index} style={[style, styles.paragraph, { color: textColor }]}>
            {parseText(line)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginBottom: 4,
    lineHeight: 22,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bullet: {
    width: 20,
    fontWeight: 'bold',
  }
});
