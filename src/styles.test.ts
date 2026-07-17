import { describe, expect, it } from 'vitest';
import styles from './styles.css?raw';

describe('responsive styles', () => {
  it('keeps wrong-question date inputs inside the modal on narrow screens', () => {
    expect(styles).toContain('.date-range-fields');
    expect(styles).toMatch(/\.date-range-fields\s*\{[^}]*min-width:\s*0;/s);
    expect(styles).toMatch(/\.date-range-fields\s*\{[^}]*max-width:\s*100%;/s);
    expect(styles).toMatch(/\.date-range-fields input\[type='date'\]\s*\{[^}]*width:\s*100%;/s);
    expect(styles).toMatch(/\.date-range-fields input\[type='date'\]\s*\{[^}]*min-width:\s*0;/s);
    expect(styles).toMatch(/\.date-range-fields input\[type='date'\]\s*\{[^}]*max-width:\s*100%;/s);
  });

  it('uses a Practice-specific empty state instead of vertically centered status-page', () => {
    expect(styles).toContain('.practice-empty-state');
    expect(styles).toMatch(/\.practice-empty-state h1\s*\{[^}]*font-size:\s*1\.25rem;/s);
  });

  it('allows wrong-elimination feedback headlines to wrap naturally', () => {
    expect(styles).toMatch(/\.answer-panel__headline\s*\{[^}]*white-space:\s*normal;/s);
    expect(styles).toMatch(/\.answer-panel__headline\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(styles).toMatch(/\.elimination-feedback__line\s*\{[^}]*display:\s*block;/s);
  });
});
