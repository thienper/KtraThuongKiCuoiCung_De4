import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import db from '@/db';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';

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

  // Reload khi quay lại từ modal
  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

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

  // Chu kỳ thay đổi trạng thái: planning → reading → done → planning
  const cycleStatus = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'planning':
        return 'reading';
      case 'reading':
        return 'done';
      case 'done':
        return 'planning';
      default:
        return 'planning';
    }
  };

  // Thay đổi trạng thái sách
  const handleChangeStatus = async (book: Book) => {
    try {
      const newStatus = cycleStatus(book.status);

      // UPDATE trong SQLite
      await db.runAsync(
        'UPDATE books SET status = ? WHERE id = ?',
        [newStatus, book.id]
      );

      // Cập nhật UI ngay lập tức
      setBooks(prevBooks =>
        prevBooks.map(b =>
          b.id === book.id ? { ...b, status: newStatus } : b
        )
      );
    } catch (error) {
      console.error('Error updating book status:', error);
    }
  };

  // Xóa sách với xác nhận
  const handleDeleteBook = (book: Book) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa sách "${book.title}"?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // DELETE khỏi SQLite
              await db.runAsync('DELETE FROM books WHERE id = ?', [book.id]);
              
              // Cập nhật danh sách
              setBooks(prevBooks => prevBooks.filter(b => b.id !== book.id));
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Lỗi', 'Không thể xóa sách. Vui lòng thử lại!');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Render từng item trong danh sách
  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.bookItemContainer}>
      <TouchableOpacity
        style={styles.bookItem}
        onPress={() => handleChangeStatus(item)}
        onLongPress={() => router.push(`/modal?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.bookContent}>
          <ThemedText style={styles.bookTitle}>{item.title}</ThemedText>
          {item.author && (
            <ThemedText style={styles.bookAuthor}>Tác giả: {item.author}</ThemedText>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
          <ThemedText style={styles.tapHint}>
            Chạm để thay đổi trạng thái • Giữ để sửa
          </ThemedText>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteBook(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
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
        <ThemedView style={styles.headerContent}>
          <ThemedView>
            <ThemedText type="title">Reading List</ThemedText>
            <ThemedText style={styles.count}>
              {books.length} cuốn sách
            </ThemedText>
          </ThemedView>

          <Link href="/modal" asChild>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </Link>
        </ThemedView>
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  bookItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bookItem: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 24,
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
  tapHint: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 4,
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
