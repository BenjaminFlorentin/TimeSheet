export type Entry = {
  id: string;
  date: string;
  hours: number;
  minutes: number;
  note?: string;
};

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  entries: Entry[];
};
