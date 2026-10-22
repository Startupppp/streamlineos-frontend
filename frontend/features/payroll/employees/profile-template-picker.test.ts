import { componentIdsForTemplate } from "./profile-template-picker";

it("ticks only the org's active components that the template names", () => {
  const template = { defaultComponents: [{ code: "BASIC", name: "Basic" }, { code: "HRA", name: "HRA" }, { code: "LTA", name: "LTA" }] };
  const components = [
    { id: 1, code: "BASIC" },
    { id: 2, code: "HRA" },
    { id: 3, code: "QA_TEST" },
  ];
  expect(componentIdsForTemplate(template, components)).toEqual([1, 2]);
});
