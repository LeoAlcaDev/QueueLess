import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { ROL_LABELS, type Rol } from '@/types/enums';
import type { NavItem } from '@/routes/navigation';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

interface SidebarProps {
  role: Rol;
  items: NavItem[];
  onNavigate?: () => void;
  footer?: ReactNode;
}

export function Sidebar({ role, items, onNavigate, footer }: SidebarProps) {
  return (
    <div className="flex h-full w-60 flex-col bg-surface px-3.5 py-5">
      <div className="px-2 pb-4">
        <Logo size={24} />
      </div>
      <div className="ql-section-label px-2.5 pb-2">{ROL_LABELS[role]}</div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-small transition-colors',
                isActive
                  ? 'bg-brand-soft font-bold text-brand-text'
                  : 'font-medium text-ink-soft hover:bg-surface-muted',
              )
            }
          >
            <Icon name={item.icon} size={19} />
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {footer}
    </div>
  );
}
