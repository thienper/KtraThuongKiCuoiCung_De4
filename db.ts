import * as SQLite from 'expo-sqlite';

// Khởi tạo kết nối database
const db = SQLite.openDatabaseSync('reading_list.db');

/**
 * Hàm khởi tạo database
 * Sẽ được gọi khi app khởi động
 */
export const initDatabase = async () => {
    try {
        console.log('Initializing database...');
        
        // Tạo bảng books nếu chưa có
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT,
                status TEXT DEFAULT 'planning',
                created_at INTEGER
            );
        `);
        
        console.log('Books table created successfully');
        
        // Kiểm tra xem đã có dữ liệu chưa
        const result = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM books');
        const count = result[0]?.count || 0;
        
        // Nếu chưa có dữ liệu, seed dữ liệu mẫu
        if (count === 0) {
            console.log('Seeding sample books...');
            
            const sampleBooks = [
                {
                    title: 'Clean Code',
                    author: 'Robert C. Martin',
                    status: 'planning',
                    created_at: Date.now()
                },
                {
                    title: 'Atomic Habits',
                    author: 'James Clear',
                    status: 'reading',
                    created_at: Date.now()
                },
                {
                    title: 'The Pragmatic Programmer',
                    author: 'Andrew Hunt, David Thomas',
                    status: 'planning',
                    created_at: Date.now()
                }
            ];
            
            for (const book of sampleBooks) {
                await db.runAsync(
                    'INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)',
                    [book.title, book.author, book.status, book.created_at]
                );
            }
            
            console.log('Sample books seeded successfully');
        } else {
            console.log(`Database already has ${count} book(s)`);
        }
        
        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

/**
 * Export database instance để sử dụng trong toàn app
 */
export default db;
