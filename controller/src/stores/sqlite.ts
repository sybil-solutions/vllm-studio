import { Database } from "bun:sqlite";

export const openSqliteDatabase = (dbPath: string): Database => {
  const db = new Database(dbPath);
  db.run("PRAGMA busy_timeout = 5000");
  return db;
};

