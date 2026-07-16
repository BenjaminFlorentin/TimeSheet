import type { Entry } from '../types';
import { useI18n } from '../i18n';
import {
  entryMinutes,
  formatDuration,
  formatLongDate,
  formatRatio,
  isOnCall,
  ratioOverEight,
} from '../utils/time';

type Props = {
  entry: Entry;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  showRatio?: boolean;
};

export default function EntryCard({
  entry,
  onDelete,
  onEdit,
  showRatio = false,
}: Props) {
  const { t, locale } = useI18n();
  const oncall = isOnCall(entry);
  const duration = oncall ? t('entry.oncall') : formatDuration(entryMinutes(entry));
  const ratio = showRatio && !oncall ? formatRatio(ratioOverEight(entry)) : null;
  return (
    <div className="bg-surface rounded-xl p-4 border border-surface2 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted capitalize">
          {formatLongDate(entry.date, locale)}
        </p>
        <p className="text-lg font-semibold mt-1">{duration}</p>
        {entry.note && (
          <p className="text-sm text-slate-300 mt-1 break-words">{entry.note}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {ratio && (
          <span className="text-xs bg-accent2/20 text-accent2 rounded-full px-2 py-1 font-medium">
            {ratio}
          </span>
        )}
        <div className="flex gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry.id)}
              className="text-muted hover:text-accent text-lg"
              aria-label={t('entry.edit')}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="text-muted hover:text-red-400 text-lg"
              aria-label={t('entry.delete')}
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
