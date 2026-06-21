import { describe, it, expect } from 'vitest';
import { toggleReaction, summarize, attachReactions } from '../reactionStore';

describe('reactionStore', () => {
  it('agrega, acumula y togglea reacciones por usuario', () => {
    const m = 'msg-1';
    expect(toggleReaction(m, '🔥', 'u1')).toEqual({ '🔥': ['u1'] });
    expect(toggleReaction(m, '🔥', 'u2')).toEqual({ '🔥': ['u1', 'u2'] });
    // u1 togglea: se quita
    expect(toggleReaction(m, '🔥', 'u1')).toEqual({ '🔥': ['u2'] });
    // u2 togglea: emoji desaparece
    expect(toggleReaction(m, '🔥', 'u2')).toEqual({});
  });

  it('soporta varios emojis en el mismo mensaje', () => {
    const m = 'msg-2';
    toggleReaction(m, '❤️', 'u1');
    toggleReaction(m, '😂', 'u1');
    expect(summarize(m)).toEqual({ '❤️': ['u1'], '😂': ['u1'] });
  });

  it('attachReactions adjunta el resumen a cada mensaje', () => {
    const m = 'msg-3';
    toggleReaction(m, '👍', 'u9');
    const out = attachReactions([{ id: 'msg-3', content: 'x' }, { id: 'sin-react', content: 'y' }]);
    expect(out[0].reactions).toEqual({ '👍': ['u9'] });
    expect(out[1].reactions).toEqual({});
  });
});
