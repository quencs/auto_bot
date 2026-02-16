import { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import './EmojiPicker.css';

// Category icons mapping
const CATEGORY_ICONS = {
  people: '😀',
  nature: '🌿',
  foods: '🍔',
  activity: '⚽',
  places: '✈️',
  objects: '💡',
  symbols: '❤️',
  flags: '🏁',
};

const CATEGORY_NAMES = {
  people: 'Smileys & People',
  nature: 'Animals & Nature',
  foods: 'Food & Drink',
  activity: 'Activity',
  places: 'Travel & Places',
  objects: 'Objects',
  symbols: 'Symbols',
  flags: 'Flags',
};

function emojiUrl(emoji) {
  const ext = emoji.animated ? 'gif' : 'png';
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=32`;
}

export default function EmojiPicker({ value, onChange, customEmojis = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('people');
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function handleEmojiSelect(emoji, isCustom = false) {
    if (isCustom) {
      onChange({ id: emoji.id, name: emoji.name, unicode: null });
    } else {
      onChange({ id: null, name: null, unicode: emoji });
    }
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleClear() {
    onChange(null);
    setIsOpen(false);
  }

  // Get display value
  let displayEmoji = null;
  if (value) {
    if (value.id) {
      // Custom emoji
      const custom = customEmojis.find((e) => e.id === value.id);
      if (custom) {
        displayEmoji = <img src={emojiUrl(custom)} alt={custom.name} className="emoji-display" />;
      }
    } else if (value.unicode) {
      // Unicode emoji
      displayEmoji = <span className="emoji-display">{value.unicode}</span>;
    }
  }

  // Filter emojis by search
  const query = searchQuery.toLowerCase().trim();

  let filteredEmojis = [];
  let filteredCustomEmojis = customEmojis;

  if (query) {
    // Search in unicode emojis
    Object.entries(data.emojis).forEach(([id, emoji]) => {
      const keywords = emoji.keywords || [];
      const name = emoji.name.toLowerCase();
      const searchText = [name, ...keywords].join(' ');

      if (searchText.includes(query)) {
        filteredEmojis.push({
          id,
          native: emoji.skins[0].native,
          name: emoji.name,
        });
      }
    });

    // Search in custom emojis
    filteredCustomEmojis = customEmojis.filter((e) =>
      e.name.toLowerCase().includes(query)
    );
  } else {
    // Get emojis for active category
    const category = data.categories.find((cat) => cat.id === activeCategory);
    if (category) {
      filteredEmojis = category.emojis.map((emojiId) => {
        const emoji = data.emojis[emojiId];
        return {
          id: emojiId,
          native: emoji.skins[0].native,
          name: emoji.name,
        };
      });
    }
  }

  const showCustom = customEmojis.length > 0 && (!query || filteredCustomEmojis.length > 0);
  const categories = customEmojis.length > 0 ? ['custom', ...data.categories.map((c) => c.id)] : data.categories.map((c) => c.id);

  return (
    <div className="emoji-picker-container" ref={pickerRef}>
      <button
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Select emoji"
      >
        {displayEmoji || (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="emoji-picker-popup">
          <div className="emoji-picker-search">
            <input
              type="text"
              placeholder="Search emoji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {!query && (
            <div className="emoji-picker-categories">
              {showCustom && (
                <button
                  className={activeCategory === 'custom' ? 'active' : ''}
                  onClick={() => setActiveCategory('custom')}
                  title="Custom"
                >
                  🎨
                </button>
              )}
              {data.categories.map((cat) => (
                <button
                  key={cat.id}
                  className={activeCategory === cat.id ? 'active' : ''}
                  onClick={() => setActiveCategory(cat.id)}
                  title={CATEGORY_NAMES[cat.id] || cat.id}
                >
                  {CATEGORY_ICONS[cat.id] || '📁'}
                </button>
              ))}
            </div>
          )}

          <div className="emoji-picker-grid">
            {query && showCustom && filteredCustomEmojis.length > 0 && (
              <>
                {filteredCustomEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    type="button"
                    className="emoji-item"
                    onClick={() => handleEmojiSelect(emoji, true)}
                    title={`:${emoji.name}:`}
                  >
                    <img src={emojiUrl(emoji)} alt={emoji.name} />
                  </button>
                ))}
              </>
            )}

            {!query && activeCategory === 'custom' && showCustom ? (
              <>
                {filteredCustomEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    type="button"
                    className="emoji-item"
                    onClick={() => handleEmojiSelect(emoji, true)}
                    title={`:${emoji.name}:`}
                  >
                    <img src={emojiUrl(emoji)} alt={emoji.name} />
                  </button>
                ))}
              </>
            ) : (
              <>
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    type="button"
                    className="emoji-item"
                    onClick={() => handleEmojiSelect(emoji.native)}
                    title={emoji.name}
                  >
                    {emoji.native}
                  </button>
                ))}
              </>
            )}

            {query && filteredEmojis.length === 0 && filteredCustomEmojis.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No emoji found
              </div>
            )}
          </div>

          {displayEmoji && (
            <div className="emoji-picker-footer">
              <button type="button" className="btn-clear-emoji" onClick={handleClear}>
                Clear emoji
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
