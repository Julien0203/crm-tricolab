'use client';

import { useState, useEffect, useRef } from 'react';
import { getTasks, saveTask, updateTask, deleteTask } from '@/lib/store';
import { Task } from '@/lib/types';
import { Plus, Trash2, CheckSquare, Square, ClipboardList } from 'lucide-react';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
};

type Filter = 'all' | 'todo' | 'done';

export default function TachesPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTasks().then(t => setTasks(t));
  }, []);

  async function handleAdd() {
    const text = input.trim();
    if (!text) return;
    const t = await saveTask(text);
    setTasks(prev => [t, ...prev]);
    setInput('');
    inputRef.current?.focus();
  }

  async function handleToggle(id: string, completed: boolean) {
    await updateTask(id, { completed: !completed });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function handleClearDone() {
    await Promise.all(tasks.filter(t => t.completed).map(t => deleteTask(t.id)));
    setTasks(prev => prev.filter(t => !t.completed));
  }

  const filtered = tasks.filter(t => {
    if (filter === 'todo') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const doneCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em' }}>
          Mes tâches
        </h1>
        <p style={{ color: 'rgba(60,60,67,0.55)', margin: '4px 0 0', fontSize: 13 }}>
          {totalCount === 0 ? 'Aucune tâche pour le moment' : `${doneCount} / ${totalCount} terminée${doneCount > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Add task */}
      <div style={{ ...glass, borderRadius: 14, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nouvelle tâche… (Entrée pour ajouter)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
          autoFocus
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            background: input.trim() ? '#6366f1' : 'rgba(99,102,241,0.15)',
            color: input.trim() ? '#fff' : 'rgba(99,102,241,0.50)',
            border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >
          <Plus size={15} />
          Ajouter
        </button>
      </div>

      {/* Filters */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
          {(['all', 'todo', 'done'] as Filter[]).map(f => {
            const labels: Record<Filter, string> = { all: 'Toutes', todo: 'À faire', done: 'Terminées' };
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
                  border: active ? '1px solid rgba(99,102,241,0.30)' : '1px solid rgba(0,0,0,0.08)',
                  background: active ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.60)',
                  color: active ? '#6366f1' : 'rgba(60,60,67,0.55)',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {labels[f]}
              </button>
            );
          })}
          {doneCount > 0 && (
            <button
              onClick={handleClearDone}
              style={{
                marginLeft: 'auto', padding: '5px 12px', borderRadius: 20, fontSize: 12,
                border: '1px solid rgba(239,68,68,0.20)',
                background: 'rgba(239,68,68,0.06)',
                color: 'rgba(239,68,68,0.70)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Supprimer terminées
            </button>
          )}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div
          style={{
            ...glass, borderRadius: 14, padding: '48px 24px',
            textAlign: 'center', color: 'rgba(60,60,67,0.35)',
          }}
        >
          <ClipboardList size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>
            {filter === 'done' ? 'Aucune tâche terminée' : filter === 'todo' ? 'Tout est fait !' : 'Ajoute ta première tâche ci-dessus'}
          </div>
        </div>
      ) : (
        <div style={{ ...glass, borderRadius: 14, overflow: 'hidden' }}>
          {filtered.map((task, i) => (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px',
                borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                transition: 'background 0.1s',
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(task.id, task.completed)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: task.completed ? '#10b981' : 'rgba(60,60,67,0.30)',
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
              >
                {task.completed
                  ? <CheckSquare size={20} />
                  : <Square size={20} />
                }
              </button>

              {/* Text */}
              <span
                style={{
                  flex: 1, fontSize: 14, color: task.completed ? 'rgba(60,60,67,0.35)' : 'var(--text-primary)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  transition: 'all 0.2s',
                  wordBreak: 'break-word',
                }}
              >
                {task.text}
              </span>

              {/* Delete */}
              <button
                onClick={() => handleDelete(task.id)}
                style={{
                  background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                  color: 'rgba(60,60,67,0.20)', flexShrink: 0, display: 'flex', alignItems: 'center',
                  borderRadius: 6, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(60,60,67,0.20)')}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div style={{ marginTop: 16, ...glass, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'rgba(60,60,67,0.50)' }}>
            <span>Progression</span>
            <span style={{ fontWeight: 600, color: doneCount === totalCount ? '#10b981' : '#6366f1' }}>
              {Math.round((doneCount / totalCount) * 100)}%
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(doneCount / totalCount) * 100}%`,
                background: doneCount === totalCount ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
