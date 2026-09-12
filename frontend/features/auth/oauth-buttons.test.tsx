import React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { OAuthButtons } from "./components/oauth-buttons";

const noop = () => undefined;

describe("OAuthButtons", () => {
  describe("Microsoft button", () => {
    it("never renders a Microsoft button when hasGoogleProvider is true", () => {
      render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      expect(screen.queryByRole("button", { name: /microsoft/i })).not.toBeInTheDocument();
    });

    it("never renders a Microsoft button when hasGoogleProvider is false", () => {
      render(
        <OAuthButtons
          hasGoogleProvider={false}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      expect(screen.queryByRole("button", { name: /microsoft/i })).not.toBeInTheDocument();
    });

    it("contains no text mentioning Microsoft", () => {
      const { container } = render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      expect(container.textContent?.toLowerCase()).not.toContain("microsoft");
    });
  });

  describe("Google button", () => {
    it("renders the Google button when hasGoogleProvider is true", () => {
      render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    });

    it("does not render the Google button when hasGoogleProvider is false", () => {
      render(
        <OAuthButtons
          hasGoogleProvider={false}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
    });

    it("disables the Google button when isSignInPending is true", () => {
      render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={true}
          onGoogleSignIn={noop}
        />,
      );
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("passes axe audit with Google provider", async () => {
      const { container } = render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe audit without any provider", async () => {
      const { container } = render(
        <OAuthButtons
          hasGoogleProvider={false}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={noop}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders within a 320px container without error", () => {
      const { container } = render(
        <div style={{ width: "320px" }}>
          <OAuthButtons
            hasGoogleProvider={true}
            isGooglePending={false}
            isSignInPending={false}
            onGoogleSignIn={noop}
          />
        </div>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
