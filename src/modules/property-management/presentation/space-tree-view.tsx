import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { Card, palette, spacing } from '../../account/presentation/setup/setup-ui';
import { listItemStyles } from './list-item-styles';
import { SecondaryButton } from './property-ui';
import { spaceTypeEmoji, spaceTypeLabelKey } from './space-emoji';
import { visibleSpaceRows, type FlatSpaceNode } from './space-tree';

interface SpaceTreeViewProps {
  nodes: readonly FlatSpaceNode[];
  isExpanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAddChild: (id: string) => void;
  onEdit: (id: string) => void;
  onArchive: (id: string) => void;
}

/**
 * Read-only expandable hierarchy of the active spaces. Indentation conveys the
 * parent-child relationship, a chevron controls visibility of children (leaves
 * show none, so no misleading control appears), and a compact menu exposes the
 * secondary actions for the tapped space. Expanding never mutates any data.
 */
export function SpaceTreeView({
  nodes,
  isExpanded,
  onToggle,
  onOpen,
  onAddChild,
  onEdit,
  onArchive,
}: SpaceTreeViewProps) {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const rows = visibleSpaceRows(nodes, isExpanded);

  return (
    <>
      {rows.map(({ space, depth, childCount }) => {
        const expanded = isExpanded(space.id);
        const hasChildren = childCount > 0;
        const menuOpen = openMenuId === space.id;
        const childLabel =
          childCount === 1
            ? t('spaces.tree.childOne')
            : t('spaces.tree.childMany', { count: childCount });
        const secondaryLabel = [
          t(spaceTypeLabelKey(space.type)),
          hasChildren ? childLabel : null,
          space.rentable ? t('spaces.tree.rentable') : t('spaces.tree.notRentable'),
        ]
          .filter((part): part is string => part !== null)
          .join(' · ');

        return (
          <View
            key={space.id}
            style={[treeStyles.container, { marginLeft: depth * spacing.m }]}
          >
            <Card style={treeStyles.row}>
              {hasChildren ? (
                <Pressable
                  onPress={() => onToggle(space.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${
                    expanded ? t('spaces.tree.collapse') : t('spaces.tree.expand')
                  } ${space.name}`}
                  style={({ pressed }) => [treeStyles.control, pressed && treeStyles.pressed]}
                >
                  <Text style={treeStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
                </Pressable>
              ) : (
                <View style={treeStyles.control} />
              )}

              <Pressable
                onPress={() => onOpen(space.id)}
                accessibilityRole="button"
                accessibilityLabel={space.name}
                style={({ pressed }) => [treeStyles.main, pressed && treeStyles.pressed]}
              >
                <Text style={treeStyles.emoji}>{spaceTypeEmoji(space.type)}</Text>
                <View style={treeStyles.body}>
                  <Text style={listItemStyles.name}>{space.name}</Text>
                  <Text style={listItemStyles.address}>{secondaryLabel}</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setOpenMenuId(menuOpen ? null : space.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t('spaces.tree.menu')} ${space.name}`}
                style={({ pressed }) => [treeStyles.control, pressed && treeStyles.pressed]}
              >
                <Text style={treeStyles.menuDots}>⋮</Text>
              </Pressable>
            </Card>

            {menuOpen ? (
              <View style={treeStyles.menu}>
                <SecondaryButton
                  title={t('spaces.action.open')}
                  onPress={() => {
                    setOpenMenuId(null);
                    onOpen(space.id);
                  }}
                />
                <SecondaryButton
                  title={t('spaces.action.edit')}
                  onPress={() => {
                    setOpenMenuId(null);
                    onEdit(space.id);
                  }}
                />
                <SecondaryButton
                  title={t('spaces.action.addChild')}
                  onPress={() => {
                    setOpenMenuId(null);
                    onAddChild(space.id);
                  }}
                />
                <SecondaryButton
                  title={t('spaces.action.archive')}
                  onPress={() => {
                    setOpenMenuId(null);
                    onArchive(space.id);
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

const treeStyles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.s,
  },
  control: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primary,
  },
  menuDots: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.textMuted,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  emoji: {
    fontSize: 24,
  },
  body: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  menu: {
    gap: spacing.s,
    paddingLeft: spacing.s,
  },
});
