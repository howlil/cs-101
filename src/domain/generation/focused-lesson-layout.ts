/**
 * Focus contract for a published lesson. This is an authoring-time gate, not a
 * runtime splitter: arbitrary legacy MDX cannot be separated reliably by
 * guessing which prose belongs to a quiz or a project.
 *
 * All published lesson content uses Pedagogy V3 and exactly three owned
 * LessonStage regions. No legacy content-format fallback is retained.
 */
export type FocusedLessonStage = 'understand' | 'practice' | 'evidence';

const stages: readonly FocusedLessonStage[] = ['understand', 'practice', 'evidence'];
const opening = /<LessonStage\b[^>]*\bstage\s*=\s*["'](understand|practice|evidence)["'][^>]*>/g;
const closing = /<\/LessonStage\s*>/g;

/** Strip fenced examples so HTML snippets inside documentation aren't read as components. */
function stripFencedExamples(source: string): string {
  return source.replace(/^(\s*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\2\s*$/gm, '');
}

function occurrences(source: string, name: string): number {
  return [...source.matchAll(new RegExp('<' + name + '(?=[\\s/>])', 'g'))].length;
}

function requireExactlyOnce(
  sections: Readonly<Record<FocusedLessonStage, string>>,
  name: string,
  expectedStage: FocusedLessonStage,
): void {
  for (const stage of stages) {
    const count = occurrences(sections[stage], name);
    const expected = stage === expectedStage ? 1 : 0;
    if (count !== expected) {
      throw new Error(
        name + ' wajib muncul ' + expected + ' kali pada stage ' + stage +
        ' (aktual: ' + count + ').',
      );
    }
  }
}

export function assertFocusedLessonLayout(source: string, itemId: string): void {
  const mdx = stripFencedExamples(source.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, ''));
  const opens = [...mdx.matchAll(opening)];
  const closes = [...mdx.matchAll(closing)];

  if (opens.length !== 3 || closes.length !== 3) {
    throw new Error(
      'Lesson ' + itemId + ' harus memiliki tepat tiga LessonStage: understand, practice, evidence. ' +
      'Gunakan template Pedagogy V3 sebelum publikasi.',
    );
  }
  const sections = {} as Record<FocusedLessonStage, string>;
  let previousEnd = 0;
  for (let i = 0; i < stages.length; i++) {
    const start = opens[i];
    const end = closes[i];
    if (start[1] !== stages[i] || start.index === undefined || end.index === undefined ||
        start.index < previousEnd || end.index < start.index + start[0].length ||
        (i + 1 < stages.length && opens[i + 1].index! < end.index + end[0].length)) {
      throw new Error('Urutan atau nesting LessonStage tidak valid pada ' + itemId + '.');
    }
    const section = mdx.slice(start.index + start[0].length, end.index);
    const outside = mdx.slice(previousEnd, start.index);
    // All visible content must be owned by a stage. Only imports and JavaScript
    // declarations should be left in the frontmatter of the MDX body.
    const forbiddenOutside = /<(?:Quiz|WorkedExample|GuidedPractice|MentalModel|ConceptGraph|LearningSegments|Challenge|ExitCriteria|ProjectContribution|SourceList)\b/;
    if ((i > 0 && outside.trim() !== '') ||
        forbiddenOutside.test(outside) || /^\s*#{1,6}\s+\S/m.test(outside)) {
      throw new Error('Konten pembelajaran berada di luar LessonStage pada ' + itemId + '.');
    }
    sections[stages[i]] = section;
    previousEnd = end.index + end[0].length;
  }
  const trailing = mdx.slice(previousEnd);
  if (trailing.trim() !== '') {
    throw new Error('Konten pembelajaran berada di luar LessonStage pada ' + itemId + '.');
  }

  // Stage ownership is the observable contract of focused navigation.
  requireExactlyOnce(sections, 'MentalModel', 'understand');
  requireExactlyOnce(sections, 'ConceptGraph', 'understand');
  requireExactlyOnce(sections, 'SourceList', 'understand');
  requireExactlyOnce(sections, 'Quiz', 'practice');
  requireExactlyOnce(sections, 'Challenge', 'evidence');
  requireExactlyOnce(sections, 'ExitCriteria', 'evidence');

  // Worked examples and guided practice are rendered inside the canonical
  // V3 LearningSegments component; authored MDX must not reintroduce a
  // parallel direct-rendering path.
  for (const obsolete of ['WorkedExample', 'GuidedPractice']) {
    if (occurrences(mdx, obsolete) > 0) {
      throw new Error(obsolete + ' must be rendered by LearningSegments V3: ' + itemId);
    }
  }

  // Optional bridge remains project-owned when present.
  if (occurrences(mdx, 'ProjectContribution') > 0) {
    requireExactlyOnce(sections, 'ProjectContribution', 'evidence');
  }
}
