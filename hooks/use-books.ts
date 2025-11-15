import db from '@/db';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type Book = {
    id: number;
    title: string;
    author: string | null;
    status: string;
    created_at: number;
};

export const useBooks = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    // Load danh sách sách từ database
    const loadBooks = useCallback(async () => {
        try {
            setLoading(true);
            const result = await db.getAllAsync<Book>('SELECT * FROM books ORDER BY created_at DESC');
            setBooks(result);
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Thêm sách mới
    const insertBook = useCallback(async (title: string, author: string | null) => {
        try {
            await db.runAsync(
                'INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)',
                [title, author, 'planning', Date.now()]
            );
            await loadBooks();
            return true;
        } catch (error) {
            console.error('Error inserting book:', error);
            return false;
        }
    }, [loadBooks]);

    // Cập nhật sách
    const updateBook = useCallback(async (id: number, title: string, author: string | null, status: string) => {
        try {
            await db.runAsync(
                'UPDATE books SET title = ?, author = ?, status = ? WHERE id = ?',
                [title, author, status, id]
            );
            await loadBooks();
            return true;
        } catch (error) {
            console.error('Error updating book:', error);
            return false;
        }
    }, [loadBooks]);

    // Thay đổi trạng thái sách
    const updateStatus = useCallback(async (id: number, newStatus: string) => {
        try {
            await db.runAsync(
                'UPDATE books SET status = ? WHERE id = ?',
                [newStatus, id]
            );

            // Cập nhật UI ngay lập tức (optimistic update)
            setBooks(prevBooks =>
                prevBooks.map(b =>
                    b.id === id ? { ...b, status: newStatus } : b
                )
            );
            return true;
        } catch (error) {
            console.error('Error updating status:', error);
            return false;
        }
    }, []);

    // Xóa sách
    const deleteBook = useCallback(async (id: number) => {
        try {
            await db.runAsync('DELETE FROM books WHERE id = ?', [id]);

            // Cập nhật danh sách
            setBooks(prevBooks => prevBooks.filter(b => b.id !== id));
            return true;
        } catch (error) {
            console.error('Error deleting book:', error);
            return false;
        }
    }, []);

    // Import sách từ API
    const importFromAPI = useCallback(async () => {
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

            return { addedCount, skippedCount };
        } catch (error) {
            console.error('Error importing books:', error);
            Alert.alert('Lỗi', 'Không thể import sách từ API. Vui lòng thử lại!');
            return null;
        } finally {
            setImporting(false);
        }
    }, [loadBooks]);

    return {
        books,
        loading,
        importing,
        loadBooks,
        insertBook,
        updateBook,
        updateStatus,
        deleteBook,
        importFromAPI,
    };
};
