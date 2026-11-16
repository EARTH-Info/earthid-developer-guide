import { getAuthenticatedProfile, handleCallback, localLogout, login } from "./auth";
import "./style.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing app root");

function paragraph(text: string, className = ""): HTMLParagraphElement {
  const p = document.createElement("p");
  p.textContent = text;
  if (className) p.className = className;
  return p;
}

function navigate(path: string): void {
  history.pushState(null, "", path);
  render();
}

function action(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function render(errorMessage = ""): void {
  const element = root!;
  element.replaceChildren();

  const title = document.createElement("h1");
  title.textContent = "EarthID Enterprise — Browser-only SPA";
  element.append(title, paragraph("OIDC public client: Client ID + PKCE, no Client Secret."));

  const nav = document.createElement("nav");
  nav.append(
    action("Home", () => navigate("/")),
    action("Protected view", () => navigate("/protected"))
  );
  element.append(nav);

  if (errorMessage) element.append(paragraph(errorMessage, "error"));
  const profile = getAuthenticatedProfile();

  if (profile) {
    element.append(paragraph("Signed in to this browser tab."));
    if (location.pathname === "/protected") {
      const list = document.createElement("dl");
      for (const [key, value] of Object.entries(profile)) {
        const term = document.createElement("dt");
        term.textContent = key;
        const description = document.createElement("dd");
        description.textContent = value ?? "(not granted)";
        list.append(term, description);
      }
      element.append(list);
    }
    element.append(action("Sign out of this app", () => {
      void localLogout().then(() => navigate("/")).catch(() => render("Local sign-out failed."));
    }));
  } else {
    element.append(paragraph(
      location.pathname === "/protected"
        ? "This view requires authentication. Sign in to continue."
        : "Not signed in."
    ));
    element.append(action("Sign in with EarthID", () => {
      void login().catch(() => render("Unable to start sign-in. Check the approved Issuer URL and public Client ID."));
    }));
  }

  const note = document.createElement("small");
  note.textContent = "User tokens are held only in memory. Refresh clears the app session; EarthID SSO may remain active.";
  element.append(note);
}

window.addEventListener("popstate", () => render());

async function bootstrap(): Promise<void> {
  if (window.location.pathname === "/callback") {
    root!.replaceChildren(paragraph("Completing EarthID authentication..."));
    try {
      const target = await handleCallback();
      history.replaceState(null, "", target);
      render();
    } catch {
      // Don't leak IdP response details or tokens into the page.
      history.replaceState(null, "", "/");
      render("Authentication could not be completed. Check your client registration and try again.");
    }
  } else {
    render();
  }
}

void bootstrap();
