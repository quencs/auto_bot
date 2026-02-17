import { Plus, Clock, SquareX } from 'lucide-react';
import BlockCard from './BlockCard.jsx';

function generateId() {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const BLOCK_TEMPLATES = {
  message: () => ({ id: generateId(), type: 'message', content: '' }),
  delay: () => ({ id: generateId(), type: 'delay', delaySeconds: 5 }),
  action: () => ({
    id: generateId(),
    type: 'action',
    actionMessage: '',
    components: [{ type: 'dropdown', placeholder: '', multiSelect: false, options: [] }],
  }),
};

export default function BlockList({ blocks, roles, emojis, onChange }) {
  function addBlock(type) {
    if (blocks.length >= 20) return;
    onChange([...blocks, BLOCK_TEMPLATES[type]()]);
  }

  function removeBlock(index) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function updateBlock(index, data) {
    const updated = [...blocks];
    updated[index] = data;
    onChange(updated);
  }

  function moveBlock(index, dir) {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    onChange(updated);
  }

  return (
    <div className="ob-block-list">
      {blocks.map((block, i) => (
        <div key={block.id}>
          {i > 0 && <div className="ob-connector" />}
          <BlockCard
            block={block}
            index={i}
            total={blocks.length}
            roles={roles}
            emojis={emojis}
            onUpdate={(data) => updateBlock(i, data)}
            onRemove={() => removeBlock(i)}
            onMove={(dir) => moveBlock(i, dir)}
          />
        </div>
      ))}

      <div className="ob-add-row">
        <button className="btn btn-ghost" onClick={() => addBlock('message')} disabled={blocks.length >= 20}>
          <Plus size={16} color="var(--primary)" />
          Message
        </button>
        <button className="btn btn-ghost" onClick={() => addBlock('delay')} disabled={blocks.length >= 20}>
          <Clock size={16} color="var(--warning)" />
          Delay
        </button>
        <button className="btn btn-ghost" onClick={() => addBlock('action')} disabled={blocks.length >= 20}>
          <SquareX size={16} color="var(--success)" />
          Dropdown
        </button>
      </div>
    </div>
  );
}
