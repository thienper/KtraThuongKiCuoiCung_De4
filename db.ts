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
    // Database đã sẵn sàng khi openDatabaseSync được gọi
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
