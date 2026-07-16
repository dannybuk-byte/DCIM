/**
 * R-F13: SimpleBuildBadge shows bake-time short SHA, not a runtime clock.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleBuildBadge } from './SimpleBuildBadge';
import { BUILD_COMMIT } from '../generated/buildIdentity';
import { shortBuildCommit } from '../runtime/buildIdentity';

describe('R-F13 SimpleBuildBadge build identity', () => {
  it('displays short SHA from BUILD_COMMIT, not a locale time string', () => {
    const { container } = render(<SimpleBuildBadge />);
    const expected = shortBuildCommit(BUILD_COMMIT);
    const badge = container.querySelector('[data-build-badge="commit"]');
    expect(badge?.textContent).toBe(`build: ${expected}`);
    expect(screen.queryByText(/Loaded:/i)).toBeNull();
    // Locale time strings typically contain ":" with am/pm or 24h digits — reject "Loaded" path above;
    // also ensure we are not rendering a raw Date locale blob as the identity line.
    expect(badge?.textContent).not.toMatch(/Loaded:/);
  });
});
