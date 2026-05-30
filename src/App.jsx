import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Sparkles, ChefHat, X, Edit2, Check, Calendar, ChevronDown, ChevronRight, CornerDownRight, Bell, BellRing, Flag, Clock } from 'lucide-react';
import './index.css';

function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('planer-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [newTaskText, setNewTaskText] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDeadline, setNewDeadline] = useState('');
  const [newReminderOffset, setNewReminderOffset] = useState('43200000'); // 12 hours in ms
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [activeRecipeTaskId, setActiveRecipeTaskId] = useState(null);
  const [ingredients, setIngredients] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [newSubtaskTexts, setNewSubtaskTexts] = useState({});

  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    localStorage.setItem('planer-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ваш браузер не підтримує сповіщення.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification('Чудово!', { body: 'Тепер ви будете отримувати нагадування.', icon: '/vite.svg' });
    }
  };

  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkNotifications = () => {
      setTasks(prevTasks => {
        let updated = false;
        const newTasks = prevTasks.map(task => {
          if (task.completed || !task.deadline || task.notified) return task;

          const deadlineTime = new Date(task.deadline).getTime();
          const now = Date.now();
          const offset = task.reminderOffset !== undefined ? task.reminderOffset : 12 * 60 * 60 * 1000;

          // Trigger if we've passed the (deadline - reminder offset) mark
          if (now >= deadlineTime - offset) {
            updated = true;
            try {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification('⏰ Нагадування Планера', {
                    body: `Час спливає! Завдання "${task.text}" заплановано на ${new Date(task.deadline).toLocaleString('uk-UA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}.`,
                    icon: '/vite.svg',
                    vibrate: [200, 100, 200]
                  });
                }).catch(() => {
                  new Notification('⏰ Нагадування Планера', {
                    body: `Час спливає! "${task.text}" заплановано на ${new Date(task.deadline).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit' })}.`,
                    icon: '/vite.svg'
                  });
                });
              } else {
                new Notification('⏰ Нагадування Планера', {
                  body: `Час спливає! "${task.text}" заплановано на ${new Date(task.deadline).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit' })}.`,
                  icon: '/vite.svg'
                });
              }
            } catch (e) {
              console.error('Error showing notification', e);
            }
            return { ...task, notified: true };
          }
          return task;
        });

        return updated ? newTasks : prevTasks;
      });
    };

    checkNotifications();
    const intervalId = setInterval(checkNotifications, 60000);

    return () => clearInterval(intervalId);
  }, [notificationPermission]);

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const text = newTaskText.trim();
    const lowerText = text.toLowerCase();

    // Check if task is food related
    const isFoodRelated = lowerText.includes('поїсти') || lowerText.includes('приготувати') || lowerText.includes('їсти') || lowerText.includes('готувати');

    const newTask = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      isFoodRelated,
      priority: newPriority,
      deadline: newDeadline,
      reminderOffset: parseInt(newReminderOffset, 10)
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
    setNewPriority('medium');
    setNewDeadline('');
    setNewReminderOffset('43200000');
  };

  const startEditing = (task, e) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTaskText(task.text);
  };

  const saveEdit = (id, e) => {
    e?.stopPropagation();
    if (!editTaskText.trim()) return;
    setTasks(tasks.map(t => t.id === id ? { ...t, text: editTaskText.trim() } : t));
    setEditingTaskId(null);
  };

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    // Needed for Firefox specifically
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverItemIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (draggedItemIndex !== null && dragOverItemIndex !== null && draggedItemIndex !== dragOverItemIndex) {
      const _tasks = [...tasks];
      const draggedItem = _tasks.splice(draggedItemIndex, 1)[0];
      _tasks.splice(dragOverItemIndex, 0, draggedItem);
      setTasks(_tasks);
    }
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    const newSet = new Set(expandedTasks);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedTasks(newSet);
  };

  const addSubtask = (taskId, e) => {
    e?.preventDefault();
    const text = (newSubtaskTexts[taskId] || '').trim();
    if (!text) return;

    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...(t.subtasks || []), { id: crypto.randomUUID(), text, completed: false }]
        };
      }
      return t;
    }));
    setNewSubtaskTexts({ ...newSubtaskTexts, [taskId]: '' });
  };

  const toggleSubtask = (taskId, subtaskId, e) => {
    e.stopPropagation();
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st)
        };
      }
      return t;
    }));
  };

  const deleteSubtask = (taskId, subtaskId, e) => {
    e.stopPropagation();
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.filter(st => st.id !== subtaskId)
        };
      }
      return t;
    }));
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id, e) => {
    e.stopPropagation();
    setTasks(tasks.filter(t => t.id !== id));
    if (activeRecipeTaskId === id) setActiveRecipeTaskId(null);
  };

  const openRecipeAssistant = (id, e) => {
    e.stopPropagation();
    setActiveRecipeTaskId(activeRecipeTaskId === id ? null : id);
    setAiResponse('');
    setIngredients('');
  };

  const generateRecipe = async () => {
    if (!ingredients.trim()) return;
    setIsGenerating(true);
    setAiResponse('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setAiResponse('Помилка: API ключ не знайдено. Переконайтеся, що файл .env містить ключ VITE_GEMINI_API_KEY і ви перезапустили сервер розробки.');
        setIsGenerating(false);
        return;
      }

      const prompt = `Ти — привітний та креативний шеф-кухар. Запропонуй 1 або 2 цікавих та смачних рецепти, використовуючи переважно ці інгредієнти: ${ingredients}. Форматуй відповідь гарно, використовуючи текст з нового рядка, списки та відповідні емодзі (українською мовою).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Помилка API');
      }

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textResponse) {
        setAiResponse(textResponse);
      } else {
        setAiResponse('Не вдалося згенерувати рецепт. Спробуйте вказати інші інгредієнти.');
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      setAiResponse('Сталася помилка при зверненні до ШІ. Спробуйте пізніше.');
    } finally {
      setIsGenerating(false);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercentage = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="app-container">
      <div className="credit-badge">created by Ihorko</div>
      <header className="header">
        <h1>Планер</h1>
        <p>Керуй своїм днем та планами</p>
      </header>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-info" style={{ alignItems: 'center' }}>
          <span>Прогрес за день</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button
              className="delete-btn"
              style={{ padding: '0.4rem', borderRadius: '8px' }}
              onClick={requestNotificationPermission}
              title={notificationPermission === 'granted' ? 'Сповіщення увімкнено' : 'Увімкнути сповіщення'}
              type="button"
            >
              {notificationPermission === 'granted' ? <BellRing size={16} color="#10b981" /> : <Bell size={16} />}
            </button>
            <span>{completedCount} з {tasks.length} ({progressPercentage}%)</span>
          </div>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      {tasks.length > 0 && progressPercentage === 100 && (
        <div className="celebration-banner">
          🎉 Усі завдання виконано! Ви неймовірні! 🏆
        </div>
      )}

      <form onSubmit={addTask} className="task-form-card">
        <input
          type="text"
          className="task-input-main"
          placeholder="Що плануємо зробити?..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
        />

        <div className="task-form-options">
          <div className="option-group">
            <div className="option-label"><Flag size={16} /> Пріоритет</div>
            <select
              className="option-select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
            >
              <option value="high">🔥 Високий</option>
              <option value="medium">⚡ Середній</option>
              <option value="low">☕ Низький</option>
            </select>
          </div>

          <div className="option-group">
            <div className="option-label"><Calendar size={16} /> Дедлайн</div>
            <input
              type="datetime-local"
              className="option-input"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
          </div>

          <div className="option-group reminder-group">
            <div className="option-label"><Bell size={16} /> Нагадати</div>
            <select
              className="option-select"
              value={newReminderOffset}
              onChange={(e) => setNewReminderOffset(e.target.value)}
            >
              <option value="900000">За 15 хв до події</option>
              <option value="3600000">За 1 годину до події</option>
              <option value="43200000">За 12 годин до події</option>
              <option value="86400000">За 1 день до події</option>
              <option value="0">В момент самої події</option>
            </select>
          </div>
        </div>

        <button type="submit" className="submit-btn-large">
          <Plus size={24} /> <span>Створити завдання</span>
        </button>
      </form>

      <div className="task-list">
        {tasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>Немає завдань. Додайте щось нове!</p>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                className={`task-item ${task.completed ? 'completed' : ''} ${draggedItemIndex === index ? 'dragging' : ''} ${dragOverItemIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onClick={() => toggleTask(task.id)}
              >
                <div className={`dot ${task.completed ? 'dot-green' : 'dot-red'}`}></div>

                <div className="task-content">
                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      className="input-glass"
                      style={{ padding: '0.5rem 1rem', fontSize: '1rem', marginBottom: '0.3rem' }}
                      value={editTaskText}
                      onChange={(e) => setEditTaskText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(task.id, e);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="task-text">{task.text}</span>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                    {task.priority && (
                      <span className={`priority-badge priority-${task.priority}`}>
                        {task.priority === 'high' ? '🔥 Високий' : task.priority === 'medium' ? '⚡ Середній' : '☕ Низький'}
                      </span>
                    )}
                    {task.deadline && (
                      <span className="priority-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} /> {new Date(task.deadline).toLocaleString('uk-UA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <span className="priority-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="task-actions">
                  {editingTaskId === task.id ? (
                    <button
                      className="delete-btn"
                      onClick={(e) => saveEdit(task.id, e)}
                      title="Зберегти"
                      style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                    >
                      <Check size={22} />
                    </button>
                  ) : (
                    <>
                      <button
                        className="delete-btn"
                        onClick={(e) => startEditing(task, e)}
                        title="Редагувати"
                      >
                        <Edit2 size={22} />
                      </button>
                      {task.isFoodRelated && (
                        <button
                          className="delete-btn chef-btn"
                          onClick={(e) => openRecipeAssistant(task.id, e)}
                          title="Підібрати рецепт"
                        >
                          <ChefHat size={22} />
                        </button>
                      )}

                      <button
                        className="delete-btn"
                        onClick={(e) => toggleExpand(task.id, e)}
                        title="Підпункти"
                      >
                        {expandedTasks.has(task.id) ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                      </button>

                      <button
                        className="delete-btn"
                        onClick={(e) => deleteTask(task.id, e)}
                        title="Видалити"
                      >
                        <Trash2 size={22} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Subtasks Block */}
              {expandedTasks.has(task.id) && (
                <div className="subtasks-container">
                  {(task.subtasks || []).map(st => (
                    <div key={st.id} className={`subtask-item ${st.completed ? 'completed' : ''}`} onClick={(e) => toggleSubtask(task.id, st.id, e)}>
                      <div className={`dot dot-small ${st.completed ? 'dot-green' : 'dot-red'}`}></div>
                      <span className="task-text">{st.text}</span>
                      <button className="delete-btn sub-delete-btn" onClick={(e) => deleteSubtask(task.id, st.id, e)} title="Видалити підпункт">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <form className="subtask-form" onSubmit={(e) => addSubtask(task.id, e)}>
                    <CornerDownRight size={20} style={{ color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      className="input-glass subtask-input"
                      placeholder="Новий підпункт..."
                      value={newSubtaskTexts[task.id] || ''}
                      onChange={(e) => setNewSubtaskTexts({ ...newSubtaskTexts, [task.id]: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </form>
                </div>
              )}

              {/* Recipe Assistant Block */}
              {activeRecipeTaskId === task.id && (
                <div className="recipe-assistant">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="recipe-header">
                      <Sparkles size={24} />
                      ШІ Шеф-кухар
                    </div>
                    <button className="delete-btn" onClick={() => setActiveRecipeTaskId(null)}><X size={24} /></button>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Введи інгредієнти, які маєш вдома, і я підберу рецепти!
                  </p>

                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Наприклад: картопля, яйця, сир..."
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                  />

                  <button
                    className="btn-primary"
                    onClick={generateRecipe}
                    disabled={isGenerating || !ingredients.trim()}
                  >
                    {isGenerating ? 'Генерую...' : 'Згенерувати рецепт'}
                  </button>

                  {aiResponse && (
                    <div className="ai-recipe-result">
                      {aiResponse}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
