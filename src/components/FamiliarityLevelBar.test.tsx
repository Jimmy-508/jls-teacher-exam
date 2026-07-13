import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FamiliarityLevelBar, { familiarityToLevel } from './FamiliarityLevelBar';

describe('FamiliarityLevelBar', () => {
  it.each([
    [-1, 0],
    [0, 0],
    [1, 25],
    [2, 50],
    [3, 75],
    [4, 100],
    [5, 100],
  ])('converts familiarity %s to Lv. %s', (value, expectedLevel) => {
    expect(familiarityToLevel(value)).toBe(expectedLevel);
  });

  it('renders level instead of raw decimal familiarity', () => {
    const html = renderToStaticMarkup(<FamiliarityLevelBar averageFamiliarity={2.4} />);

    expect(html).toContain('Lv. 60');
    expect(html).not.toContain('2.4');
  });

  it('renders true aria level without milestone or ticks', () => {
    const html = renderToStaticMarkup(<FamiliarityLevelBar averageFamiliarity={0.2} />);

    expect(html).toContain('aria-valuenow="5"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('Lv. 5');
    expect(html).not.toContain('距離 Lv.');
    expect(html).not.toContain('還差');
    expect(html).not.toContain('familiarity-level-bar__ticks');
    expect(html).toContain('--level:5');
  });

  it('renders an empty progress fill for Lv. 0 without highest level text for Lv. 100', () => {
    const emptyHtml = renderToStaticMarkup(<FamiliarityLevelBar averageFamiliarity={0} />);
    const fullHtml = renderToStaticMarkup(<FamiliarityLevelBar averageFamiliarity={4} />);

    expect(emptyHtml).toContain('class="is-empty"');
    expect(fullHtml).toContain('Lv. 100');
    expect(fullHtml).not.toContain('已達最高等級');
  });

  it('renders a single shared layout as a progress bar and level only', () => {
    const html = renderToStaticMarkup(<FamiliarityLevelBar averageFamiliarity={1} />);

    expect(html).toContain('class="familiarity-level-bar"');
    expect(html).not.toContain('familiarity-level-bar--compact');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('Lv. 25');
    expect(html).not.toContain('0</span>');
    expect(html).not.toContain('25</span>');
  });
});
