import { RuleTester } from "eslint";
import rule from "./no-unlabelled-icon-button.mjs";

const tester = new RuleTester({
  languageOptions: {
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
  ],
});

console.log("no-unlabelled-icon-button: all tests passed");
