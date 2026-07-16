export type EntryKind = 'overtime' | 'oncall';

export type Entry = {
  id: string;
  date: string;
  hours: number;
  minutes: number;
  kind?: EntryKind;
  note?: string;
};

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  entries: Entry[];
};
