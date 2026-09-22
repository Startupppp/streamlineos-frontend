/** @jest-environment node */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SanitizedHtml } from "./sanitized-html";

describe("SanitizedHtml on the server", () => {
  it("renders an empty container so the sanitiser and its DOM dependency never run during SSR", () => {
    const markup = renderToStaticMarkup(<SanitizedHtml html="<p>server</p>" className="prose" />);
    expect(markup).toBe('<div class="prose"></div>');
  });
});
