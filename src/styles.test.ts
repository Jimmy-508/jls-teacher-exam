// @ts-ignore - Vitest runs this assertion file in Node, but the app tsconfig does not include Node types.
import { readFileSync } from 'node:fs';
// @ts-ignore - Vitest runs this assertion file in Node, but the app tsconfig does not include Node types.
import { resolve } from 'node:path';
declare const __dirname: string;
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, 'styles.css'), 'utf8');

function getCssBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(escapedSelector + '\\s*\\{([^}]*)\\}', 's'));

  return match?.[1] ?? '';
}
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

  it('defines gradient appearance themes for rainbow candy and aurora', () => {
    expect(styles).toContain("html[data-jls-theme='rainbow-candy']");
    expect(styles).toContain("html[data-jls-theme='aurora']");
    expect(styles).toContain('#FF5A67');
    expect(styles).toContain('#FFAE42');
    expect(styles).toContain('#FFE066');
    expect(styles).toContain('#43C978');
    expect(styles).toContain('#55A7FF');
    expect(styles).toContain('#9B6EF3');
    expect(styles).toContain('#43D6C6');
    expect(styles).toContain('#42B9E8');
    expect(styles).toContain('#5D9CFA');
    expect(styles).toContain('#9B7BF5');
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\][\s\S]*--color-primary-gradient:\s*linear-gradient/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\][\s\S]*--color-primary-gradient:\s*linear-gradient/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\][\s\S]*--button-background:\s*var\(--color-primary-gradient\);/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\] \.progress__fill/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\][\s\S]*--button-background:\s*var\(--color-primary-gradient\);/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\] \.progress__fill/);
    expect(styles).toMatch(/\.appearance-option__selected\s*\{[^}]*visibility:\s*hidden;/s);
    expect(styles).toMatch(/\.appearance-option\[aria-pressed='true'\] \.appearance-option__selected\s*\{[^}]*visibility:\s*visible;/s);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\][\s\S]*--theme-glow-duration:\s*12s;/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\][\s\S]*--theme-glow-scale:\s*1\.02;/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\][\s\S]*--theme-glow-opacity-min:\s*0\.16;/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\][\s\S]*--theme-glow-opacity-max:\s*0\.2;/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\][\s\S]*--theme-glow-duration:\s*15s;/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\][\s\S]*--theme-glow-scale:\s*1\.03;/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\][\s\S]*--theme-glow-opacity-min:\s*0\.12;/);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\][\s\S]*--theme-glow-opacity-max:\s*0\.18;/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\] \.app-shell,\s*html\[data-jls-theme='aurora'\] \.app-shell\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*hidden;[^}]*isolation:\s*isolate;/s);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\] \.app-shell::before,\s*html\[data-jls-theme='aurora'\] \.app-shell::before\s*\{[^}]*animation:\s*theme-glow-breathe var\(--theme-glow-duration\) ease-in-out infinite;/s);
    expect(styles).toMatch(/@keyframes theme-glow-breathe\s*\{[\s\S]*opacity:\s*var\(--theme-glow-opacity-min\);[\s\S]*transform:\s*scale\(1\);[\s\S]*opacity:\s*var\(--theme-glow-opacity-max\);[\s\S]*transform:\s*scale\(var\(--theme-glow-scale\)\);/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*html\[data-jls-theme='rainbow-candy'\] \.app-shell::before,[\s\S]*html\[data-jls-theme='aurora'\] \.app-shell::before\s*\{[\s\S]*animation:\s*none;[\s\S]*opacity:\s*var\(--theme-glow-opacity-min\);[\s\S]*transform:\s*scale\(1\);/);
    for (const theme of ['starry-blue', 'tech-purple', 'warm-sand', 'sakura-pink', 'graphite']) {
      expect(styles).not.toContain(`html[data-jls-theme='${theme}'] .app-shell::before`);
      expect(getCssBlock(`html[data-jls-theme='${theme}']`)).not.toMatch(/--theme-glow-|animation/);
    }
  });


  it('keeps shared primary-button hover behavior and adds light sweeps only to gradient themes', () => {
    const primaryButton = getCssBlock('.primary-button');
    const primaryHover = getCssBlock('.primary-button:hover');
    const secondaryButton = getCssBlock('.secondary-button');
    const secondaryHover = getCssBlock('.secondary-button:hover');
    const rainbowButton = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button");
    const specialtyButton = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button,\nhtml[data-jls-theme='aurora'] .primary-button");
    const lightBandBase = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button::before,\nhtml[data-jls-theme='aurora'] .primary-button::before");
    const rainbowLightBand = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button::before");
    const auroraLightBand = getCssBlock("html[data-jls-theme='aurora'] .primary-button::before");
    const lightBandHover = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button:hover:not(:disabled)::before,\nhtml[data-jls-theme='aurora'] .primary-button:hover:not(:disabled)::before");
    const rainbowHover = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button:not(:disabled):hover");
    const auroraHover = getCssBlock("html[data-jls-theme='aurora'] .primary-button:not(:disabled):hover");
    const specialtyActive = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button:not(:disabled):active,\nhtml[data-jls-theme='aurora'] .primary-button:not(:disabled):active");
    const specialtyDisabled = getCssBlock("html[data-jls-theme='rainbow-candy'] .primary-button:disabled,\nhtml[data-jls-theme='rainbow-candy'] .primary-button:disabled:hover,\nhtml[data-jls-theme='aurora'] .primary-button:disabled,\nhtml[data-jls-theme='aurora'] .primary-button:disabled:hover");
    const focusVisible = getCssBlock('.primary-button:focus-visible,\n.secondary-button:focus-visible,\n.library-action-button:focus-visible,\n.appearance-theme-card__summary:focus-visible,\n.appearance-option:focus-visible');
    const rainbowTheme = getCssBlock("html[data-jls-theme='rainbow-candy']");
    const auroraTheme = getCssBlock("html[data-jls-theme='aurora']");
    const specialtyLightRules = [specialtyButton, lightBandBase, rainbowLightBand, auroraLightBand, lightBandHover].join('\n');

    expect(styles).not.toMatch(/transition:\s*all/i);
    expect(styles).not.toMatch(/!important/i);
    expect(primaryButton).toMatch(/transition:\s*[^}]*transform 0\.16s ease,[^}]*background 0\.16s ease;/s);
    expect(styles).toMatch(/\.primary-button\s*\{[^}]*background:\s*var\(--button-background\);/s);
    expect(primaryHover).toMatch(/background:\s*#155347;/i);
    expect(styles).toMatch(/\.primary-button:hover\s*\{[^}]*background:\s*var\(--button-background-hover\);/s);
    expect(primaryHover).toMatch(/transform:\s*translateY\(-1px\);/);
    expect(primaryHover).not.toMatch(/(?:opacity|filter|box-shadow|width|height|padding|border-width|margin|position|scale|background-position|background-size)\s*:/i);
    expect(secondaryButton).not.toMatch(/transition:\s*none;/);
    expect(secondaryHover).toBe('');
    expect(rainbowButton).toMatch(/color:\s*#321E38;/i);
    expect(specialtyButton).toMatch(/position:\s*relative;/);
    expect(specialtyButton).toMatch(/overflow:\s*hidden;/);
    expect(specialtyButton).toMatch(/isolation:\s*isolate;/);
    expect(lightBandBase).toMatch(/content:\s*'';/);
    expect(lightBandBase).toMatch(/position:\s*absolute;/);
    expect(lightBandBase).toMatch(/top:\s*-30%;/);
    expect(lightBandBase).toMatch(/bottom:\s*-30%;/);
    expect(lightBandBase).toMatch(/left:\s*-45%;/);
    expect(lightBandBase).toMatch(/width:\s*32%;/);
    expect(lightBandBase).toMatch(/transform:\s*translateX\(-220%\) skewX\(-18deg\);/);
    expect(lightBandBase).toMatch(/transition:\s*transform 0\.48s ease;/);
    expect(lightBandBase).toMatch(/pointer-events:\s*none;/);
    expect(styles).toMatch(/html\[data-jls-theme='rainbow-candy'\] \.primary-button::before\s*\{[^}]*background:\s*linear-gradient\([^}]*rgba\(255, 255, 255, 0\.42\)/s);
    expect(styles).toMatch(/html\[data-jls-theme='aurora'\] \.primary-button::before\s*\{[^}]*background:\s*linear-gradient\([^}]*rgba\(255, 255, 255, 0\.5\)/s);
    expect(lightBandHover).toMatch(/transform:\s*translateX\(520%\) skewX\(-18deg\);/);
    expect(rainbowHover).toBe('');
    expect(auroraHover).toBe('');
    expect(specialtyActive).toBe('');
    expect(specialtyDisabled).toBe('');
    expect(specialtyLightRules).not.toMatch(/animation:\s*[^;]*infinite/i);
    expect(specialtyLightRules).not.toMatch(/background-size\s*:/i);
    expect(specialtyLightRules).not.toMatch(/background-position\s*:/i);
    expect(specialtyLightRules).not.toMatch(/filter\s*:/i);
    expect(specialtyLightRules).not.toMatch(/scale\s*\(/i);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*html\[data-jls-theme='rainbow-candy'\] \.primary-button::before,[\s\S]*html\[data-jls-theme='aurora'\] \.primary-button::before\s*\{[\s\S]*transition:\s*none;/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*html\[data-jls-theme='rainbow-candy'\] \.primary-button:hover:not\(:disabled\)::before,[\s\S]*html\[data-jls-theme='aurora'\] \.primary-button:hover:not\(:disabled\)::before\s*\{[\s\S]*transform:\s*translateX\(-220%\) skewX\(-18deg\);/);
    expect(styles).not.toContain('--color-primary-gradient-hover');
    expect(focusVisible).toMatch(/outline:\s*3px solid/);
    expect(focusVisible).toMatch(/outline-offset:\s*2px/);
    expect(getCssBlock('.secondary-button:disabled')).toMatch(/cursor:\s*default;/);
    expect(rainbowTheme).toMatch(/--color-primary-gradient:\s*linear-gradient\(90deg, #FF5A67 0%, #FFAE42 20%, #FFE066 40%, #43C978 60%, #55A7FF 80%, #9B6EF3 100%\);/);
    expect(auroraTheme).toMatch(/--color-primary-gradient:\s*linear-gradient\(90deg, #43D6C6 0%, #42B9E8 38%, #5D9CFA 68%, #9B7BF5 100%\);/);
    expect(rainbowTheme).toMatch(/--button-background:\s*var\(--color-primary-gradient\);/);
    expect(rainbowTheme).toMatch(/--button-background-hover:\s*var\(--color-primary-gradient\);/);
    expect(auroraTheme).toMatch(/--button-background:\s*var\(--color-primary-gradient\);/);
    expect(auroraTheme).toMatch(/--button-background-hover:\s*var\(--color-primary-gradient\);/);
    for (const theme of ['starry-blue', 'tech-purple', 'warm-sand', 'sakura-pink', 'graphite']) {
      expect(styles).not.toContain(`html[data-jls-theme='${theme}'] .primary-button::before`);
      expect(getCssBlock(`html[data-jls-theme='${theme}']`)).not.toMatch(/--button-background|--button-background-hover|background-size|background-position|filter 0\.18s ease|box-shadow 0\.22s ease/);
    }
  });
  it('keeps the Practice search controls on one row on narrow screens', () => {
    expect(styles).toMatch(/\.practice-search-field__control\s*\{[^}]*flex-wrap:\s*nowrap;/s);
    expect(styles).toMatch(/@media \(max-width: 520px\)\s*\{[^}]*\.practice-search-field__control\s*\{[^}]*flex-wrap:\s*nowrap;/s);
    expect(styles).toMatch(/\.practice-search-field__label\s*\{[^}]*white-space:\s*nowrap;/s);
    expect(styles).toMatch(/\.practice-search-field__input-wrap\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-width:\s*0;/s);
    expect(styles).toMatch(/\.practice-search-field__input-icon\s*\{[^}]*pointer-events:\s*none;/s);
    expect(styles).not.toMatch(/\.practice-search-field__control\s*\{[^}]*flex-direction:\s*column;/s);
  });
});
