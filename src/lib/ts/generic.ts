export type Changelog = Record<string, ChangelogEntry>;

export interface ChangelogEntry {
  date: string;
  changes: string[];
}
