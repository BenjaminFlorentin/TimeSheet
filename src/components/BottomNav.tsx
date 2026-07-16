import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function BottomNav() {
  const { t } = useI18n();
  const items = [
    { to: '/', label: t('nav.summary'), icon: '⚡' },
    { to: '/details', label: t('nav.details'), icon: '📜' },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-surface2 safe-bottom">
      <ul className="grid grid-cols-2 max-w-md mx-auto">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
