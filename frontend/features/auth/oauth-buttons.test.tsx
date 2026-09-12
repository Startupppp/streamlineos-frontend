import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

    // jsdom reports zero for every layout measurement, so an overflow is not
    // observable here. `scripts/verify-identity-journey.mjs` is what checks 320px
    // for real; this only pins that the buttons mount in a narrow container.
    it("mounts inside a 320px container (overflow itself is proved in the browser harness)", () => {
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

  describe("the Google control is actually wired", () => {
    it("invokes the handler it was given, once per click", () => {
      const onGoogleSignIn = jest.fn();
      render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={false}
          onGoogleSignIn={onGoogleSignIn}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

      expect(onGoogleSignIn).toHaveBeenCalledTimes(1);
    });

    it("(negative) a disabled control does not reach the handler", () => {
      const onGoogleSignIn = jest.fn();
      render(
        <OAuthButtons
          hasGoogleProvider={true}
          isGooglePending={false}
          isSignInPending={true}
          onGoogleSignIn={onGoogleSignIn}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

      expect(onGoogleSignIn).not.toHaveBeenCalled();
    });
  });
});
