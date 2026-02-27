import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export function getDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(os.homedir(), '.engram', 'engram.db');

    if (!fs.existsSync(dbPath)) {
      return reject(new Error(`Database not found at ${dbPath}`));
    }

    // Open in read-only mode to avoid locking
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        return reject(new Error(`Failed to connect to database: ${err.message}`));
      }
      resolve(db);
    });
  });
}
