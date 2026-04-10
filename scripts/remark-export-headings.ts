/**
 * A remark plugin that exports the h2 headings of an MDX file as a named
 * `headings` export, similar to how remark-mdx-frontmatter exports frontmatter.
 *
 * Usage in bookDiscovery.ts: `m.headings` on an MDX module.
 */
export function remarkExportHeadings() {
  return (tree: { children: any[] }) => {
    const headings: { title: string }[] = [];

    // Collect top-level h2 headings from the parsed MDX AST
    for (const node of tree.children) {
      if (node.type === 'heading' && node.depth === 2) {
        // Gather text from all inline child nodes (text, inlineCode, etc.)
        const title: string = (node.children as any[])
          .filter((n: any) => n.type === 'text' || n.type === 'inlineCode')
          .map((n: any) => n.value as string)
          .join('')
          .trim();
        if (title) headings.push({ title });
      }
    }

    const elements = headings.map((h) => ({
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          kind: 'init',
          key: { type: 'Identifier', name: 'title' },
          value: { type: 'Literal', value: h.title, raw: JSON.stringify(h.title) },
          method: false,
          shorthand: false,
          computed: false,
        },
      ],
    }));

    // Append an mdxjsEsm node to inject: export const headings = [...];
    // (Same technique as remark-mdx-frontmatter)
    tree.children.push({
      type: 'mdxjsEsm',
      value: `export const headings = ${JSON.stringify(headings)};`,
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ExportNamedDeclaration',
              specifiers: [],
              source: null,
              declaration: {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: 'headings' },
                    init: { type: 'ArrayExpression', elements },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  };
}
