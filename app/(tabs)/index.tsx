import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import db from '@/db';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null); // null = all, 'planning', 'reading', 'done'
  const [importing, setImporting] = useState(false);

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

  // Filter và search real-time với useMemo
  const filteredBooks = useMemo(() => {
    let result = books;

    // Filter theo status
    if (filterStatus !== null) {
      result = result.filter(book => book.status === filterStatus);
    }

    // Search theo title
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(book =>
        book.title.toLowerCase().includes(query) ||
        (book.author && book.author.toLowerCase().includes(query))
      );
    }

    return result;
  }, [books, searchQuery, filterStatus]);

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

  // Import sách từ API
  const handleImportFromAPI = async () => {
    try {
      setImporting(true);

      // Gọi API để lấy danh sách sách gợi ý
      const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
      
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();

      // Map dữ liệu từ API
      const suggestedBooks = data.map((item: any) => ({
        title: item.title,
        author: `User ${item.userId}`,
        status: 'planning',
        created_at: Date.now(),
      }));

      let addedCount = 0;
      let skippedCount = 0;

      // Kiểm tra và thêm sách, bỏ qua nếu title trùng
      for (const book of suggestedBooks) {
        // Kiểm tra title đã tồn tại chưa
        const existing = await db.getAllAsync<Book>(
          'SELECT * FROM books WHERE LOWER(title) = LOWER(?)',
          [book.title]
        );

        if (existing.length === 0) {
          // Thêm sách mới
          await db.runAsync(
            'INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)',
            [book.title, book.author, book.status, book.created_at]
          );
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      // Reload danh sách
      await loadBooks();

      // Thông báo kết quả
      Alert.alert(
        'Import hoàn tất',
        `Đã thêm ${addedCount} sách mới.\n${skippedCount > 0 ? `Bỏ qua ${skippedCount} sách trùng lặp.` : ''}`
      );
    } catch (error) {
      console.error('Error importing books:', error);
      Alert.alert('Lỗi', 'Không thể import sách từ API. Vui lòng thử lại!');
    } finally {
      setImporting(false);
    }
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
              {filteredBooks.length} / {books.length} cuốn sách
            </ThemedText>
          </ThemedView>

          <Link href="/modal" asChild>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </Link>
        </ThemedView>

        {/* Search Input */}
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm sách theo tên hoặc tác giả..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === null && styles.filterTabActive]}
            onPress={() => setFilterStatus(null)}
          >
            <Text style={[styles.filterTabText, filterStatus === null && styles.filterTabTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'planning' && styles.filterTabActive]}
            onPress={() => setFilterStatus('planning')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'planning' && styles.filterTabTextActive]}>
              📋 Cần đọc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'reading' && styles.filterTabActive]}
            onPress={() => setFilterStatus('reading')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'reading' && styles.filterTabTextActive]}>
              📖 Đang đọc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'done' && styles.filterTabActive]}
            onPress={() => setFilterStatus('done')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'done' && styles.filterTabTextActive]}>
              ✅ Đã đọc
            </Text>
          </TouchableOpacity>
        </View>

        {/* Import Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImportFromAPI}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>
            {importing ? '⏳ Đang import...' : '📥 Import từ API'}
          </Text>
        </TouchableOpacity>
      </ThemedView>

      <FlatList
        data={filteredBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadBooks}
        ListEmptyComponent={
          <ThemedView style={styles.emptyListContainer}>
            <ThemedText style={styles.emptyListText}>
              {searchQuery || filterStatus
                ? 'Không tìm thấy sách phù hợp'
                : 'Chưa có sách trong danh sách'}
            </ThemedText>
          </ThemedView>
        }
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
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  emptyListContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
});
