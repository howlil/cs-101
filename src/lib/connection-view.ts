import type { CurriculumGraph } from '../domain/curriculum-v2/graph';
import { getConnectionGroups, itemHref } from '../domain/curriculum-v2/selectors';
import { connectionLabels } from './learning-language';

// Single presentation mapper for lesson, project and integration routes.
export function connectionGroupsForUI(graph: CurriculumGraph, itemId: string) {
  const groups = getConnectionGroups(graph, itemId);
  const sections = [
    [connectionLabels.requires, groups.requires],
    [connectionLabels.usedLaterBy, groups.usedLaterBy],
    [connectionLabels.related, groups.related],
    [connectionLabels.deepDive, groups.deepDive],
    [connectionLabels.builtOnFoundation, groups.builtOnFoundation],
    [connectionLabels.foundationFor, groups.foundationFor],
    [connectionLabels.contributesTo, groups.contributesTo],
  ] as const;

  return sections.filter(([, entries]) => entries.length > 0).map(([label, entries]) => ({
    label,
    items: entries.map(({ item }) => ({
      id: item.id, title: item.title, href: itemHref(graph, item.id),
    })),
  }));
}
