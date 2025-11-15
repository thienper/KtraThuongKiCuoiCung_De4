import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import db from '@/db';

// Định nghĩa type cho Book
type Book = {
  id: number;
  title: string;
  author: string | null;
  status: string;
  created_at: number;
};

export default function HomeScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Load danh sách sách từ database
  const loadBooks = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync<Book>('SELECT * FROM books ORDER BY created_at DESC');
      setBooks(result);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // Hiển thị trạng thái theo status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning':
        return '📋 Cần đọc';
      case 'reading':
        return '📖 Đang đọc';
      case 'done':
        return '✅ Đã đọc';
      default:
        return status;
    }
  };

  // Màu sắc theo status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return '#FFA500';
      case 'reading':
        return '#4169E1';
      case 'done':
        return '#32CD32';
      default:
        return '#666';
    }
  };

  // Render từng item trong danh sách
  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.bookItem}>
      <View style={styles.bookContent}>
        <ThemedText style={styles.bookTitle}>{item.title}</ThemedText>
        {item.author && (
          <ThemedText style={styles.bookAuthor}>Tác giả: {item.author}</ThemedText>
        )}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
    </View>
  );

  // Empty state
  if (!loading && books.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>📚</ThemedText>
          <ThemedText style={styles.emptyTitle}>Chưa có sách trong danh sách đọc.</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Hãy thêm cuốn sách đầu tiên của bạn!
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Reading List</ThemedText>
        <ThemedText style={styles.count}>
          {books.length} cuốn sách
        </ThemedText>
      </ThemedView>
      
      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadBooks}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    gap: 8,
  },
  count: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  bookItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookContent: {
    gap: 8,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
