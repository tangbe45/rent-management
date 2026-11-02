import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  palette,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { Property } from '../domain/property';
import type { PropertySpace } from '../domain/property-space';
import { listItemStyles } from './list-item-styles';
import { SecondaryButton, TextLink } from './property-ui';
import { flattenSpaceTree } from './space-tree';
import { SpaceTreeView } from './space-tree-view';
import { summarizeActiveSpaces } from './workspace-summary';

interface PropertyWorkspaceProps {
  property: Property;
  spaces: readonly PropertySpace[];
  expandedSpaceIds: ReadonlySet<string>;
  error?: string;
  onToggleSpace: (id: string) => void;
  onOpenSpace: (id: string) => void;
  onAddChildSpace: (id: string) => void;
  onEditSpace: (id: string) => void;
  onArchiveSpace: (id: string) => void;
  onAddSpace: () => void;
  onOpenArchivedSpaces: () => void;
  onOpenDetails: () => void;
  onEditProperty: () => void;
  onArchiveProperty: () => void;
  onRestoreProperty: () => void;
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={workspaceStyles.stat}>
      <Text style={workspaceStyles.statValue}>{value}</Text>
      <Text style={workspaceStyles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Primary management screen for a single property: heading, space summary,
 * expandable active-space tree and the property's secondary actions. Property
 * details and editing remain available through the header menu; archived spaces
 * live in their own secondary view. Counters are derived from persisted spaces.
 */
export function PropertyWorkspace({
  property,
  spaces,
  expandedSpaceIds,
  error,
  onToggleSpace,
  onOpenSpace,
  onAddChildSpace,
  onEditSpace,
  onArchiveSpace,
  onAddSpace,
  onOpenArchivedSpaces,
  onOpenDetails,
  onEditProperty,
  onArchiveProperty,
  onRestoreProperty,
}: PropertyWorkspaceProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeSpaces = spaces.filter((space) => space.isActive);
  const summary = summarizeActiveSpaces(spaces);
  const nodes = flattenSpaceTree(activeSpaces);
  const isExpanded = (id: string) => expandedSpaceIds.has(id);

  return (
    <KeyboardSafeContainer>
      <View style={workspaceStyles.header}>
        <Text style={workspaceStyles.headerEmoji}>{conceptEmoji.properties}</Text>
        <View style={workspaceStyles.headerBody}>
          <Text style={workspaceStyles.headerName}>{property.name}</Text>
          <Text style={styles.subtitle}>{property.address}</Text>
        </View>
        <Pressable
          onPress={() => setMenuOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={t('workspace.menu.label')}
          style={({ pressed }) => [workspaceStyles.menuButton, pressed && workspaceStyles.pressed]}
        >
          <Text style={workspaceStyles.menuDots}>⋮</Text>
        </Pressable>
      </View>

      {menuOpen ? (
        <Card>
          <SecondaryButton title={t('workspace.menu.information')} onPress={onOpenDetails} />
          <SecondaryButton title={t('workspace.menu.edit')} onPress={onEditProperty} />
          {property.isArchived ? (
            <SecondaryButton title={t('properties.action.restore')} onPress={onRestoreProperty} />
          ) : (
            <SecondaryButton title={t('properties.action.archive')} onPress={onArchiveProperty} />
          )}
        </Card>
      ) : null}

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      <View style={workspaceStyles.summaryRow}>
        <SummaryStat value={summary.activeSpaces} label={t('workspace.summary.activeSpaces')} />
        <SummaryStat value={summary.rentableSpaces} label={t('workspace.summary.rentable')} />
        <SummaryStat value={summary.topLevelSpaces} label={t('workspace.summary.topLevel')} />
      </View>

      <Text style={workspaceStyles.sectionTitle}>
        {`${conceptEmoji.tree} ${t('workspace.spacesHeading')}`}
      </Text>

      {nodes.length === 0 ? (
        <Card>
          <Text style={listItemStyles.name}>{t('workspace.empty.title')}</Text>
          <Text style={listItemStyles.address}>{t('workspace.empty.body')}</Text>
          <PrimaryButton title={t('workspace.addFirstSpace')} onPress={onAddSpace} />
        </Card>
      ) : (
        <>
          <SpaceTreeView
            nodes={nodes}
            isExpanded={isExpanded}
            onToggle={onToggleSpace}
            onOpen={onOpenSpace}
            onAddChild={onAddChildSpace}
            onEdit={onEditSpace}
            onArchive={onArchiveSpace}
          />
          <PrimaryButton title={t('spaces.list.add')} onPress={onAddSpace} />
        </>
      )}

      <TextLink title={t('spaces.archived.open')} onPress={onOpenArchivedSpaces} />
    </KeyboardSafeContainer>
  );
}

const workspaceStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerBody: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  menuDots: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.textMuted,
  },
  pressed: {
    opacity: 0.6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  stat: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.primary,
  },
  statLabel: {
    fontSize: 12,
    color: palette.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
});
