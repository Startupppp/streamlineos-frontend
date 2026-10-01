import { RuleTester } from "eslint";
import rule from "./no-unlabelled-icon-button.mjs";

const tester = new RuleTester({
  languageOptions: {
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run("no-unlabelled-icon-button", rule, {
  valid: [
    {
      name: "lowercase button with aria-label is accepted",
      code: '<button aria-label="Delete"><TrashIcon /></button>',
    },
    {
      name: "lowercase button with aria-labelledby is accepted",
      code: '<button aria-labelledby="label-id"><TrashIcon /></button>',
    },
    {
      name: "lowercase button with title is accepted",
      code: '<button title="Delete"><TrashIcon /></button>',
    },
    {
      name: "Button with aria-label is accepted",
      code: '<Button aria-label="Delete"><TrashIcon /></Button>',
    },
    {
      name: "Button with aria-labelledby is accepted",
      code: '<Button aria-labelledby="label-id"><TrashIcon /></Button>',
    },
    {
      name: "Button with title is accepted",
      code: '<Button title="Delete"><TrashIcon /></Button>',
    },
    {
      name: "Button size=icon with aria-label is accepted",
      code: '<Button size="icon" aria-label="More actions"><EllipsisIcon /></Button>',
    },
    {
      name: "Button with text child is not icon-only",
      code: "<Button>Delete <TrashIcon /></Button>",
    },
    {
      name: "Button with only text is not icon-only",
      code: "<Button>Save</Button>",
    },
    {
      name: "Button with expression container child is skipped",
      code: "<Button>{label}</Button>",
    },
    {
      name: "Button with expression container and icon is skipped",
      code: "<Button><TrashIcon />{label}</Button>",
    },
    {
      name: "Button with props spread is skipped",
      code: "<Button {...props}><TrashIcon /></Button>",
    },
    {
      name: "Button with rest spread is skipped",
      code: "<Button {...rest}><TrashIcon /></Button>",
    },
    {
      name: "Button with buttonProps spread is skipped",
      code: "<Button {...buttonProps}><TrashIcon /></Button>",
    },
    {
      name: "Button with non-Icon PascalCase child is skipped",
      code: "<Button><Avatar /></Button>",
    },
    {
      name: "Button with non-Icon PascalCase child alongside icon is skipped",
      code: "<Button><TruncatedText /><TrashIcon /></Button>",
    },
    {
      name: "Button with lowercase HTML child is skipped",
      code: "<Button><span>Delete</span></Button>",
    },
    {
      name: "Button with no children is ignored",
      code: "<Button />",
    },
    {
      name: "hidden span is accepted when the button carries aria-label",
      code: 'import { Plus } from "lucide-react";\n<Button aria-label="Add candidate"><Plus /><span className="hidden sm:inline">Add candidate</span></Button>',
    },
    {
      name: "asChild Button whose Link carries aria-label is accepted",
      code: 'import { Settings } from "lucide-react";\n<Button asChild><Link href="/x" aria-label="Org settings"><Settings /><span className="hidden sm:inline">Org settings</span></Link></Button>',
    },
    {
      name: "asChild Button with more than one child cannot be resolved and is skipped",
      code: 'import { Settings } from "lucide-react";\n<Button asChild><Link href="/x"><Settings /></Link><span className="hidden sm:inline">Org settings</span></Button>',
    },
    {
      name: "hidden span paired with a visible short form is accepted",
      code: 'import { Plus } from "lucide-react";\n<Button><Plus /><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add employee</span></Button>',
    },
    {
      name: "hidden span beside a non-icon component is skipped (escape 4 intact)",
      code: '<Button><Avatar /><span className="hidden sm:inline">Profile</span></Button>',
    },
    {
      name: "hidden span beside an expression child is skipped (escape 1 intact)",
      code: 'import { Plus } from "lucide-react";\n<Button><Plus />{count}<span className="hidden sm:inline">Add</span></Button>',
    },
    {
      name: "hidden span with a props spread is skipped (escape 2 intact)",
      code: 'import { Plus } from "lucide-react";\n<Button {...props}><Plus /><span className="hidden sm:inline">Add</span></Button>',
    },
    {
      name: "span hidden only above the base breakpoint is a real label",
      code: 'import { Plus } from "lucide-react";\n<Button><Plus /><span className="sm:hidden">Add</span></Button>',
    },
    {
      name: "non-literal className cannot be resolved and is skipped",
      code: 'import { Plus } from "lucide-react";\n<Button><Plus /><span className={cn("hidden sm:inline")}>Add</span></Button>',
    },
    {
      name: "a component that merely ends in Icon is not a lucide import but still an icon",
      code: '<Button title="Add"><PlusIcon /><span className="hidden sm:inline">Add</span></Button>',
    },
    {
      name: "AnimatedIconButton with aria-label is accepted",
      code: '<AnimatedIconButton icon={PlusIcon} aria-label="Schedule"><span className="hidden sm:inline">Schedule</span></AnimatedIconButton>',
    },
    {
      name: "OtherButton (not the shadcn Button) is not checked",
      code: "<OtherButton><TrashIcon /></OtherButton>",
    },
    {
      name: "lowercase button with props spread is skipped",
      code: "<button {...props}><TrashIcon /></button>",
    },
    {
      name: "lowercase button with expression child is skipped",
      code: "<button>{icon}</button>",
    },
    {
      name: "lowercase button with html child is skipped",
      code: "<button><svg /><span>label</span></button>",
    },
  ],

  invalid: [
    {
      name: "lowercase button with only icon child and no accessible name is flagged",
      code: "<button><TrashIcon /></button>",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "lowercase button with multiple icon children and no accessible name is flagged",
      code: "<button><PlusIcon /><ChevronDownIcon /></button>",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "PascalCase Button with only icon child and no accessible name is flagged",
      code: "<Button><TrashIcon /></Button>",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "Button with size=icon and icon child and no accessible name is flagged",
      code: '<Button size="icon"><EllipsisIcon /></Button>',
      errors: [{ messageId: "missing" }],
    },
    {
      name: "Button with size=icon-sm and icon child and no accessible name is flagged",
      code: '<Button size="icon-sm"><PlusIcon /></Button>',
      errors: [{ messageId: "missing" }],
    },
    {
      name: "Button with multiple icon children and no accessible name is flagged",
      code: "<Button><PlusIcon /><ChevronDownIcon /></Button>",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "Button with variant and size props but no accessible name is flagged",
      code: '<Button variant="ghost" size="icon"><EllipsisIcon /></Button>',
      errors: [{ messageId: "missing" }],
    },
    {
      name: "lowercase button with hoverHandlers spread (non-props spread) is still flagged",
      code: "<button {...hoverHandlers}><TrashIcon /></button>",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "Button with hoverHandlers spread (non-props spread) is still flagged",
      code: "<Button {...hoverHandlers}><TrashIcon /></Button>",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "lucide icon plus a span hidden at the base breakpoint is flagged",
      code: 'import { Plus } from "lucide-react";\n<Button><Plus /><span className="hidden sm:inline">Add candidate</span></Button>',
      errors: [{ messageId: "hiddenLabel" }],
    },
    {
      name: "Icon-suffixed child plus a hidden span is flagged",
      code: '<Button><TrashIcon /><span className="hidden sm:inline">Delete</span></Button>',
      errors: [{ messageId: "hiddenLabel" }],
    },
    {
      name: "hidden-at-base span is flagged at any breakpoint prefix",
      code: 'import { Settings } from "lucide-react";\n<Button><Settings /><span className="hidden xl:inline">Settings</span></Button>',
      errors: [{ messageId: "hiddenLabel" }],
    },
    {
      name: "hidden inline-flex span is flagged",
      code: 'import { Filter } from "lucide-react";\n<button><Filter /><span className="hidden sm:inline-flex">Filters</span></button>',
      errors: [{ messageId: "hiddenLabel" }],
    },
    {
      name: "AnimatedIconButton with only a hidden-span child is flagged",
      code: '<AnimatedIconButton icon={PlusIcon}><span className="hidden sm:inline">Schedule</span></AnimatedIconButton>',
      errors: [{ messageId: "hiddenLabel" }],
    },
    {
      name: "asChild Button is read through to its Link child",
      code: 'import { Settings } from "lucide-react";\n<Button asChild><Link href="/x"><Settings /><span className="hidden sm:inline">Org settings</span></Link></Button>',
      errors: [{ messageId: "hiddenLabel" }],
    },
    {
      name: "a button whose only child is a hidden span is flagged",
      code: '<Button><span className="hidden sm:inline">Export</span></Button>',
      errors: [{ messageId: "hiddenLabel" }],
    },
  ],
});

console.log("no-unlabelled-icon-button: all tests passed");
