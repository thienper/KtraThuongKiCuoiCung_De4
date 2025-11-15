import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import db from '@/db';

type Book = {
  id: number;
  title: string;
  author: string | null;
  status: string;
  created_at: number;
};

export default function ModalScreen() {
  const params = useLocalSearchParams();
  const bookId = params.id ? Number(params.id) : null;
  const isEditMode = bookId !== null;

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('planning');
  const [loading, setLoading] = useState(false);

  // Load dữ liệu sách khi ở chế độ edit
  useEffect(() => {
    if (isEditMode) {
      loadBookData();
    }
  }, [bookId]);

  const loadBookData = async () => {
    try {
      const result = await db.getAllAsync<Book>('SELECT * FROM books WHERE id = ?', [bookId]);
      if (result.length > 0) {
        const book = result[0];
        setTitle(book.title);
        setAuthor(book.author || '');
        setStatus(book.status);
      }
    } catch (error) {
      console.error('Error loading book:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin sách!');
    }
  };

  // Validate và thêm sách mới
  const handleAddBook = async () => {
    // Validate: title không được rỗng
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sách!');
      return;
    }

    try {
      setLoading(true);

      // INSERT vào SQLite
      await db.runAsync(
        'INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)',
        [title.trim(), author.trim() || null, 'planning', Date.now()]
      );

      Alert.alert('Thành công', 'Đã thêm sách mới!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error adding book:', error);
      Alert.alert('Lỗi', 'Không thể thêm sách. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // Validate và cập nhật sách
  const handleUpdateBook = async () => {
    // Validate: title không được rỗng
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sách!');
      return;
    }

    try {
      setLoading(true);

      // UPDATE trong SQLite
      await db.runAsync(
        'UPDATE books SET title = ?, author = ?, status = ? WHERE id = ?',
        [title.trim(), author.trim() || null, status, bookId]
      );

      Alert.alert('Thành công', 'Đã cập nhật sách!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating book:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật sách. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (isEditMode) {
      handleUpdateBook();
    } else {
      handleAddBook();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {isEditMode ? 'Sửa sách' : 'Thêm sách mới'}
          </ThemedText>

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Tên sách <ThemedText style={styles.required}>*</ThemedText></ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên sách..."
                value={title}
                onChangeText={setTitle}
                autoFocus={!isEditMode}
              />
            </ThemedView>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Tác giả</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên tác giả (tùy chọn)..."
                value={author}
                onChangeText={setAuthor}
              />
            </ThemedView>

            {isEditMode && (
              <ThemedView style={styles.inputGroup}>
                <ThemedText style={styles.label}>Trạng thái</ThemedText>
                <ThemedView style={styles.statusPicker}>
                  <TouchableOpacity
                    style={[styles.statusOption, status === 'planning' && styles.statusOptionActive]}
                    onPress={() => setStatus('planning')}
                  >
                    <ThemedText style={[styles.statusOptionText, status === 'planning' && styles.statusOptionTextActive]}>
                      📋 Cần đọc
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusOption, status === 'reading' && styles.statusOptionActive]}
                    onPress={() => setStatus('reading')}
                  >
                    <ThemedText style={[styles.statusOptionText, status === 'reading' && styles.statusOptionTextActive]}>
                      📖 Đang đọc
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusOption, status === 'done' && styles.statusOptionActive]}
                    onPress={() => setStatus('done')}
                  >
                    <ThemedText style={[styles.statusOptionText, status === 'done' && styles.statusOptionTextActive]}>
                      ✅ Đã đọc
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            )}

            <ThemedView style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => router.back()}
                disabled={loading}
              >
                <ThemedText style={styles.cancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={loading}
              >
                <ThemedText style={styles.saveButtonText}>
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  required: {
    color: '#FF0000',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  statusOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
