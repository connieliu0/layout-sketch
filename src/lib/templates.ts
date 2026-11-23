import type { FrameNode, Size } from './types';

// --- Starter layouts --------------------------------------------------------
//
// Ready-made subtrees the user can drop into the selected frame. Each template
// is built fresh on every call (ids are placeholders; the store re-ids them on
// insert), so inserting the same template twice never shares nodes.

export interface Template {
  id: string;
  name: string;
  description: string;
  build: () => FrameNode;
}

export interface TemplateCategory {
  name: string;
  templates: Template[];
}

// Size shorthands: a number means fixed px, otherwise 'fill' or 'hug'.
type S = number | 'fill' | 'hug';
function size(s: S): Size {
  return typeof s === 'number' ? { mode: 'fixed', value: s } : { mode: s };
}

interface Opts {
  dir?: 'row' | 'column';
  w?: S;
  h?: S;
  pad?: number;
  gap?: number;
  align?: FrameNode['align'];
  justify?: FrameNode['justify'];
  text?: string;
}

// Build a frame. Defaults: row, fill width, hug height, no spacing.
function f(name: string, o: Opts = {}, children: FrameNode[] = []): FrameNode {
  return {
    id: name,
    name,
    type: 'frame',
    direction: o.dir ?? 'row',
    width: size(o.w ?? 'fill'),
    height: size(o.h ?? 'hug'),
    padding: o.pad ?? 0,
    gap: o.gap ?? 0,
    align: o.align ?? 'stretch',
    justify: o.justify ?? 'start',
    text: o.text,
    children,
  };
}

// A leaf box with centered text.
function box(name: string, text: string, o: Opts = {}): FrameNode {
  // Text boxes should hug their content by default. This keeps labels in every
  // starter template from being squeezed/clipped by a sibling or a narrow
  // fill-sized text box. Callers can still opt into fill or a fixed width.
  return f(name, {
    align: 'center',
    justify: 'center',
    pad: 8,
    w: text ? 'hug' : 'fill',
    text: text || undefined,
    ...o,
  });
}

function repeat(n: number, make: (i: number) => FrameNode): FrameNode[] {
  return Array.from({ length: n }, (_, i) => make(i + 1));
}

// --- reusable pieces ----------------------------------------------------------

function topNav(): FrameNode {
  return f('nav', { h: 64, pad: 12, gap: 16, align: 'center', justify: 'between' }, [
    box('logo', 'Logo', { w: 120, h: 'fill' }),
    f('links', { w: 'hug', h: 'fill', gap: 8, align: 'center' },
      ['Home', 'Product', 'Pricing', 'About'].map((t) =>
        box(`link-${t.toLowerCase()}`, t, { w: 88, h: 'fill' }),
      ),
    ),
    f('actions', { w: 'hug', h: 'fill', gap: 8, align: 'center' }, [
      box('sign-in', 'Sign in', { w: 88, h: 'fill' }),
      box('cta', 'Get started', { w: 120, h: 'fill' }),
    ]),
  ]);
}

function sideNav(): FrameNode {
  return f('sidebar', { dir: 'column', w: 240, h: 'fill', pad: 16, gap: 8 }, [
    box('brand', 'Brand', { h: 48 }),
    ...['Dashboard', 'Projects', 'Team', 'Reports', 'Settings'].map((t) =>
      box(`nav-${t.toLowerCase()}`, t, { h: 40, justify: 'start' }),
    ),
  ]);
}

function footer(): FrameNode {
  return f('footer', { h: 80, pad: 16, gap: 16, align: 'center', justify: 'between' }, [
    box('copyright', '© Company', { w: 200, h: 'fill' }),
    f('footer-links', { w: 'hug', h: 'fill', gap: 8 },
      ['Privacy', 'Terms', 'Contact'].map((t) =>
        box(`footer-${t.toLowerCase()}`, t, { w: 88, h: 'fill' }),
      ),
    ),
  ]);
}

function statCards(): FrameNode {
  return f('stats', { h: 120, gap: 16 },
    ['Revenue', 'Users', 'Orders', 'Growth'].map((t) =>
      f(`stat-${t.toLowerCase()}`, { dir: 'column', w: 'fill', h: 'fill', pad: 16, gap: 8 }, [
        box(`${t.toLowerCase()}-label`, t, { h: 24, justify: 'start' }),
        box(`${t.toLowerCase()}-value`, '1,234', { h: 'fill', justify: 'start' }),
      ]),
    ),
  );
}

function table(rows = 5): FrameNode {
  const cols = ['Name', 'Status', 'Owner', 'Date'];
  const row = (name: string, cells: string[]) =>
    f(name, { h: 44, gap: 8, pad: 4 },
      cells.map((c, i) => box(`${name}-c${i + 1}`, c, { w: 'fill', h: 'fill', justify: 'start' })),
    );
  return f('table', { dir: 'column', h: 'hug', pad: 8, gap: 4 }, [
    row('table-head', cols),
    ...repeat(rows, (i) => row(`row-${i}`, cols.map((c) => `${c} ${i}`))),
  ]);
}

function card(i: number): FrameNode {
  return f(`card-${i}`, { dir: 'column', w: 'fill', h: 'fill', pad: 12, gap: 8 }, [
    box(`card-${i}-image`, 'Image', { h: 'fill' }),
    box(`card-${i}-title`, `Card ${i}`, { h: 32, justify: 'start' }),
    box(`card-${i}-meta`, 'Description', { h: 24, justify: 'start' }),
  ]);
}

function field(name: string, label: string): FrameNode {
  return f(name, { dir: 'column', gap: 6 }, [
    box(`${name}-label`, label, { h: 24, justify: 'start', pad: 0 }),
    box(`${name}-input`, '', { h: 40 }),
  ]);
}

// --- the catalog --------------------------------------------------------------

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    name: 'Page shells',
    templates: [
      {
        id: 'app-shell',
        name: 'App shell',
        description: 'Sidebar navigation, top bar, and a main content area.',
        build: () =>
          f('app-shell', { w: 'fill', h: 'fill', gap: 16 }, [
            sideNav(),
            f('main', { dir: 'column', w: 'fill', h: 'fill', gap: 16 }, [
              f('topbar', { h: 56, pad: 8, gap: 8, align: 'center', justify: 'between' }, [
                box('page-title', 'Page title', { w: 240, h: 'fill', justify: 'start' }),
                box('search', 'Search', { w: 280, h: 'fill' }),
              ]),
              box('content', 'Content', { h: 'fill' }),
            ]),
          ]),
      },
      {
        id: 'website',
        name: 'Website page',
        description: 'Top nav, content body, and footer stacked vertically.',
        build: () =>
          f('website', { dir: 'column', w: 'fill', h: 'fill', gap: 16 }, [
            topNav(),
            box('body', 'Content', { h: 'fill' }),
            footer(),
          ]),
      },
      {
        id: 'holy-grail',
        name: 'Holy grail',
        description: 'Header, left nav, main, right aside, footer.',
        build: () =>
          f('holy-grail', { dir: 'column', w: 'fill', h: 'fill', gap: 16 }, [
            box('header', 'Header', { h: 64 }),
            f('middle', { w: 'fill', h: 'fill', gap: 16 }, [
              box('left-nav', 'Nav', { w: 200, h: 'fill' }),
              box('main', 'Main', { w: 'fill', h: 'fill' }),
              box('aside', 'Aside', { w: 280, h: 'fill' }),
            ]),
            box('footer', 'Footer', { h: 64 }),
          ]),
      },
      {
        id: 'split',
        name: 'Split screen',
        description: 'Two equal halves — great for sign-up or marketing pages.',
        build: () =>
          f('split', { w: 'fill', h: 'fill', gap: 0 }, [
            box('left', 'Visual', { w: 'fill', h: 'fill' }),
            box('right', 'Content', { w: 'fill', h: 'fill' }),
          ]),
      },
      {
        id: 'centered',
        name: 'Centered column',
        description: 'A single narrow column centered on the page (docs, blog).',
        build: () =>
          f('centered', { dir: 'column', w: 'fill', h: 'fill', align: 'center', pad: 24 }, [
            f('column', { dir: 'column', w: 720, h: 'fill', gap: 16 }, [
              box('title', 'Title', { h: 64, justify: 'start' }),
              box('body', 'Body', { h: 'fill' }),
            ]),
          ]),
      },
    ],
  },
  {
    name: 'Navigation',
    templates: [
      {
        id: 'top-nav',
        name: 'Top nav bar',
        description: 'Logo, links, and actions spread across a bar.',
        build: topNav,
      },
      {
        id: 'side-nav',
        name: 'Sidebar nav',
        description: 'Vertical list of navigation items.',
        build: sideNav,
      },
      {
        id: 'tabs',
        name: 'Tabs',
        description: 'A row of tabs above a panel.',
        build: () =>
          f('tabs', { dir: 'column', h: 'fill', gap: 8 }, [
            f('tab-bar', { h: 44, gap: 4 },
              repeat(4, (i) => box(`tab-${i}`, `Tab ${i}`, { w: 120, h: 'fill' })),
            ),
            box('tab-panel', 'Panel', { h: 'fill' }),
          ]),
      },
      {
        id: 'footer',
        name: 'Footer',
        description: 'Copyright on the left, links on the right.',
        build: footer,
      },
    ],
  },
  {
    name: 'Marketing',
    templates: [
      {
        id: 'hero',
        name: 'Hero',
        description: 'Headline, subtext, and call-to-action buttons, centered.',
        build: () =>
          f('hero', { dir: 'column', h: 480, pad: 48, gap: 16, align: 'center', justify: 'center' }, [
            box('headline', 'Headline', { w: 720, h: 80 }),
            box('subhead', 'Supporting text', { w: 560, h: 48 }),
            f('hero-actions', { w: 'hug', gap: 12 }, [
              box('primary', 'Primary', { w: 'hug', h: 'hug' }),
              box('secondary', 'Secondary', { w: 'hug', h: 'hug' }),
            ]),
          ]),
      },
      {
        id: 'hero-split',
        name: 'Hero with image',
        description: 'Text and buttons on the left, image on the right.',
        build: () =>
          f('hero', { h: 480, pad: 48, gap: 48, align: 'center' }, [
            f('hero-text', { dir: 'column', w: 'fill', gap: 16 }, [
              box('headline', 'Headline', { h: 96, justify: 'start' }),
              box('subhead', 'Supporting text', { h: 64, justify: 'start' }),
              f('hero-actions', { w: 'hug', gap: 12 }, [
                box('primary', 'Primary', { w: 'hug', h: 'hug' }),
                box('secondary', 'Secondary', { w: 'hug', h: 'hug' }),
              ]),
            ]),
            box('hero-image', 'Image', { w: 'fill', h: 'fill' }),
          ]),
      },
      {
        id: 'features',
        name: 'Feature grid',
        description: 'Section title above three feature columns.',
        build: () =>
          f('features', { dir: 'column', pad: 32, gap: 24 }, [
            box('features-title', 'Features', { h: 56 }),
            f('feature-row', { h: 200, gap: 24 },
              repeat(3, (i) =>
                f(`feature-${i}`, { dir: 'column', w: 'fill', h: 'fill', pad: 16, gap: 8 }, [
                  box(`feature-${i}-icon`, 'Icon', { w: 48, h: 48 }),
                  box(`feature-${i}-title`, `Feature ${i}`, { h: 32, justify: 'start' }),
                  box(`feature-${i}-text`, 'Description', { h: 'fill', justify: 'start' }),
                ]),
              ),
            ),
          ]),
      },
      {
        id: 'pricing',
        name: 'Pricing tiers',
        description: 'Three plan cards side by side.',
        build: () =>
          f('pricing', { h: 420, gap: 24, pad: 24 },
            ['Basic', 'Pro', 'Team'].map((t) =>
              f(`plan-${t.toLowerCase()}`, { dir: 'column', w: 'fill', h: 'fill', pad: 16, gap: 12 }, [
                box(`${t.toLowerCase()}-name`, t, { h: 32 }),
                box(`${t.toLowerCase()}-price`, '$—/mo', { h: 56 }),
                box(`${t.toLowerCase()}-features`, 'Features', { h: 'fill' }),
                box(`${t.toLowerCase()}-cta`, 'Choose', { h: 44 }),
              ]),
            ),
          ),
      },
    ],
  },
  {
    name: 'Content',
    templates: [
      {
        id: 'card-grid',
        name: 'Card grid',
        description: 'Two rows of three cards.',
        build: () =>
          f('card-grid', { dir: 'column', h: 'fill', gap: 16 }, [
            f('grid-row-1', { h: 'fill', gap: 16 }, repeat(3, card)),
            f('grid-row-2', { h: 'fill', gap: 16 }, [4, 5, 6].map(card)),
          ]),
      },
      {
        id: 'list',
        name: 'List',
        description: 'Rows with an avatar, text, and a trailing action.',
        build: () =>
          f('list', { dir: 'column', gap: 8 },
            repeat(5, (i) =>
              f(`item-${i}`, { h: 64, pad: 8, gap: 12, align: 'center' }, [
                box(`item-${i}-avatar`, 'Img', { w: 48, h: 48 }),
                f(`item-${i}-text`, { dir: 'column', w: 'fill', gap: 4 }, [
                  box(`item-${i}-title`, `Item ${i}`, { h: 20, justify: 'start', pad: 0 }),
                  box(`item-${i}-sub`, 'Subtitle', { h: 16, justify: 'start', pad: 0 }),
                ]),
                box(`item-${i}-action`, 'Action', { w: 88, h: 36 }),
              ]),
            ),
          ),
      },
      {
        id: 'master-detail',
        name: 'List + detail',
        description: 'A list on the left, the selected item on the right (inbox).',
        build: () =>
          f('master-detail', { w: 'fill', h: 'fill', gap: 16 }, [
            f('list', { dir: 'column', w: 320, h: 'fill', gap: 8 },
              repeat(6, (i) => box(`item-${i}`, `Item ${i}`, { h: 64, justify: 'start' })),
            ),
            f('detail', { dir: 'column', w: 'fill', h: 'fill', pad: 16, gap: 12 }, [
              box('detail-title', 'Title', { h: 48, justify: 'start' }),
              box('detail-body', 'Detail', { h: 'fill' }),
            ]),
          ]),
      },
      {
        id: 'article',
        name: 'Article',
        description: 'Title, meta, cover image, and body text.',
        build: () =>
          f('article', { dir: 'column', gap: 16 }, [
            box('article-title', 'Article title', { h: 64, justify: 'start' }),
            box('article-meta', 'Author · Date', { h: 24, justify: 'start' }),
            box('article-cover', 'Cover image', { h: 320 }),
            box('article-body', 'Body text', { h: 400, justify: 'start', align: 'start' }),
          ]),
      },
    ],
  },
  {
    name: 'Data',
    templates: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Stat cards, a chart beside a side panel, and a table.',
        build: () =>
          f('dashboard', { dir: 'column', h: 'fill', gap: 16 }, [
            statCards(),
            f('charts', { h: 'fill', gap: 16 }, [
              box('chart', 'Chart', { w: 'fill', h: 'fill' }),
              box('activity', 'Activity', { w: 320, h: 'fill' }),
            ]),
            table(4),
          ]),
      },
      {
        id: 'stats',
        name: 'Stat cards',
        description: 'A row of four KPI cards.',
        build: statCards,
      },
      {
        id: 'table',
        name: 'Table',
        description: 'Header row with five data rows.',
        build: () => table(5),
      },
      {
        id: 'table-toolbar',
        name: 'Table + toolbar',
        description: 'Search and filter controls above a table, pagination below.',
        build: () =>
          f('table-view', { dir: 'column', gap: 12 }, [
            f('toolbar', { h: 44, gap: 8, align: 'center', justify: 'between' }, [
              box('search', 'Search', { w: 280, h: 'fill' }),
              f('filters', { w: 'hug', h: 'fill', gap: 8 }, [
                box('filter', 'Filter', { w: 88, h: 'fill' }),
                box('new', 'New', { w: 88, h: 'fill' }),
              ]),
            ]),
            table(5),
            f('pagination', { h: 40, gap: 8, justify: 'end' }, [
              box('prev', 'Prev', { w: 72, h: 'fill' }),
              box('next', 'Next', { w: 72, h: 'fill' }),
            ]),
          ]),
      },
    ],
  },
  {
    name: 'Forms',
    templates: [
      {
        id: 'login',
        name: 'Sign-in form',
        description: 'Centered card with email, password, and a button.',
        build: () =>
          f('login-page', { dir: 'column', w: 'fill', h: 'fill', align: 'center', justify: 'center' }, [
            f('login-card', { dir: 'column', w: 400, pad: 24, gap: 16 }, [
              box('login-title', 'Sign in', { h: 40 }),
              field('email', 'Email'),
              field('password', 'Password'),
              box('submit', 'Sign in', { h: 44 }),
              box('forgot', 'Forgot password?', { h: 24 }),
            ]),
          ]),
      },
      {
        id: 'settings',
        name: 'Settings form',
        description: 'Label / field rows with save and cancel at the bottom.',
        build: () =>
          f('settings', { dir: 'column', pad: 24, gap: 16 }, [
            box('settings-title', 'Settings', { h: 40, justify: 'start' }),
            ...['Name', 'Email', 'Role', 'Timezone'].map((t) =>
              f(`row-${t.toLowerCase()}`, { h: 44, gap: 16, align: 'center' }, [
                box(`${t.toLowerCase()}-label`, t, { w: 160, h: 'fill', justify: 'start' }),
                box(`${t.toLowerCase()}-input`, '', { w: 'fill', h: 'fill' }),
              ]),
            ),
            f('form-actions', { h: 44, gap: 8, justify: 'end' }, [
              box('cancel', 'Cancel', { w: 100, h: 'fill' }),
              box('save', 'Save', { w: 100, h: 'fill' }),
            ]),
          ]),
      },
      {
        id: 'search-bar',
        name: 'Search bar',
        description: 'Input with a button beside it.',
        build: () =>
          f('search-bar', { h: 48, gap: 8 }, [
            box('search-input', 'Search…', { w: 'fill', h: 'fill', justify: 'start' }),
            box('search-button', 'Search', { w: 100, h: 'fill' }),
          ]),
      },
    ],
  },
  {
    name: 'Overlays',
    templates: [
      {
        id: 'modal',
        name: 'Modal dialog',
        description: 'Header, body, and footer actions in a centered dialog.',
        build: () =>
          f('modal-backdrop', { dir: 'column', w: 'fill', h: 'fill', align: 'center', justify: 'center' }, [
            f('modal', { dir: 'column', w: 480, gap: 0 }, [
              f('modal-header', { h: 56, pad: 12, align: 'center', justify: 'between' }, [
                box('modal-title', 'Dialog title', { w: 240, h: 'fill', justify: 'start' }),
                box('modal-close', '×', { w: 32, h: 32 }),
              ]),
              box('modal-body', 'Body', { h: 200 }),
              f('modal-footer', { h: 64, pad: 12, gap: 8, justify: 'end' }, [
                box('modal-cancel', 'Cancel', { w: 100, h: 'fill' }),
                box('modal-ok', 'Confirm', { w: 100, h: 'fill' }),
              ]),
            ]),
          ]),
      },
      {
        id: 'drawer',
        name: 'Side drawer',
        description: 'A panel sliding in from the right edge.',
        build: () =>
          f('drawer-layer', { w: 'fill', h: 'fill', justify: 'end' }, [
            f('drawer', { dir: 'column', w: 400, h: 'fill', pad: 16, gap: 12 }, [
              box('drawer-title', 'Drawer', { h: 48, justify: 'start' }),
              box('drawer-body', 'Content', { h: 'fill' }),
              box('drawer-action', 'Done', { h: 44 }),
            ]),
          ]),
      },
    ],
  },
];
