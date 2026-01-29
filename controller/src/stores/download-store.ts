// CRITICAL
import { Database } from "bun:sqlite";
import type { ModelDownload } from "../types/models";

/**
 * SQLite-backed download storage.
 */
export class DownloadStore {
  private readonly db: Database;

  /**
   * Create a download store.
   * @param dbPath - SQLite database path.
   */
  public constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.run("PRAGMA busy_timeout = 5000");
    this.migrate();
  }

  /**
   * Ensure database schema exists.
   * @returns void
   */
  private migrate(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS model_downloads (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * List downloads.
   * @returns Array of downloads.
   */
  public list(): ModelDownload[] {
    const rows = this.db.query("SELECT data FROM model_downloads ORDER BY updated_at DESC").all() as Array<{
      data: string;
    }>;
    const downloads: ModelDownload[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.data) as ModelDownload;
        downloads.push(parsed);
      } catch {
        continue;
      }
    }
    return downloads;
  }

  /**
   * Get a download by id.
   * @param id - Download id.
   * @returns Download entry or null.
   */
  public get(id: string): ModelDownload | null {
    const row = this.db.query("SELECT data FROM model_downloads WHERE id = ?").get(id) as { data: string } | null;
    if (!row?.data) {
      return null;
    }
    try {
      return JSON.parse(row.data) as ModelDownload;
    } catch {
      return null;
    }
  }

  /**
   * Save a download entry.
   * @param download - Download record.
   * @returns void
   */
  public save(download: ModelDownload): void {
    const data = JSON.stringify(download);
    this.db.query(`
      INSERT INTO model_downloads (id, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
    `).run(download.id, data);
  }

  /**
   * Delete a download entry.
   * @param id - Download id.
   * @returns True if deleted.
   */
  public delete(id: string): boolean {
    const result = this.db.query("DELETE FROM model_downloads WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
