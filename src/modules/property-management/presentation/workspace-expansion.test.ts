import { consumePendingExpansions, requestExpandOnNextWorkspaceFocus } from './workspace-expansion';

describe('workspace expansion hints', () => {
  it('returns nothing when no hint was recorded', () => {
    expect(consumePendingExpansions('property-none')).toEqual([]);
  });

  it('returns the requested parent once and then clears it', () => {
    requestExpandOnNextWorkspaceFocus('property-1', 'building');

    expect(consumePendingExpansions('property-1')).toEqual(['building']);
    expect(consumePendingExpansions('property-1')).toEqual([]);
  });

  it('accumulates multiple parents and de-duplicates them', () => {
    requestExpandOnNextWorkspaceFocus('property-2', 'building');
    requestExpandOnNextWorkspaceFocus('property-2', 'building');
    requestExpandOnNextWorkspaceFocus('property-2', 'floor');

    expect([...consumePendingExpansions('property-2')].sort()).toEqual(['building', 'floor']);
  });

  it('keeps properties isolated from each other', () => {
    requestExpandOnNextWorkspaceFocus('property-a', 'a-parent');
    requestExpandOnNextWorkspaceFocus('property-b', 'b-parent');

    expect(consumePendingExpansions('property-a')).toEqual(['a-parent']);
    expect(consumePendingExpansions('property-b')).toEqual(['b-parent']);
  });
});
